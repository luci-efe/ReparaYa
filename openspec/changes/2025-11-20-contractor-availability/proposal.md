# Proposal: Contractor Availability & Calendar Management

## Context

Los contratistas necesitan una forma estructurada de gestionar su disponibilidad de horarios para que los clientes puedan:
- Ver qué días/horas están disponibles
- Reservar servicios en slots realmente disponibles
- Evitar colisiones con reservas existentes

Actualmente, el modelo `Availability` existe en el schema pero es muy simple (solo slots individuales). No soporta:
- Reglas recurrentes ("disponible todos los lunes 9-17h")
- Excepciones a las reglas ("el 16 de septiembre NO estoy disponible")
- Bloqueos ad-hoc ("vacaciones del 20-25 dic")

Este proposal implementa un **sistema completo de gestión de disponibilidad** con:
- Reglas semanales recurrentes
- Excepciones puntuales
- Bloqueos manuales
- Motor de generación de slots que combina las 3 capas
- Normalización de zona horaria (TZ IANA → UTC)
- UI accesible y mobile-first

---

## Objectives

1. **Backend:**
   - Diseñar y migrar modelos de BD (WeeklyRule, Exception, Block)
   - Implementar CRUD de reglas/excepciones/bloqueos (services + repositories)
   - Crear motor de generación de slots (algoritmo de combinación)
   - Validar intervalos (no traslapes, compatibilidad con duración de servicios)
   - Normalizar zona horaria (IANA ↔ UTC)

2. **Frontend:**
   - UI para gestionar reglas semanales (vista semanal)
   - UI para excepciones (calendario mensual)
   - UI para bloqueos (lista + formulario)
   - Estados vacíos, loading, error
   - Accesibilidad completa (WCAG 2.1 AA)

3. **Testing:**
   - 25 casos de prueba (20 funcionales + 5 no funcionales)
   - Cobertura ≥ 70%
   - Performance P95 ≤ 800ms
   - 0 violaciones de accesibilidad

---

## Scope

**In Scope:**
- ✅ Modelos de BD: `ContractorWeeklyRule`, `ContractorAvailabilityException`, `ContractorAvailabilityBlock`
- ✅ CRUD completo de reglas/excepciones/bloqueos (backend + API)
- ✅ Motor de generación de slots (algoritmo de combinación)
- ✅ Normalización TZ (IANA → UTC al persistir, UTC → IANA al leer)
- ✅ Validación de intervalos (no traslapes, rangos válidos)
- ✅ Integración con módulo `booking` (validar vs reservas confirmadas)
- ✅ UI accesible (navegación por teclado, ARIA, focus rings)
- ✅ Responsive (mobile 375px, tablet 768px, desktop 1024px+)
- ✅ Tests completos (unitarios, integración, E2E, performance, a11y)

**Out of Scope:**
- ❌ Sincronización con calendarios externos (Google Calendar, Outlook)
- ❌ Disponibilidad específica por servicio (v1 es a nivel de contratista)
- ❌ Sugerencias inteligentes de horarios (ML)
- ❌ Notificaciones push (solo email si aplica)

---

## Testing Plan

### Casos de Prueba a Agregar al STP

**Nota:** Los 25 casos ya están documentados en `/docs/md/STP-ReparaYa.md` sección 4.1.12. Este plan los detalla y los organiza por implementación.

#### Funcionales (20 casos)

