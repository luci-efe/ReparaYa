# Proposal: Contractor Availability Management

## Overview

Implement a comprehensive availability management system for contractors to configure their working hours, manage exceptions (holidays/closures), and create manual blockouts. This system will serve as the foundation for the booking flow, enabling accurate slot generation and preventing double-booking.

**Status:** ✅ Approved
**Created:** 2025-11-20
**Spec:** `/openspec/specs/contractor-availability/spec.md`

---

## Motivation

Currently, the system has an `Availability` model that represents generated time slots, but there's no mechanism for contractors to define WHEN they're available. This creates several problems:

1. **No self-service scheduling:** Admins must manually create availability slots
2. **No flexibility:** Cannot handle exceptions (holidays, personal time off)
3. **Poor UX:** Contractors cannot control their own workload
4. **Booking conflicts:** Risk of double-booking without proper availability rules
5. **Scalability:** Manual slot creation doesn't scale beyond MVP

This proposal addresses these issues by implementing a complete availability management system.

---

## Goals

### Primary Goals
- ✅ Enable contractors to configure weekly recurring schedules
- ✅ Support exceptions for holidays and special closures
- ✅ Allow manual blockouts for unforeseen circumstances
- ✅ Generate available slots automatically based on rules + exceptions + blockouts + bookings
- ✅ Handle timezone conversions correctly (contractor TZ → UTC storage)
- ✅ Provide accessible, mobile-first UI for availability management
- ✅ Ensure permission controls (owner-only write access)

### Secondary Goals
- Validate compatibility with service durations
- Cache generated slots for performance
- Prevent race conditions on concurrent bookings
- Provide visual calendar interface

### Non-Goals (Future)
- External calendar integration (Google Calendar, Outlook)
- Team/employee scheduling
- Automatic availability optimization based on ML
- Travel time and buffer time calculation

---

## Proposed Changes

### Database Schema

#### New Tables

**1. ContractorWeeklySchedule**
```prisma
model ContractorWeeklySchedule {
  id                     String            @id @default(uuid())
  contractorProfileId    String            @unique
  contractorProfile      ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)
  timezone               String            @db.VarChar(50) // IANA timezone
  slotGranularityMinutes Int               @default(30)    // 15, 30, 60
  weeklyRules            Json              // Array of {dayOfWeek, intervals[]}
  createdAt              DateTime          @default(now())
  updatedAt              DateTime          @updatedAt

  @@index([contractorProfileId])
}
```

**2. ContractorAvailabilityException**
```prisma
model ContractorAvailabilityException {
  id                  String            @id @default(uuid())
  contractorProfileId String
  contractorProfile   ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)
  type                ExceptionType     // ONE_OFF | RECURRING
  date                DateTime?         @db.Date
  recurringMonth      Int?              // 1-12
  recurringDay        Int?              // 1-31
  isFullDayClosure    Boolean           @default(true)
  customIntervals     Json?             // Array of {startTime, endTime}
  reason              String?           @db.VarChar(200)
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@index([contractorProfileId, type])
  @@index([contractorProfileId, date])
  @@index([contractorProfileId, recurringMonth, recurringDay])
}

enum ExceptionType {
  ONE_OFF
  RECURRING
}
```

**3. ContractorAvailabilityBlockout**
```prisma
model ContractorAvailabilityBlockout {
  id                  String            @id @default(uuid())
  contractorProfileId String
  contractorProfile   ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)
  date                DateTime          @db.Date
  startTime           String            @db.VarChar(5) // HH:mm
  endTime             String            @db.VarChar(5) // HH:mm
  reason              String?           @db.VarChar(200)
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@index([contractorProfileId, date])
  @@index([contractorProfileId, date, startTime, endTime])
}
```

#### Model Updates

**ContractorProfile** - Add relations:
```prisma
weeklySchedule         ContractorWeeklySchedule?
availabilityExceptions ContractorAvailabilityException[]
availabilityBlockouts  ContractorAvailabilityBlockout[]
```

---

### API Endpoints

#### Schedule Management
- `POST   /api/contractors/me/availability/schedule` - Create weekly schedule
- `PATCH  /api/contractors/me/availability/schedule` - Update weekly schedule
- `GET    /api/contractors/me/availability/schedule` - Get weekly schedule

#### Exception Management
- `POST   /api/contractors/me/availability/exceptions` - Create exception
- `GET    /api/contractors/me/availability/exceptions` - List exceptions
- `DELETE /api/contractors/me/availability/exceptions/[id]` - Delete exception

