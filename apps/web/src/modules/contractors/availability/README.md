# Contractor Availability Module

**Status:** 🚧 Scaffolding - Implementation Pending

## Overview

Este módulo gestiona la disponibilidad de horarios de los contratistas mediante reglas semanales recurrentes, excepciones puntuales y bloqueos manuales.

## Structure

```
availability/
├── types/                # DTOs y tipos TypeScript
├── validators/           # Schemas Zod para validación
├── repositories/         # Acceso a datos (Prisma)
├── services/             # Lógica de negocio
├── utils/                # Utilidades (TZ, intervalos)
├── errors/               # Errores custom
├── __tests__/            # Tests unitarios
└── index.ts              # Barrel export
```

## Prerequisites

### 1. Database Migration

**IMPORTANTE:** Antes de usar este módulo, debes aplicar la migración de Prisma:

```bash
npx prisma migrate dev --name add_contractor_availability_models
```

Esta migración agrega los modelos:
- `ContractorWeeklyRule`
- `ContractorAvailabilityException`
- `ContractorAvailabilityBlock`

### 2. NPM Dependencies

Instalar dependencias para manejo de zona horaria:

```bash
npm install date-fns date-fns-tz
```

### 3. Contractor Timezone

El contratista **DEBE** tener `ContractorServiceLocation.timezone` configurado (formato IANA, ej: `"America/Mexico_City"`).

## Usage

### Creating Weekly Rules

```typescript
import { availabilityService } from '@/modules/contractors/availability';

const rule = await availabilityService.createWeeklyRule(
  userId,
  contractorProfileId,
  {
    dayOfWeek: 1, // Monday
    intervals: [
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '18:00' },
    ],
  }
);
```

### Generating Slots

```typescript
import { slotGeneratorService } from '@/modules/contractors/availability';

const slots = await slotGeneratorService.generateSlots(
  contractorId,
  '2025-11-20', // startDate
  '2025-12-20', // endDate
  serviceId      // optional
);

// Returns:
// [
//   {
//     date: '2025-11-21',
//     startTime: '09:00',
//     endTime: '12:00',
//     durationMinutes: 180,
//     timezone: 'America/Mexico_City'
//   },
//   ...
// ]
```

## API Routes

**TODO:** Implementar endpoints en:
- `app/api/contractors/me/availability/weekly/` (GET, POST)
- `app/api/contractors/me/availability/weekly/[ruleId]/` (PATCH, DELETE)
- `app/api/contractors/me/availability/exceptions/` (GET, POST)
- `app/api/contractors/me/availability/exceptions/[exceptionId]/` (PATCH, DELETE)
- `app/api/contractors/me/availability/blocks/` (GET, POST)
- `app/api/contractors/me/availability/blocks/[blockId]/` (DELETE)
- `app/api/contractors/[contractorId]/availability/slots/` (GET)

## Testing

**TODO:** Implementar tests en:
- `__tests__/` - Unitarios (services, validators, utils)
- `tests/integration/api/contractors/availability.test.ts` - Integración
- `tests/e2e/contractor-availability.spec.ts` - E2E
- `tests/performance/availability-slot-generation.js` - k6

**Cobertura objetivo:** ≥ 70% (services ≥ 80%, validators ≥ 90%)

## Integration Points

### With Booking Module

```typescript
// Before creating a booking, validate availability
const isAvailable = await availabilityService.isAvailableOnDateTime(
  contractorId,
  '2025-11-21',
  '10:00',
  '12:00'
);

if (!isAvailable) {
  throw new Error('Slot not available');
}
```

### With Services Module

```typescript
// When generating slots, filter by service duration
const slots = await slotGeneratorService.generateSlots(
  contractorId,
  startDate,
  endDate,
  serviceId // <- filters slots by Service.durationMinutes
);
```

## Documentation

- **Spec:** `/openspec/specs/contractor-availability/spec.md`
- **Proposal:** `/openspec/changes/2025-11-20-contractor-availability/proposal.md`
- **Tasks:** `/openspec/changes/2025-11-20-contractor-availability/tasks.md`
- **STP:** `/docs/md/STP-ReparaYa.md` (sección 4.1.12)

## Implementation Status

- [x] Spec written
- [x] Tasks planned
- [x] Scaffolding created
- [ ] Database migration applied
- [ ] Validators implemented
- [ ] Utilities implemented
- [ ] Repositories implemented
- [ ] Services implemented
- [ ] API routes implemented
- [ ] UI components implemented
- [ ] Tests written
- [ ] STP updated

---

**Next Steps:**

1. Apply Prisma migration
2. Implement validators with overlap detection
3. Implement timezone utils
4. Implement repositories
5. Implement services with authorization
6. Write tests
7. Implement API routes
8. Implement UI components
9. Run E2E and performance tests
10. Update STP with results

See `tasks.md` for detailed implementation plan.