| ID | Descripción | Tipo | Prioridad | Requisito | Archivos de Test |
|----|-------------|------|-----------|-----------|------------------|
| TC-RF-CTR-AVAIL-001 | Crear horario semanal exitosamente | Integración | Alta | RF-CTR-AVAIL-001 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-002 | Rechazar intervalos superpuestos | Unitaria | Alta | RF-CTR-AVAIL-001 | `src/modules/contractors/availability/__tests__/validators.test.ts` |
| TC-RF-CTR-AVAIL-003 | Listar horarios semanales del contratista | Integración | Alta | RF-CTR-AVAIL-001 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-004 | Crear excepción para día específico | Integración | Alta | RF-CTR-AVAIL-002 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-005 | Excepción sobrescribe regla semanal | Unitaria | Alta | RF-CTR-AVAIL-002 | `src/modules/contractors/availability/__tests__/slotGenerator.test.ts` |
| TC-RF-CTR-AVAIL-006 | Listar excepciones por rango de fechas | Integración | Media | RF-CTR-AVAIL-002 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-007 | Crear bloqueo manual | Integración | Alta | RF-CTR-AVAIL-003 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-008 | Rechazar bloqueo que colisiona con reserva | Integración | Alta | RF-CTR-AVAIL-003 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-009 | Eliminar bloqueo | Integración | Media | RF-CTR-AVAIL-003 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-010 | Generar slots sin excepciones | Integración | Alta | RF-CTR-AVAIL-004 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-011 | Generar slots con excepciones aplicadas | Integración | Alta | RF-CTR-AVAIL-004 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-012 | Generar slots con bloqueos restados | Integración | Alta | RF-CTR-AVAIL-004 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-013 | Generar slots con reservas confirmadas restadas | Integración | Alta | RF-CTR-AVAIL-004 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-014 | Conversión correcta de timezone (crear regla) | Unitaria | Alta | RF-CTR-AVAIL-005 | `src/modules/contractors/availability/__tests__/timezoneUtils.test.ts` |
| TC-RF-CTR-AVAIL-015 | Conversión correcta con DST | Unitaria | Media | RF-CTR-AVAIL-005 | `src/modules/contractors/availability/__tests__/timezoneUtils.test.ts` |
| TC-RF-CTR-AVAIL-016 | Contratista solo modifica su disponibilidad | Integración | Alta | RF-CTR-AVAIL-006 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-017 | Cliente puede leer slots públicos | Integración | Alta | RF-CTR-AVAIL-006 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-018 | Admin puede leer reglas de contratistas | Integración | Media | RF-CTR-AVAIL-006 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-019 | Filtrar slots por duración de servicio | Integración | Media | RF-CTR-AVAIL-007 | `tests/integration/api/contractors/availability.test.ts` |
| TC-RF-CTR-AVAIL-020 | Warning si intervalo < 30 min | E2E | Baja | RF-CTR-AVAIL-007 | `tests/e2e/contractor-availability.spec.ts` |

#### No Funcionales (5 casos)

| ID | Descripción | Tipo | Prioridad | Requisito | Archivos de Test |
|----|-------------|------|-----------|-----------|------------------|
| TC-RNF-CTR-AVAIL-001 | Performance - Slots P95 ≤ 800ms | Performance/k6 | Alta | RNF-CTR-AVAIL-001 | `tests/performance/availability-slot-generation.js` |
| TC-RNF-CTR-AVAIL-002 | Race condition - bloqueo vs reserva | Integración | Media | RNF-CTR-AVAIL-002 | `tests/integration/api/contractors/availability-concurrency.test.ts` |
| TC-RNF-CTR-AVAIL-003 | A11y - Navegación por teclado | E2E/Playwright | Alta | RNF-CTR-AVAIL-003 | `tests/e2e/contractor-availability-a11y.spec.ts` |
| TC-RNF-CTR-AVAIL-004 | A11y - ARIA y lector de pantalla | E2E/Playwright | Alta | RNF-CTR-AVAIL-003 | `tests/e2e/contractor-availability-a11y.spec.ts` |
| TC-RNF-CTR-AVAIL-005 | Responsive - Mobile 375px | E2E/Playwright | Alta | RNF-CTR-AVAIL-004 | `tests/e2e/contractor-availability-responsive.spec.ts` |

---

### Criterios de Aceptación

**Para archivar este cambio:**

- ✅ **Todos los 25 casos de prueba pasan** (20 funcionales + 5 no funcionales)
- ✅ **Cobertura ≥ 70%** en `src/modules/contractors/availability/`
  - Services: ≥ 80%
  - Repositories: ≥ 70%
  - Validators: ≥ 90%
  - Utils: ≥ 80%
  - UI Components: ≥ 60%
- ✅ **Performance:**
  - P95 ≤ 800ms para generación de slots (k6 test)
  - P99 ≤ 1200ms
  - 0 errores 500
- ✅ **Accesibilidad:**
  - 0 violaciones axe-core (nivel AA)
  - Navegación por teclado completa
  - ARIA labels en todos los elementos interactivos
- ✅ **Responsive:**
  - Tests pasan en 375px, 768px, 1024px (Playwright)
  - Touch targets ≥ 44x44px
- ✅ **CI/CD en verde** (GitHub Actions)
- ✅ **STP actualizado** con resultados de ejecución
- ✅ **PR mergeado a `dev`**
- ✅ **Build sin errores** (`npm run build` exitoso)