#### Blockout Management
- `POST   /api/contractors/me/availability/blockouts` - Create blockout
- `GET    /api/contractors/me/availability/blockouts` - List blockouts
- `DELETE /api/contractors/me/availability/blockouts/[id]` - Delete blockout

#### Slot Generation
- `GET    /api/contractors/me/availability/slots` - Generate available slots

All endpoints support owner (contractor) + admin authorization.

---

### Module Structure

```
src/modules/contractors/availability/
├── __tests__/
│   ├── scheduleService.test.ts
│   ├── exceptionService.test.ts
│   ├── blockoutService.test.ts
│   ├── slotGenerationService.test.ts
│   ├── scheduleRepository.test.ts
│   └── validators.test.ts
├── services/
│   ├── scheduleService.ts           // CRUD for weekly schedule
│   ├── exceptionService.ts          // CRUD for exceptions
│   ├── blockoutService.ts           // CRUD for blockouts
│   └── slotGenerationService.ts     // Slot generation algorithm
├── repositories/
│   ├── scheduleRepository.ts
│   ├── exceptionRepository.ts
│   └── blockoutRepository.ts
├── types/
│   ├── index.ts                     // DTOs and types
│   ├── schedule.ts
│   ├── exception.ts
│   └── blockout.ts
├── validators/
│   ├── index.ts
│   ├── schedule.ts                  // Zod schemas for schedule
│   ├── exception.ts
│   └── blockout.ts
├── utils/
│   ├── timezoneConversion.ts        // TZ conversion utilities
│   ├── overlapDetection.ts          // Detect interval overlaps
│   └── slotGenerator.ts             // Core slot generation logic
└── index.ts                         // Public exports
```

---

### UI Components

```
src/components/contractors/availability/
├── AvailabilityManagerPage.tsx          // Main container page
├── WeeklyScheduleEditor.tsx             // Weekly schedule configurator
├── ExceptionManager.tsx                 // List/manage exceptions
├── ExceptionFormModal.tsx               // Modal for creating exception
├── BlockoutManager.tsx                  // List/manage blockouts
├── BlockoutFormModal.tsx                // Modal for creating blockout
├── AvailabilityCalendar.tsx             // Calendar visualization
├── TimeRangeInput.tsx                   // Reusable time range component
└── DayScheduleConfigurator.tsx          // Single day schedule component
```

**Page Routes:**
- `/contractors/availability` - Main availability management page

---

## Testing Plan