---

### Estrategia de Implementación de Tests

#### 1. Tests Unitarios

**Ubicación:** `src/modules/contractors/availability/__tests__/`

**Archivos:**
- `validators.test.ts`: Validación de Zod schemas (intervalos, fechas, traslapes)
- `timezoneUtils.test.ts`: Conversión TZ ↔ UTC, manejo de DST
- `slotGenerator.test.ts`: Algoritmo de combinación (reglas + excepciones + bloqueos)
- `availabilityService.test.ts`: Lógica de negocio (mocks de repositorios)
- `availabilityRepository.test.ts`: CRUD básico (con test DB)

**Mocks:**
- Prisma client: `jest.mock('@prisma/client')`
- Clerk: `jest.mock('@clerk/nextjs')`
- Fecha actual: `jest.useFakeTimers()`

**Fixtures:**
- Contratista con timezone `America/Mexico_City`
- Reglas semanales de lunes-viernes 9-17h
- Excepción para 16 de septiembre (bloqueada)
- Bloqueo para vacaciones 20-25 dic
- Reservas confirmadas en slots específicos

---

#### 2. Tests de Integración

**Ubicación:** `tests/integration/api/contractors/`

**Archivos:**
- `availability.test.ts`: Todos los endpoints HTTP (CRUD + generación de slots)
- `availability-concurrency.test.ts`: Race conditions

**Setup:**
- Test DB con Prisma (limpiar antes de cada test)
- Usuario CONTRACTOR autenticado (mock de Clerk)
- ContractorProfile con ContractorServiceLocation (timezone configurado)

**Escenarios:**
- Happy path: crear/listar/actualizar/eliminar reglas/excepciones/bloqueos
- Errores: validación falla, ownership falla, colisiones
- Autorización: CONTRACTOR vs CLIENT vs ADMIN
- Generación de slots: con/sin excepciones/bloqueos/reservas

---

#### 3. Tests E2E

**Ubicación:** `tests/e2e/`

**Archivos:**
- `contractor-availability.spec.ts`: Flujo completo de gestión
- `contractor-availability-a11y.spec.ts`: Accesibilidad (axe-core)
- `contractor-availability-responsive.spec.ts`: Responsive design

**Flujo E2E:**
1. Login como CONTRACTOR
2. Navegar a `/contractors/availability`
3. Crear regla semanal para lunes 9-17h
4. Agregar excepción para 16 sept (bloqueada)
5. Crear bloqueo para vacaciones 20-25 dic
6. Verificar que slots generados excluyen excepciones y bloqueos
7. Intentar bloquear slot con reserva confirmada → error
8. Eliminar bloqueo
9. Logout

**Accesibilidad:**
- Navegar solo con teclado (Tab, Enter, Escape, Flechas)
- Verificar ARIA labels con lector de pantalla
- 0 violaciones axe-core

**Responsive:**
- Viewports: 375px, 768px, 1024px, 1920px
- Verificar que calendario se adapta (semanal en mobile, mensual en desktop)
- Touch targets ≥ 44x44px

---

#### 4. Tests de Performance

**Ubicación:** `tests/performance/`

**Archivo:** `availability-slot-generation.js` (k6)

**Escenario:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up
    { duration: '60s', target: 100 }, // Sustained load
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    'http_req_duration{endpoint:slots}': ['p(95)<800', 'p(99)<1200'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const contractorId = 'test-contractor-uuid';
  const startDate = '2025-11-20';
  const endDate = '2026-01-15'; // 8 semanas

  const res = http.get(
    `${__ENV.API_URL}/api/contractors/${contractorId}/availability/slots?startDate=${startDate}&endDate=${endDate}`,
    { tags: { endpoint: 'slots' } }
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has slots': (r) => JSON.parse(r.body).length > 0,
    'P95 < 800ms': (r) => r.timings.duration < 800,
  });

  sleep(1);
}
```

**Datos de prueba:**
- 100 contratistas
- Cada uno con 7 reglas semanales (L-D)
- 50 excepciones random
- 20 bloqueos random
- 30 reservas confirmadas

**Objetivo:**
- P95 ≤ 800ms
- P99 ≤ 1200ms
- Error rate < 1%

---

### Mocks y Fixtures

#### Mock de Clerk

```typescript
// src/modules/contractors/availability/__tests__/fixtures/clerk.mock.ts
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(() => ({
    userId: 'clerk_user_123',
    sessionId: 'session_123',
  })),
  currentUser: jest.fn(() => ({
    id: 'clerk_user_123',
    emailAddresses: [{ emailAddress: 'contractor@test.com' }],
  })),
}));
```

#### Fixtures de Datos

```typescript
// src/modules/contractors/availability/__tests__/fixtures/availability.fixtures.ts
export const mockContractorProfile = {
  id: 'contractor-profile-uuid',
  userId: 'clerk_user_123',
  businessName: 'Test Contractor',
  verified: true,
  location: {
    timezone: 'America/Mexico_City',
    baseLatitude: 20.6736,
    baseLongitude: -103.3444,
  },
};

export const mockWeeklyRules = [
  {
    id: 'rule-mon-uuid',
    contractorProfileId: 'contractor-profile-uuid',
    dayOfWeek: 1, // Monday
    intervals: [
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
    enabled: true,
  },
  // ... más días
];

export const mockException = {
  id: 'exception-uuid',
  contractorProfileId: 'contractor-profile-uuid',
  date: '2025-09-16', // Día de la Independencia
  intervals: [],
  type: 'BLOCKED',
  reason: 'Feriado nacional',
};

export const mockBlock = {
  id: 'block-uuid',
  contractorProfileId: 'contractor-profile-uuid',
  startDateTime: '2025-12-20T00:00:00Z',
  endDateTime: '2025-12-25T23:59:59Z',
  reason: 'Vacaciones de Navidad',
};
```

---

### Integraciones Externas

#### Prisma (Test DB)

```typescript
// tests/integration/helpers/prisma.setup.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Limpiar tablas relevantes
  await prisma.contractorAvailabilityBlock.deleteMany();
  await prisma.contractorAvailabilityException.deleteMany();
  await prisma.contractorWeeklyRule.deleteMany();
});
```

#### Clerk (Modo Test)

- Usar Clerk test environment con usuarios de prueba
- No hacer llamadas reales a Clerk API (usar mocks)

#### date-fns-tz

```typescript
// src/modules/contractors/availability/utils/timezone.ts
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export function convertToUTC(date: Date, timezone: string): Date {
  return zonedTimeToUtc(date, timezone);
}