### Test Cases to Add to STP

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-RF-CTR-AVAIL-001 | Crear horario semanal con intervalos válidos | Integración | Alta | RF-CTR-AVAIL-001 |
| TC-RF-CTR-AVAIL-002 | Rechazar intervalos superpuestos en el mismo día | Unitaria | Alta | RF-CTR-AVAIL-001 |
| TC-RF-CTR-AVAIL-003 | Rechazar formatos de tiempo y rangos inválidos | Unitaria | Alta | RF-CTR-AVAIL-001 |
| TC-RF-CTR-AVAIL-004 | Crear excepción de cierre de día completo | Integración | Alta | RF-CTR-AVAIL-002 |
| TC-RF-CTR-AVAIL-005 | Crear excepción de día festivo recurrente | Integración | Alta | RF-CTR-AVAIL-002 |
| TC-RF-CTR-AVAIL-006 | Crear excepción de cierre parcial | Integración | Media | RF-CTR-AVAIL-002 |
| TC-RF-CTR-AVAIL-007 | Crear bloqueo manual exitosamente | Integración | Alta | RF-CTR-AVAIL-003 |
| TC-RF-CTR-AVAIL-008 | Rechazar bloqueo que superpone reserva confirmada | Integración | Alta | RF-CTR-AVAIL-003 |
| TC-RF-CTR-AVAIL-009 | Rechazar bloqueo en el pasado | Unitaria | Alta | RF-CTR-AVAIL-003 |
| TC-RF-CTR-AVAIL-010 | Generar slots desde horario semanal | Unitaria | Alta | RF-CTR-AVAIL-004 |
| TC-RF-CTR-AVAIL-011 | Generar slots excluyendo excepciones | Integración | Alta | RF-CTR-AVAIL-004 |
| TC-RF-CTR-AVAIL-012 | Generar slots excluyendo bloqueos | Integración | Alta | RF-CTR-AVAIL-004 |
| TC-RF-CTR-AVAIL-013 | Generar slots excluyendo reservas existentes | Integración | Alta | RF-CTR-AVAIL-004 |
| TC-RF-CTR-AVAIL-014 | Convertir zona horaria local a UTC correctamente | Unitaria | Alta | RF-CTR-AVAIL-005 |
| TC-RF-CTR-AVAIL-015 | Manejar transiciones de horario de verano correctamente | Unitaria | Media | RF-CTR-AVAIL-005 |
| TC-RF-CTR-AVAIL-016 | Verificar propiedad - dueño puede gestionar disponibilidad | Integración | Alta | RF-CTR-AVAIL-006 |
| TC-RF-CTR-AVAIL-017 | Bloquear acceso entre contratistas | Integración | Alta | RF-CTR-AVAIL-006 |
| TC-RF-CTR-AVAIL-018 | Admin puede leer disponibilidad de cualquier contratista | Integración | Media | RF-CTR-AVAIL-006 |
| TC-RF-CTR-AVAIL-019 | Validar compatibilidad de slots con duraciones de servicios | Unitaria | Media | RF-CTR-AVAIL-007 |
| TC-RF-CTR-AVAIL-020 | Advertir al contratista sobre duraciones incompatibles | Integración | Baja | RF-CTR-AVAIL-007 |
| TC-RNF-CTR-AVAIL-001 | Performance - generación de slots P95 <= 800ms | Performance | Alta | RNF-CTR-AVAIL-001 |
| TC-RNF-CTR-AVAIL-002 | Prevenir condición de carrera en reservas concurrentes | Integración | Alta | RNF-CTR-AVAIL-002 |
| TC-RNF-CTR-AVAIL-003 | A11y - navegación por teclado en UI de calendario | E2E | Alta | RNF-CTR-AVAIL-003 |
| TC-RNF-CTR-AVAIL-004 | A11y - etiquetas ARIA y soporte de lector de pantalla | E2E | Alta | RNF-CTR-AVAIL-003 |
| TC-RNF-CTR-AVAIL-005 | Responsive móvil - vista de calendario en viewport 375px | E2E | Media | RNF-CTR-AVAIL-004 |

### Criterios de Aceptación

**Código:**
- ✅ Migración aplicada exitosamente (3 nuevas tablas + relaciones)
- ✅ Servicios de dominio implementados con algoritmo de generación de slots
- ✅ API routes con verificación de autorización
- ✅ Validadores Zod cubren todos los casos de borde
- ✅ Librería de conversión de zona horaria integrada (date-fns-tz)
- ✅ DTOs separados para owner/admin/public

**Testing:**
- ✅ Cobertura ≥ 70% en `src/modules/contractors/availability/`
- ✅ Todos los 25 casos de prueba pasan (TC-RF-CTR-AVAIL-001 a TC-RNF-CTR-AVAIL-005)
- ✅ Tests de integración validan autorización y persistencia
- ✅ Tests E2E de flujo de gestión de disponibilidad completo
- ✅ Performance: P95 <= 800ms para generación de slots (k6)
- ✅ A11y: escaneo con axe-core pasa con 0 violaciones

**UI/UX:**
- ✅ Componente de calendario mobile-first implementado
- ✅ Estados de loading/error/vacío manejados
- ✅ Errores de validación mostrados accesiblemente
- ✅ Diseño responsive probado en móvil/tablet/escritorio
- ✅ Navegación por teclado funciona correctamente
- ✅ Indicadores visuales claros (disponible/bloqueado/excepción)

**Documentación:**
- ✅ Spec completo (`/openspec/specs/contractor-availability/spec.md`)
- ✅ STP actualizado con 25 casos de prueba
- ✅ `openspec/project.md` referencia este módulo
- ✅ API docs generados (Swagger/OpenAPI)

---

## Implementation Strategy

### Phase 1: Database & Core Services (Week 1)
1. Create Prisma migration for new tables
2. Implement repositories (schedule, exception, blockout)
3. Implement service layer (CRUD operations)
4. Implement Zod validators
5. Unit tests for repositories and services

### Phase 2: Slot Generation Engine (Week 1-2)
1. Implement timezone conversion utilities
2. Implement overlap detection utilities
3. Implement core slot generation algorithm
4. Unit tests for slot generation
5. Integration tests with bookings