export function convertFromUTC(date: Date, timezone: string): Date {
  return utcToZonedTime(date, timezone);
}
```

---

## Risks and Mitigations

### Risk 1: Complejidad del Algoritmo de Combinación

**Descripción:** El algoritmo de generación de slots puede volverse complejo y lento si no se optimiza.

**Probabilidad:** Media
**Impacto:** Alto (afecta UX si P95 > 800ms)

**Mitigación:**
- Limitar rango de generación a 8 semanas máximo
- Índices en BD: `(contractorProfileId, dayOfWeek)`, `(contractorProfileId, date)`
- Evitar N+1 queries (usar `Prisma.include`)
- Tests de performance con k6 (detectar regresiones)

---

### Risk 2: Manejo de Zona Horaria y DST

**Descripción:** Bugs en conversión TZ pueden causar slots incorrectos (ej: horario de verano).

**Probabilidad:** Media
**Impacto:** Alto (datos incorrectos)

**Mitigación:**
- Usar librerías robustas: `date-fns-tz`
- Tests específicos para DST (TC-RF-CTR-AVAIL-015)
- Documentación clara en API sobre qué TZ esperan/retornan datos
- Validar que `ContractorServiceLocation.timezone` esté configurado

---

### Risk 3: Race Conditions en Bloqueos vs Reservas

**Descripción:** Dos operaciones simultáneas pueden causar colisiones (ej: cliente reserva mientras contratista bloquea).

**Probabilidad:** Baja
**Impacto:** Medio (inconsistencia temporal)

**Mitigación:**
- Transacciones atómicas en Prisma (`prisma.$transaction`)
- Tests de concurrencia (TC-RNF-CTR-AVAIL-002)
- Para v2: lock optimista con `version` field

---

### Risk 4: Accesibilidad Incompleta

**Descripción:** UI compleja (calendario) puede fallar en accesibilidad si no se diseña correctamente.

**Probabilidad:** Media
**Impacto:** Alto (afecta usuarios con discapacidades)

**Mitigación:**
- Seguir patrones WCAG 2.1 AA desde el inicio
- ARIA labels completos en todos los elementos
- Tests con axe-core + Playwright (TC-RNF-CTR-AVAIL-003, 004)
- Navegación por teclado en todos los componentes

---

## Handoff Notes

### Integración con Módulo `services`

**Flujo:**
1. Al crear servicio → `Service.durationMinutes` debe estar configurado
2. Al generar slots → si `serviceId` en query → filtrar slots donde `durationMinutes >= service.durationMinutes`

**Contrato:**
```typescript
// En availabilityService
async generateSlots(
  contractorId: string,
  startDate: string,
  endDate: string,
  serviceId?: string
): Promise<AvailableSlotDTO[]>
```

---

### Integración con Módulo `booking`

**Flujo:**
1. Al crear reserva → validar que el slot esté disponible:
   ```typescript
   const isAvailable = await availabilityService.isAvailableOnDateTime(
     contractorId,
     date,
     startTime,
     endTime
   );
   if (!isAvailable) throw new Error('Slot no disponible');
   ```

2. Al crear bloqueo → validar que no haya reservas CONFIRMADAS:
   ```typescript
   const confirmedBookings = await bookingService.getConfirmedBookingsByContractor(
     contractorId,
     startDateTime,
     endDateTime
   );
   if (confirmedBookings.length > 0) throw new Error('Colisión con reserva');
   ```

**Contrato:**
```typescript
// En availabilityService
async isAvailableOnDateTime(
  contractorId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean>

// En bookingService
async getConfirmedBookingsByContractor(
  contractorId: string,
  startDateTime: string,
  endDateTime: string
): Promise<Booking[]>
```

---

### Integración con Módulo `messaging`

**Futuro (v2):** Enviar notificaciones cuando se crea/edita/elimina disponibilidad que afecte reservas futuras.

**No implementar en v1.**

---

## Dependencies and Prerequisites

### Dependencias de NPM

**Nuevas a instalar:**
```json
{
  "dependencies": {
    "date-fns": "^2.30.0",
    "date-fns-tz": "^2.0.0"
  }
}
```

**Ya existentes (verificar versión):**
- `@prisma/client`: >= 5.x
- `zod`: >= 3.x
- `react-hook-form`: >= 7.x
- `next`: >= 14.x

---

### Prerequisitos

1. **ContractorServiceLocation.timezone debe estar configurado:**
   - Si no está → error 400 al intentar crear disponibilidad
   - Validar en onboarding/settings

2. **Migración de BD:**
   - Crear modelos: `ContractorWeeklyRule`, `ContractorAvailabilityException`, `ContractorAvailabilityBlock`
   - Agregar relaciones a `ContractorProfile`

3. **Módulo `booking` debe estar implementado (al menos parcialmente):**
   - Necesitamos consultar reservas confirmadas para validar bloqueos

---

## Success Metrics

### Técnicos

- ✅ 25/25 casos de prueba pasan
- ✅ Cobertura ≥ 70% (services ≥ 80%, validators ≥ 90%)
- ✅ P95 ≤ 800ms, P99 ≤ 1200ms (k6)
- ✅ 0 violaciones axe-core (a11y)
- ✅ 0 errores en build/lint/typecheck
- ✅ CI/CD en verde

### UX

- ✅ Navegación por teclado completa
- ✅ Estados vacíos/loading/error claros
- ✅ Responsive en 375px, 768px, 1024px
- ✅ Touch targets ≥ 44x44px

### Negocio (futuro)

- Contratistas configuran disponibilidad en < 5 min (onboarding)
- Clientes ven slots disponibles en < 1s
- Reducción de reservas fallidas por colisiones de horarios

---

## Timeline (Estimado)

**Nota:** Este proyecto académico no tiene timelines estrictos. Esta estimación es solo para organización interna.

**Sprint 1 (Backend):**
- Migración de BD
- Implementar repositories + services
- Algoritmo de generación de slots
- Tests unitarios + integración

**Sprint 2 (Frontend):**
- Componentes UI (AvailabilityManager, AvailabilityWeekly, etc.)
- Integración con API
- Estados vacíos/loading/error
- Tests E2E + a11y

**Sprint 3 (QA):**
- Tests de performance (k6)
- Fixes de bugs
- Documentación
- Actualización STP

---

## Approval

**Estado:** Draft (pendiente de aprobación del equipo)

**Aprobadores:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead

**Fecha de aprobación:** _______

---

**Versión:** 1.0
**Fecha:** 2025-11-20
**Autor:** Claude Code (asistente de desarrollo)