### Phase 3: API Endpoints (Week 2)
1. Implement schedule management endpoints
2. Implement exception management endpoints
3. Implement blockout management endpoints
4. Implement slot generation endpoint
5. Integration tests for all endpoints
6. Authorization tests

### Phase 4: UI Components (Week 2-3)
1. Create base components (TimeRangeInput, DayScheduleConfigurator)
2. Create WeeklyScheduleEditor
3. Create ExceptionManager + ExceptionFormModal
4. Create BlockoutManager + BlockoutFormModal
5. Create AvailabilityCalendar visualization
6. Create AvailabilityManagerPage container

### Phase 5: Testing & Refinement (Week 3)
1. E2E tests with Playwright
2. A11y testing with axe-core
3. Performance testing with k6
4. Responsive design testing
5. Bug fixes and refinements

---

## Dependencies

### NPM Packages to Install
- `date-fns` - Date manipulation
- `date-fns-tz` - Timezone conversion
- None (all other dependencies already in project)

### External Services
- No new external services required
- Uses existing Prisma + PostgreSQL

### Environment Variables
- No new environment variables required

---

## Risks & Mitigation

### Risk 1: Timezone Complexity
**Risk:** Timezone conversions are error-prone, especially around DST transitions.
**Mitigation:**
- Use well-tested library (date-fns-tz)
- Comprehensive unit tests for TZ conversions
- Document TZ handling clearly in code
- Store all times in UTC in database

### Risk 2: Performance of Slot Generation
**Risk:** Generating slots for 8-12 weeks could be slow.
**Mitigation:**
- Implement caching (Redis or in-memory)
- Invalidate cache only on schedule/exception/blockout/booking changes
- Optimize database queries with indexes
- Consider background job for pre-generation
- Pagination/limits on date ranges

### Risk 3: Race Conditions on Booking Creation
**Risk:** Two clients book same slot simultaneously.
**Mitigation:**
- Use database transactions
- Atomic check-and-create pattern
- Optimistic locking with row versioning
- Return HTTP 409 Conflict on race condition

### Risk 4: UX Complexity
**Risk:** Calendar UI could be complex and overwhelming.
**Mitigation:**
- Mobile-first, progressive enhancement
- Start with simple week view, add features incrementally
- User testing with real contractors
- Clear visual indicators and helpful tooltips

---

## Success Metrics

### Technical Metrics
- ✅ Cobertura de código ≥ 70%
- ✅ P95 latencia de generación de slots <= 800ms
- ✅ 0 vulnerabilidades de seguridad detectadas
- ✅ 0 violaciones de A11y (axe-core)

### User Metrics (Post-Launch)
- 80% of contractors configure availability within first week
- Average time to configure schedule: < 5 minutes
- Error rate on slot generation: < 1%
- Mobile usage: ≥ 40% of traffic

### Business Metrics
- Reduction in manual slot creation: 100% (fully automated)
- Reduction in double-booking incidents: 95%
- Contractor satisfaction score: ≥ 4.5/5

---

## Rollout Plan

### Development
1. Feature branch: `feature/contractor-availability`
2. Incremental PRs as phases complete
3. CodeRabbit review on each PR
4. Merge to `dev` after tests pass

### Testing
1. Unit + integration tests in CI/CD
2. E2E tests on staging environment
3. Performance tests with k6
4. A11y audit with axe-core

### Deployment
1. Database migration on staging
2. Smoke tests on staging
3. Migration on production (off-peak hours)
4. Feature flag for gradual rollout (optional)
5. Monitor error rates and performance metrics

### Rollback Plan
- Revert migration if critical issues detected
- Database backup before migration
- API versioning to support old clients

---

## Future Considerations

### Iteration 1 (Post-MVP)
- External calendar sync (Google Calendar, Outlook)
- Batch operations (bulk create exceptions)
- Import holidays from public API
- Email reminders for upcoming blockouts

### Iteration 2
- Team/employee scheduling
- Buffer time between appointments
- Travel time calculation based on distance
- Availability quotas (max bookings per day)

### Iteration 3
- ML-based availability recommendations
- A/B testing of different availability configs
- Availability analytics dashboard
- Client-facing availability widget

---

## Conclusion

This proposal provides a comprehensive availability management system that addresses current limitations and sets the foundation for future enhancements. The implementation is scoped appropriately for a 3-week sprint with clear phases, testing criteria, and success metrics.

**Recommendation:** Approve and proceed with implementation.
