# Tasks: Contractor Availability Implementation

## Overview

Este documento detalla las tareas secuenciadas para implementar el feature de disponibilidad de contratistas. Las tareas están organizadas en fases lógicas y cada una es verificable.

---

## Phase 1: Database & Core Models

### Task 1.1: Crear migración de Prisma para modelos de disponibilidad

**Descripción:** Agregar modelos `ContractorWeeklyRule`, `ContractorAvailabilityException`, `ContractorAvailabilityBlock` al schema de Prisma.

**Archivos a modificar:**
- `apps/web/prisma/schema.prisma`

**Pasos:**
1. Agregar modelo `ContractorWeeklyRule`:
   ```prisma
   model ContractorWeeklyRule {
     id                    String   @id @default(uuid())
     contractorProfileId   String
     dayOfWeek             Int      @db.SmallInt
     intervals             Json
     enabled               Boolean  @default(true)
     createdAt             DateTime @default(now())
     updatedAt             DateTime @updatedAt
     contractorProfile     ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)
     @@index([contractorProfileId, dayOfWeek])
     @@map("contractor_weekly_rules")
   }
   ```

2. Agregar modelo `ContractorAvailabilityException`:
   ```prisma
   model ContractorAvailabilityException {
     id                    String   @id @default(uuid())
     contractorProfileId   String
     date                  DateTime @db.Date
     intervals             Json
     type                  String
     reason                String?
     createdAt             DateTime @default(now())
     updatedAt             DateTime @updatedAt
     contractorProfile     ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)
     @@unique([contractorProfileId, date])
     @@index([contractorProfileId, date])
     @@map("contractor_availability_exceptions")
   }
   ```

3. Agregar modelo `ContractorAvailabilityBlock`:
   ```prisma
   model ContractorAvailabilityBlock {
     id                    String   @id @default(uuid())
     contractorProfileId   String
     startDateTime         DateTime
     endDateTime           DateTime
     reason                String?
     createdAt             DateTime @default(now())
     updatedAt             DateTime @updatedAt
     contractorProfile     ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)
     @@index([contractorProfileId, startDateTime, endDateTime])
     @@map("contractor_availability_blocks")
   }
   ```

4. Actualizar modelo `ContractorProfile` con relaciones:
   ```prisma
   model ContractorProfile {
     // ... campos existentes ...
     weeklyRules             ContractorWeeklyRule[]
     availabilityExceptions  ContractorAvailabilityException[]
     availabilityBlocks      ContractorAvailabilityBlock[]
   }
   ```

5. Formatear y validar:
   ```bash
   npx prisma format
   npx prisma validate
   ```

6. Crear migración:
   ```bash
   npx prisma migrate dev --name add_contractor_availability_models
   ```

**Criterio de aceptación:**
- ✅ Migración se aplica sin errores
- ✅ Modelos aparecen en Prisma Client
- ✅ Índices creados correctamente
- ✅ Relaciones funcionan (query de prueba manual)

**Casos de prueba relacionados:** N/A (infraestructura)

---

### Task 1.2: Crear tipos y DTOs de TypeScript

**Descripción:** Definir interfaces y DTOs para disponibilidad.

**Archivos a crear:**
- `apps/web/src/modules/contractors/availability/types/index.ts`
- `apps/web/src/modules/contractors/availability/types/weeklyRule.ts`
- `apps/web/src/modules/contractors/availability/types/exception.ts`
- `apps/web/src/modules/contractors/availability/types/block.ts`
- `apps/web/src/modules/contractors/availability/types/slot.ts`

**Contenido de ejemplo (`types/weeklyRule.ts`):**
```typescript
export interface TimeInterval {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

export interface CreateWeeklyRuleDTO {
  dayOfWeek: number; // 0-6
  intervals: TimeInterval[];
}

export interface UpdateWeeklyRuleDTO {
  intervals?: TimeInterval[];
  enabled?: boolean;
}

export interface WeeklyRuleResponseDTO {
  id: string;
  contractorProfileId: string;
  dayOfWeek: number;
  intervals: TimeInterval[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Contenido de `types/slot.ts`:**
```typescript
export interface AvailableSlotDTO {
  date: string;           // "YYYY-MM-DD"
  startTime: string;      // "HH:MM"
  endTime: string;        // "HH:MM"
  durationMinutes: number;
  timezone: string;       // "America/Mexico_City"
}

export interface GenerateSlotsQuery {
  startDate: string;      // "YYYY-MM-DD"
  endDate: string;        // "YYYY-MM-DD"
  serviceId?: string;     // UUID (opcional)
}
```

**Barrel export (`types/index.ts`):**
```typescript
export * from './weeklyRule';
export * from './exception';
export * from './block';
export * from './slot';
```

**Criterio de aceptación:**
- ✅ Tipos se exportan correctamente
- ✅ No errores de TypeScript (`npm run type-check`)
- ✅ DTOs cubren todos los casos de uso (CRUD + generación de slots)

**Casos de prueba relacionados:** N/A (tipos)

---

## Phase 2: Validations & Utils

### Task 2.1: Crear validadores Zod

**Descripción:** Definir schemas Zod para validar inputs de reglas/excepciones/bloqueos.

**Archivos a crear:**
- `apps/web/src/modules/contractors/availability/validators/index.ts`
- `apps/web/src/modules/contractors/availability/validators/weeklyRule.ts`
- `apps/web/src/modules/contractors/availability/validators/exception.ts`
- `apps/web/src/modules/contractors/availability/validators/block.ts`

**Contenido de ejemplo (`validators/weeklyRule.ts`):**
```typescript
import { z } from 'zod';

const timeIntervalSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato debe ser HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato debe ser HH:MM'),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'startTime debe ser anterior a endTime' }
);

export const createWeeklyRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6, 'dayOfWeek debe estar entre 0-6'),
  intervals: z.array(timeIntervalSchema).min(1, 'Debe haber al menos un intervalo'),
}).refine(
  (data) => {
    // Validar que no haya traslapes entre intervalos
    const sorted = [...data.intervals].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].endTime > sorted[i + 1].startTime) {
        return false;
      }
    }
    return true;
  },
  { message: 'Los intervalos no deben traslaparse' }
);

export const updateWeeklyRuleSchema = z.object({
  intervals: z.array(timeIntervalSchema).optional(),
  enabled: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.intervals) {
      // Misma validación de traslapes
      const sorted = [...data.intervals].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].endTime > sorted[i + 1].startTime) {
          return false;
        }
      }
    }
    return true;
  },
  { message: 'Los intervalos no deben traslaparse' }
);
```

**Tests (`validators/__tests__/weeklyRule.test.ts`):**
```typescript
import { describe, it, expect } from '@jest/globals';
import { createWeeklyRuleSchema } from '../weeklyRule';

describe('createWeeklyRuleSchema - TC-RF-CTR-AVAIL-002', () => {
  it('should accept valid weekly rule', () => {
    const valid = {
      dayOfWeek: 1,
      intervals: [
        { startTime: '09:00', endTime: '12:00' },
        { startTime: '14:00', endTime: '18:00' },
      ],
    };
    expect(() => createWeeklyRuleSchema.parse(valid)).not.toThrow();
  });

  it('should reject overlapping intervals', () => {
    const invalid = {
      dayOfWeek: 1,
      intervals: [
        { startTime: '09:00', endTime: '13:00' },
        { startTime: '12:00', endTime: '18:00' }, // Overlap
      ],
    };
    expect(() => createWeeklyRuleSchema.parse(invalid)).toThrow('no deben traslaparse');
  });

  it('should reject invalid dayOfWeek', () => {
    const invalid = { dayOfWeek: 7, intervals: [{ startTime: '09:00', endTime: '12:00' }] };
    expect(() => createWeeklyRuleSchema.parse(invalid)).toThrow('debe estar entre 0-6');
  });
});
```

**Criterio de aceptación:**
- ✅ Schemas validan correctamente casos happy path
- ✅ Schemas rechazan casos inválidos (traslapes, formatos, rangos)
- ✅ Tests cubren edge cases (TC-RF-CTR-AVAIL-002)
- ✅ Cobertura ≥ 90% en validators

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-002

---

### Task 2.2: Crear utilidades de zona horaria

**Descripción:** Funciones para convertir entre TZ IANA y UTC, manejar DST.

**Dependencias:**
```bash
npm install date-fns date-fns-tz
```

**Archivos a crear:**
- `apps/web/src/modules/contractors/availability/utils/timezone.ts`
- `apps/web/src/modules/contractors/availability/utils/__tests__/timezone.test.ts`

**Contenido (`utils/timezone.ts`):**
```typescript
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { parse, format } from 'date-fns';

export function convertToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  const localDateTimeStr = `${dateStr} ${timeStr}`;
  const localDateTime = parse(localDateTimeStr, 'yyyy-MM-dd HH:mm', new Date());
  return zonedTimeToUtc(localDateTime, timezone);
}

export function convertFromUTC(utcDate: Date, timezone: string): { date: string; time: string } {
  const zonedDate = utcToZonedTime(utcDate, timezone);
  return {
    date: format(zonedDate, 'yyyy-MM-dd'),
    time: format(zonedDate, 'HH:mm'),
  };
}

export function validateTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
```

**Tests (`utils/__tests__/timezone.test.ts`):**
```typescript
import { describe, it, expect } from '@jest/globals';
import { convertToUTC, convertFromUTC, validateTimezone } from '../timezone';

describe('Timezone Utils - TC-RF-CTR-AVAIL-014, TC-RF-CTR-AVAIL-015', () => {
  it('should convert local time to UTC correctly', () => {
    const utc = convertToUTC('2025-11-20', '09:00', 'America/Mexico_City');
    expect(utc.toISOString()).toContain('15:00:00'); // Mexico City es UTC-6
  });

  it('should convert UTC to local time correctly', () => {
    const utcDate = new Date('2025-11-20T15:00:00Z');
    const { date, time } = convertFromUTC(utcDate, 'America/Mexico_City');
    expect(date).toBe('2025-11-20');
    expect(time).toBe('09:00');
  });

  it('should handle DST transitions', () => {
    // Abril: inicia horario de verano (UTC-5)
    const springUTC = convertToUTC('2025-04-06', '09:00', 'America/Mexico_City');
    expect(springUTC.toISOString()).toContain('14:00:00'); // UTC-5

    // Noviembre: termina horario de verano (UTC-6)
    const fallUTC = convertToUTC('2025-11-02', '09:00', 'America/Mexico_City');
    expect(fallUTC.toISOString()).toContain('15:00:00'); // UTC-6
  });

  it('should validate IANA timezone', () => {
    expect(validateTimezone('America/Mexico_City')).toBe(true);
    expect(validateTimezone('Invalid/Timezone')).toBe(false);
  });
});
```

**Criterio de aceptación:**
- ✅ Conversiones TZ ↔ UTC correctas
- ✅ DST manejado correctamente (TC-RF-CTR-AVAIL-015)
- ✅ Validación de timezone IANA
- ✅ Cobertura ≥ 80% en utils

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-014, TC-RF-CTR-AVAIL-015

---

### Task 2.3: Crear utilidades de intervalos

**Descripción:** Funciones para detectar traslapes, restar intervalos, etc.

**Archivos a crear:**
- `apps/web/src/modules/contractors/availability/utils/intervals.ts`
- `apps/web/src/modules/contractors/availability/utils/__tests__/intervals.test.ts`

**Contenido (`utils/intervals.ts`):**
```typescript
import { TimeInterval } from '../types';

export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

export function subtractInterval(base: TimeInterval, toSubtract: TimeInterval): TimeInterval[] {
  if (!intervalsOverlap(base, toSubtract)) {
    return [base];
  }

  const result: TimeInterval[] = [];

  // Parte antes de la intersección
  if (base.startTime < toSubtract.startTime) {
    result.push({ startTime: base.startTime, endTime: toSubtract.startTime });
  }

  // Parte después de la intersección
  if (base.endTime > toSubtract.endTime) {
    result.push({ startTime: toSubtract.endTime, endTime: base.endTime });
  }

  return result;
}

export function calculateDurationMinutes(interval: TimeInterval): number {
  const [startHour, startMin] = interval.startTime.split(':').map(Number);
  const [endHour, endMin] = interval.endTime.split(':').map(Number);
  return (endHour * 60 + endMin) - (startHour * 60 + startMin);
}
```

**Tests (`utils/__tests__/intervals.test.ts`):**
```typescript
import { describe, it, expect } from '@jest/globals';
import { intervalsOverlap, subtractInterval, calculateDurationMinutes } from '../intervals';

describe('Interval Utils - TC-RF-CTR-AVAIL-012', () => {
  it('should detect overlapping intervals', () => {
    expect(intervalsOverlap(
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '11:00', endTime: '14:00' }
    )).toBe(true);

    expect(intervalsOverlap(
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '17:00' }
    )).toBe(false);
  });

  it('should subtract interval correctly', () => {
    const result = subtractInterval(
      { startTime: '09:00', endTime: '17:00' },
      { startTime: '12:00', endTime: '14:00' }
    );
    expect(result).toEqual([
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '14:00', endTime: '17:00' },
    ]);
  });

  it('should calculate duration in minutes', () => {
    expect(calculateDurationMinutes({ startTime: '09:00', endTime: '12:00' })).toBe(180);
    expect(calculateDurationMinutes({ startTime: '14:30', endTime: '18:45' })).toBe(255);
  });
});
```

**Criterio de aceptación:**
- ✅ Detección de traslapes correcta
- ✅ Sustracción de intervalos correcta
- ✅ Cálculo de duración correcto
- ✅ Cobertura ≥ 80%

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-012

---

## Phase 3: Repository Layer

### Task 3.1: Implementar WeeklyRuleRepository

**Descripción:** CRUD de reglas semanales usando Prisma.

**Archivos a crear:**
- `apps/web/src/modules/contractors/availability/repositories/weeklyRuleRepository.ts`
- `apps/web/src/modules/contractors/availability/repositories/__tests__/weeklyRuleRepository.test.ts`

**Contenido (`repositories/weeklyRuleRepository.ts`):**
```typescript
import { PrismaClient } from '@prisma/client';
import { CreateWeeklyRuleDTO, UpdateWeeklyRuleDTO, WeeklyRuleResponseDTO } from '../types';

const prisma = new PrismaClient();

export const weeklyRuleRepository = {
  async create(contractorProfileId: string, data: CreateWeeklyRuleDTO): Promise<WeeklyRuleResponseDTO> {
    return prisma.contractorWeeklyRule.create({
      data: {
        contractorProfileId,
        dayOfWeek: data.dayOfWeek,
        intervals: data.intervals,
      },
    });
  },

  async findById(id: string): Promise<WeeklyRuleResponseDTO | null> {
    return prisma.contractorWeeklyRule.findUnique({ where: { id } });
  },

  async findByContractor(contractorProfileId: string): Promise<WeeklyRuleResponseDTO[]> {
    return prisma.contractorWeeklyRule.findMany({
      where: { contractorProfileId },
      orderBy: { dayOfWeek: 'asc' },
    });
  },

  async update(id: string, data: UpdateWeeklyRuleDTO): Promise<WeeklyRuleResponseDTO> {
    return prisma.contractorWeeklyRule.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.contractorWeeklyRule.delete({ where: { id } });
  },
};
```

**Tests (con test DB):**
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { weeklyRuleRepository } from '../weeklyRuleRepository';
import { prisma } from '@/tests/helpers/prisma.setup';

describe('WeeklyRuleRepository - TC-RF-CTR-AVAIL-001, 003', () => {
  const contractorProfileId = 'test-contractor-uuid';

  beforeEach(async () => {
    await prisma.contractorWeeklyRule.deleteMany();
  });

  it('should create weekly rule', async () => {
    const rule = await weeklyRuleRepository.create(contractorProfileId, {
      dayOfWeek: 1,
      intervals: [{ startTime: '09:00', endTime: '17:00' }],
    });

    expect(rule.id).toBeDefined();
    expect(rule.dayOfWeek).toBe(1);
    expect(rule.intervals).toEqual([{ startTime: '09:00', endTime: '17:00' }]);
  });

  it('should find by contractor', async () => {
    await weeklyRuleRepository.create(contractorProfileId, {
      dayOfWeek: 1,
      intervals: [{ startTime: '09:00', endTime: '17:00' }],
    });

    const rules = await weeklyRuleRepository.findByContractor(contractorProfileId);
    expect(rules).toHaveLength(1);
  });

  it('should update rule', async () => {
    const rule = await weeklyRuleRepository.create(contractorProfileId, {
      dayOfWeek: 1,
      intervals: [{ startTime: '09:00', endTime: '17:00' }],
    });

    const updated = await weeklyRuleRepository.update(rule.id, {
      intervals: [{ startTime: '10:00', endTime: '14:00' }],
    });

    expect(updated.intervals).toEqual([{ startTime: '10:00', endTime: '14:00' }]);
  });

  it('should delete rule', async () => {
    const rule = await weeklyRuleRepository.create(contractorProfileId, {
      dayOfWeek: 1,
      intervals: [{ startTime: '09:00', endTime: '17:00' }],
    });

    await weeklyRuleRepository.delete(rule.id);

    const found = await weeklyRuleRepository.findById(rule.id);
    expect(found).toBeNull();
  });
});
```

**Criterio de aceptación:**
- ✅ CRUD funciona correctamente
- ✅ Tests pasan con test DB
- ✅ Cobertura ≥ 70%

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-001, TC-RF-CTR-AVAIL-003

---

### Task 3.2: Implementar ExceptionRepository

**Descripción:** CRUD de excepciones.

**Archivos a crear:**
- `apps/web/src/modules/contractors/availability/repositories/exceptionRepository.ts`
- `apps/web/src/modules/contractors/availability/repositories/__tests__/exceptionRepository.test.ts`

**(Seguir patrón similar a Task 3.1)**

**Criterio de aceptación:**
- ✅ CRUD funciona correctamente
- ✅ Constraint unique (contractorProfileId, date) se respeta
- ✅ Tests pasan
- ✅ Cobertura ≥ 70%

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-004, TC-RF-CTR-AVAIL-006

---

### Task 3.3: Implementar BlockRepository

**Descripción:** CRUD de bloqueos.

**Archivos a crear:**
- `apps/web/src/modules/contractors/availability/repositories/blockRepository.ts`
- `apps/web/src/modules/contractors/availability/repositories/__tests__/blockRepository.test.ts`

**(Seguir patrón similar a Task 3.1)**

**Método adicional:**
```typescript
async findByDateRange(
  contractorProfileId: string,
  startDateTime: Date,
  endDateTime: Date
): Promise<BlockResponseDTO[]> {
  return prisma.contractorAvailabilityBlock.findMany({
    where: {
      contractorProfileId,
      OR: [
        { startDateTime: { gte: startDateTime, lte: endDateTime } },
        { endDateTime: { gte: startDateTime, lte: endDateTime } },
        { AND: [{ startDateTime: { lte: startDateTime } }, { endDateTime: { gte: endDateTime } }] },
      ],
    },
  });
}
```

**Criterio de aceptación:**
- ✅ CRUD funciona correctamente
- ✅ `findByDateRange` detecta intersecciones
- ✅ Tests pasan
- ✅ Cobertura ≥ 70%

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-007, TC-RF-CTR-AVAIL-009

---

## Phase 4: Service Layer

### Task 4.1: Implementar availabilityService (CRUD)

**Descripción:** Lógica de negocio para CRUD de reglas/excepciones/bloqueos.

**Archivos a crear:**
- `apps/web/src/modules/contractors/availability/services/availabilityService.ts`
- `apps/web/src/modules/contractors/availability/services/__tests__/availabilityService.test.ts`

**Contenido parcial (`services/availabilityService.ts`):**
```typescript
import { weeklyRuleRepository } from '../repositories/weeklyRuleRepository';
import { createWeeklyRuleSchema } from '../validators/weeklyRule';
import { WeeklyRuleNotFoundError, UnauthorizedError } from '../errors';

export const availabilityService = {
  async createWeeklyRule(
    userId: string,
    contractorProfileId: string,
    data: CreateWeeklyRuleDTO
  ): Promise<WeeklyRuleResponseDTO> {
    // 1. Validar input
    const validated = createWeeklyRuleSchema.parse(data);

    // 2. Verificar ownership
    const profile = await contractorProfileRepository.findById(contractorProfileId);
    if (!profile || profile.userId !== userId) {
      throw new UnauthorizedError('No autorizado');
    }

    // 3. Crear regla
    return weeklyRuleRepository.create(contractorProfileId, validated);
  },

  // ... más métodos (update, delete, list)
};
```

**Tests (con mocks):**
```typescript
import { describe, it, expect, jest } from '@jest/globals';
import { availabilityService } from '../availabilityService';
import { weeklyRuleRepository } from '../../repositories/weeklyRuleRepository';

jest.mock('../../repositories/weeklyRuleRepository');

describe('AvailabilityService - TC-RF-CTR-AVAIL-001, 016', () => {
  it('should create weekly rule if owner', async () => {
    const mockProfile = { id: 'contractor-uuid', userId: 'user-123' };
    jest.spyOn(contractorProfileRepository, 'findById').mockResolvedValue(mockProfile);

    const mockRule = { id: 'rule-uuid', dayOfWeek: 1, intervals: [...] };
    jest.spyOn(weeklyRuleRepository, 'create').mockResolvedValue(mockRule);

    const result = await availabilityService.createWeeklyRule('user-123', 'contractor-uuid', {
      dayOfWeek: 1,
      intervals: [{ startTime: '09:00', endTime: '17:00' }],
    });

    expect(result.id).toBe('rule-uuid');
  });

  it('should throw if not owner', async () => {
    const mockProfile = { id: 'contractor-uuid', userId: 'user-456' };
    jest.spyOn(contractorProfileRepository, 'findById').mockResolvedValue(mockProfile);

    await expect(
      availabilityService.createWeeklyRule('user-123', 'contractor-uuid', { ... })
    ).rejects.toThrow('No autorizado');
  });
});
```

**Criterio de aceptación:**
- ✅ CRUD con validación de ownership
- ✅ Validación Zod integrada
- ✅ Errores custom lanzados correctamente
- ✅ Cobertura ≥ 80%

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-001, TC-RF-CTR-AVAIL-016

---

### Task 4.2: Implementar slotGeneratorService (motor de combinación)

**Descripción:** Algoritmo que combina reglas + excepciones + bloqueos + reservas → slots disponibles.

**Archivos a crear:**
- `apps/web/src/modules/contractors/availability/services/slotGeneratorService.ts`
- `apps/web/src/modules/contractors/availability/services/__tests__/slotGeneratorService.test.ts`

**Contenido parcial (`services/slotGeneratorService.ts`):**
```typescript
import { eachDayOfInterval, getDay, parseISO } from 'date-fns';
import { convertFromUTC } from '../utils/timezone';
import { subtractInterval } from '../utils/intervals';

export const slotGeneratorService = {
  async generateSlots(
    contractorId: string,
    startDate: string,
    endDate: string,
    serviceId?: string
  ): Promise<AvailableSlotDTO[]> {
    // 1. Obtener datos
    const contractor = await contractorProfileRepository.findById(contractorId);
    const timezone = contractor.location.timezone;

    const weeklyRules = await weeklyRuleRepository.findByContractor(contractorId);
    const exceptions = await exceptionRepository.findByDateRange(contractorId, startDate, endDate);
    const blocks = await blockRepository.findByDateRange(contractorId, startDate, endDate);
    const bookings = await bookingService.getConfirmedBookingsByContractor(contractorId, startDate, endDate);

    // 2. Para cada día en rango
    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    const slots: AvailableSlotDTO[] = [];

    for (const day of days) {
      const dayOfWeek = getDay(day); // 0-6
      const dateStr = format(day, 'yyyy-MM-dd');

      // 3a. Obtener intervalos base (regla o excepción)
      let intervals = [];
      const exception = exceptions.find(e => e.date === dateStr);

      if (exception) {
        if (exception.type === 'BLOCKED') continue; // Saltar día completo
        intervals = exception.intervals;
      } else {
        const rule = weeklyRules.find(r => r.dayOfWeek === dayOfWeek && r.enabled);
        if (rule) intervals = rule.intervals;
      }

      if (intervals.length === 0) continue;

      // 3b. Restar bloqueos
      for (const block of blocks) {
        // Convertir block a intervalo del día actual
        const blockInterval = convertBlockToInterval(block, day, timezone);
        intervals = intervals.flatMap(int => subtractInterval(int, blockInterval));
      }

      // 3c. Restar reservas confirmadas
      for (const booking of bookings) {
        const bookingInterval = convertBookingToInterval(booking, day, timezone);
        intervals = intervals.flatMap(int => subtractInterval(int, bookingInterval));
      }

      // 3d. Filtrar por duración de servicio (si aplica)
      if (serviceId) {
        const service = await serviceRepository.findById(serviceId);
        intervals = intervals.filter(int => calculateDurationMinutes(int) >= service.durationMinutes);
      }

      // 3e. Agregar slots
      for (const interval of intervals) {
        slots.push({
          date: dateStr,
          startTime: interval.startTime,
          endTime: interval.endTime,
          durationMinutes: calculateDurationMinutes(interval),
          timezone,
        });
      }
    }

    return slots;
  },
};
```

**Tests:**
```typescript
describe('SlotGeneratorService - TC-RF-CTR-AVAIL-010 a 013', () => {
  it('should generate slots from weekly rules only', async () => {
    // Mock: lunes 9-17h, martes 10-14h
    // Rango: 2025-11-17 (lun) a 2025-11-18 (mar)
    // Esperado: 2 slots (1 lunes, 1 martes)
  });

  it('should apply exception over weekly rule', async () => {
    // Mock: lunes 9-17h, pero excepción lunes 10-12h
    // Esperado: slot de 10-12h (no 9-17h)
  });

  it('should subtract blocks from intervals', async () => {
    // Mock: lunes 9-17h, bloqueo 12-14h
    // Esperado: 2 slots (9-12h, 14-17h)
  });

  it('should subtract confirmed bookings', async () => {
    // Mock: lunes 9-17h, reserva confirmada 10-11h
    // Esperado: 2 slots (9-10h, 11-17h)
  });
});
```

**Criterio de aceptación:**
- ✅ Algoritmo combina correctamente (reglas + excepciones + bloqueos + reservas)
- ✅ Conversión TZ correcta
- ✅ Filtrado por duración de servicio funciona
- ✅ Cobertura ≥ 80%

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-010, 011, 012, 013

---

## Phase 5: API Layer

### Task 5.1: Implementar endpoints de reglas semanales

**Descripción:** API routes para CRUD de reglas semanales.

**Archivos a crear:**
- `apps/web/app/api/contractors/me/availability/weekly/route.ts` (GET, POST)
- `apps/web/app/api/contractors/me/availability/weekly/[ruleId]/route.ts` (PATCH, DELETE)

**Contenido parcial (`weekly/route.ts`):**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { availabilityService } from '@/modules/contractors/availability/services/availabilityService';

export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  // Obtener contractorProfileId del usuario
  const profile = await contractorProfileRepository.findByUserId(userId);
  if (!profile) return NextResponse.json({ error: 'No eres contratista' }, { status: 403 });

  const rules = await availabilityService.listWeeklyRules(profile.id);
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const profile = await contractorProfileRepository.findByUserId(userId);
  if (!profile) return NextResponse.json({ error: 'No eres contratista' }, { status: 403 });

  const body = await req.json();
  const rule = await availabilityService.createWeeklyRule(userId, profile.id, body);

  return NextResponse.json(rule, { status: 201 });
}
```

**Tests de integración:**
```typescript
import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { app } from '@/tests/helpers/app.setup';

describe('POST /api/contractors/me/availability/weekly - TC-RF-CTR-AVAIL-001', () => {
  it('should create weekly rule', async () => {
    const res = await request(app)
      .post('/api/contractors/me/availability/weekly')
      .set('Authorization', `Bearer ${contractorToken}`)
      .send({
        dayOfWeek: 1,
        intervals: [{ startTime: '09:00', endTime: '17:00' }],
      });

    expect(res.status).toBe(201);
    expect(res.body.dayOfWeek).toBe(1);
  });

  it('should return 403 if not contractor', async () => {
    const res = await request(app)
      .post('/api/contractors/me/availability/weekly')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ ... });

    expect(res.status).toBe(403);
  });
});
```

**Criterio de aceptación:**
- ✅ Endpoints funcionan correctamente
- ✅ Autorización por rol y ownership
- ✅ Errores 400/401/403 retornados correctamente
- ✅ Tests de integración pasan

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-001, TC-RF-CTR-AVAIL-016

---

### Task 5.2: Implementar endpoints de excepciones

**Archivos a crear:**
- `apps/web/app/api/contractors/me/availability/exceptions/route.ts` (GET, POST)
- `apps/web/app/api/contractors/me/availability/exceptions/[exceptionId]/route.ts` (PATCH, DELETE)

**(Seguir patrón similar a Task 5.1)**

**Criterio de aceptación:**
- ✅ Endpoints funcionan
- ✅ Query params (startDate, endDate) funcionan en GET
- ✅ Tests pasan

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-004, TC-RF-CTR-AVAIL-006

---

### Task 5.3: Implementar endpoints de bloqueos

**Archivos a crear:**
- `apps/web/app/api/contractors/me/availability/blocks/route.ts` (GET, POST)
- `apps/web/app/api/contractors/me/availability/blocks/[blockId]/route.ts` (DELETE)

**Validación especial en POST:**
```typescript
// Verificar que no haya reservas confirmadas en el intervalo
const confirmedBookings = await bookingService.getConfirmedBookingsByContractor(
  profile.id,
  body.startDateTime,
  body.endDateTime
);

if (confirmedBookings.length > 0) {
  return NextResponse.json(
    { error: 'No puedes bloquear un intervalo con reservas confirmadas' },
    { status: 409 }
  );
}
```

**Criterio de aceptación:**
- ✅ Endpoints funcionan
- ✅ Validación de colisiones con reservas
- ✅ Tests pasan

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-007, TC-RF-CTR-AVAIL-008, TC-RF-CTR-AVAIL-009

---

### Task 5.4: Implementar endpoint de generación de slots

**Archivos a crear:**
- `apps/web/app/api/contractors/[contractorId]/availability/slots/route.ts` (GET)

**Contenido:**
```typescript
export async function GET(req: NextRequest, { params }: { params: { contractorId: string } }) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const serviceId = searchParams.get('serviceId');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate y endDate son requeridos' }, { status: 400 });
  }

  // Validar rango máximo (8 semanas)
  const diffWeeks = differenceInWeeks(parseISO(endDate), parseISO(startDate));
  if (diffWeeks > 8) {
    return NextResponse.json({ error: 'Rango máximo es 8 semanas' }, { status: 400 });
  }

  const slots = await slotGeneratorService.generateSlots(
    params.contractorId,
    startDate,
    endDate,
    serviceId
  );

  return NextResponse.json(slots);
}
```

**Tests:**
```typescript
describe('GET /api/contractors/:contractorId/availability/slots - TC-RF-CTR-AVAIL-010', () => {
  it('should generate slots', async () => {
    const res = await request(app)
      .get(`/api/contractors/${contractorId}/availability/slots?startDate=2025-11-20&endDate=2025-12-20`);

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });

  it('should reject range > 8 weeks', async () => {
    const res = await request(app)
      .get(`/api/contractors/${contractorId}/availability/slots?startDate=2025-11-20&endDate=2026-03-01`);

    expect(res.status).toBe(400);
  });
});
```

**Criterio de aceptación:**
- ✅ Endpoint retorna slots correctos
- ✅ Validación de rango máximo
- ✅ Filtrado por serviceId funciona
- ✅ Tests pasan

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-010, TC-RF-CTR-AVAIL-019

---

## Phase 6: Frontend UI

### Task 6.1: Crear componente AvailabilityManager (orquestador)

**Descripción:** Componente principal que orquesta las 3 vistas (reglas, excepciones, bloqueos).

**Archivos a crear:**
- `apps/web/src/components/contractors/availability/AvailabilityManager.tsx`
- `apps/web/src/components/contractors/availability/__tests__/AvailabilityManager.test.tsx`

**Contenido parcial:**
```tsx
'use client';

import { useState, useEffect } from 'react';
import { DashboardShell } from '../DashboardShell';
import { Card } from '@/components/ui/Card';
import { AvailabilityWeekly } from './AvailabilityWeekly';
import { AvailabilityExceptions } from './AvailabilityExceptions';
import { AvailabilityBlocks } from './AvailabilityBlocks';

export function AvailabilityManager() {
  const [weeklyRules, setWeeklyRules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAvailability();
  }, []);

  async function fetchAvailability() {
    try {
      setIsLoading(true);
      const [rulesRes, exceptionsRes, blocksRes] = await Promise.all([
        fetch('/api/contractors/me/availability/weekly'),
        fetch('/api/contractors/me/availability/exceptions'),
        fetch('/api/contractors/me/availability/blocks'),
      ]);

      setWeeklyRules(await rulesRes.json());
      setExceptions(await exceptionsRes.json());
      setBlocks(await blocksRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-800">{error}</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Gestionar Disponibilidad</h1>
        <p className="text-sm text-gray-600">Configura tus horarios de trabajo</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h3 className="font-semibold">Reglas Semanales</h3>
          <p className="text-2xl font-bold">{weeklyRules.length}</p>
        </Card>
        <Card>
          <h3 className="font-semibold">Excepciones</h3>
          <p className="text-2xl font-bold">{exceptions.length}</p>
        </Card>
        <Card>
          <h3 className="font-semibold">Bloqueos</h3>
          <p className="text-2xl font-bold">{blocks.length}</p>
        </Card>
      </div>

      <AvailabilityWeekly rules={weeklyRules} onUpdate={fetchAvailability} />
      <AvailabilityExceptions exceptions={exceptions} onUpdate={fetchAvailability} />
      <AvailabilityBlocks blocks={blocks} onUpdate={fetchAvailability} />
    </div>
  );
}
```

**Criterio de aceptación:**
- ✅ Componente renderiza sin errores
- ✅ Estados loading/error manejados
- ✅ Tests de render pasan

**Casos de prueba relacionados:** N/A (tests de componente)

---

### Task 6.2: Crear componente AvailabilityWeekly

**Descripción:** Vista semanal para crear/editar reglas por día.

**Archivos a crear:**
- `apps/web/src/components/contractors/availability/AvailabilityWeekly.tsx`
- `apps/web/src/components/contractors/availability/__tests__/AvailabilityWeekly.test.tsx`

**UI:**
```
┌─────────────────────────────────────┐
│ Horarios Semanales                  │
├─────────────────────────────────────┤
│ Lunes   [09:00 - 12:00] [Editar] [X]│
│         [14:00 - 18:00] [Editar] [X]│
│ Martes  Sin horarios   [+ Agregar]  │
│ ...                                  │
└─────────────────────────────────────┘
```

**Formulario (modal):**
```tsx
<form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
  <Input label="Día" type="select" {...register('dayOfWeek')}>
    <option value={1}>Lunes</option>
    <option value={2}>Martes</option>
    ...
  </Input>

  {fields.map((field, index) => (
    <div key={field.id} className="grid grid-cols-2 gap-4">
      <Input label="Hora inicio" type="time" {...register(`intervals.${index}.startTime`)} />
      <Input label="Hora fin" type="time" {...register(`intervals.${index}.endTime`)} />
      <button type="button" onClick={() => remove(index)}>Eliminar</button>
    </div>
  ))}

  <button type="button" onClick={() => append({ startTime: '', endTime: '' })}>
    + Agregar intervalo
  </button>

  <Button type="submit">Guardar</Button>
</form>
```

**Criterio de aceptación:**
- ✅ Formulario crea reglas correctamente
- ✅ Validación Zod en cliente
- ✅ Estados vacíos/loading/error
- ✅ Tests de render + interacción

**Casos de prueba relacionados:** N/A (tests E2E cubrirán flujo completo)

---

### Task 6.3: Crear componente AvailabilityExceptions

**Descripción:** Calendario mensual para agregar excepciones.

**Archivos a crear:**
- `apps/web/src/components/contractors/availability/AvailabilityExceptions.tsx`
- `apps/web/src/components/contractors/availability/__tests__/AvailabilityExceptions.test.tsx`

**Librería de calendario:**
```bash
npm install react-day-picker date-fns
```

**UI:**
```tsx
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export function AvailabilityExceptions({ exceptions, onUpdate }) {
  const [selectedDate, setSelectedDate] = useState(null);

  const exceptionDates = exceptions.map(e => new Date(e.date));

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4">Excepciones</h2>

      <DayPicker
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        modifiers={{ exception: exceptionDates }}
        modifiersStyles={{ exception: { backgroundColor: '#dbeafe', fontWeight: 'bold' } }}
      />

      {selectedDate && (
        <ExceptionModal date={selectedDate} onClose={() => setSelectedDate(null)} onUpdate={onUpdate} />
      )}
    </Card>
  );
}
```

**Criterio de aceptación:**
- ✅ Calendario muestra excepciones existentes
- ✅ Click en día abre modal para crear excepción
- ✅ ARIA labels en calendario
- ✅ Navegación por teclado (flechas)

**Casos de prueba relacionados:** TC-RNF-CTR-AVAIL-003 (a11y)

---

### Task 6.4: Crear componente AvailabilityBlocks

**Descripción:** Lista de bloqueos + formulario para crear nuevos.

**Archivos a crear:**
- `apps/web/src/components/contractors/availability/AvailabilityBlocks.tsx`
- `apps/web/src/components/contractors/availability/__tests__/AvailabilityBlocks.test.tsx`

**UI:**
```tsx
export function AvailabilityBlocks({ blocks, onUpdate }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4">Bloqueos</h2>

      {blocks.length === 0 ? (
        <div className="bg-gray-50 rounded p-4 text-center text-gray-600">
          No tienes bloqueos configurados
        </div>
      ) : (
        <ul className="space-y-2">
          {blocks.map(block => (
            <li key={block.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <p className="font-medium">{formatDateRange(block.startDateTime, block.endDateTime)}</p>
                {block.reason && <p className="text-sm text-gray-600">{block.reason}</p>}
              </div>
              <button onClick={() => handleDelete(block.id)} className="text-red-600">Eliminar</button>
            </li>
          ))}
        </ul>
      )}

      <BlockForm onSubmit={handleCreate} />
    </Card>
  );
}
```

**Criterio de aceptación:**
- ✅ Lista muestra bloqueos
- ✅ Formulario crea bloqueos
- ✅ Validación de colisiones con reservas (error 409)
- ✅ Estados vacíos

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-008 (colisión)

---

### Task 6.5: Crear página de disponibilidad

**Descripción:** Integrar componente en página Next.js.

**Archivos a crear:**
- `apps/web/app/contractors/availability/page.tsx`

**Contenido:**
```tsx
import { auth, currentUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/contractors/DashboardShell';
import { AvailabilityManager } from '@/components/contractors/availability/AvailabilityManager';

export default async function AvailabilityPage() {
  const { userId } = auth();
  if (!userId) redirect('/sign-in');

  const user = await currentUser();
  const profile = await contractorProfileRepository.findByUserId(userId);

  if (!profile) {
    return <div>No eres contratista</div>;
  }

  return (
    <DashboardShell user={user} profile={profile}>
      <AvailabilityManager />
    </DashboardShell>
  );
}
```

**Criterio de aceptación:**
- ✅ Página accesible en `/contractors/availability`
- ✅ Solo CONTRACTOR puede acceder
- ✅ Layout correcto (DashboardShell)

**Casos de prueba relacionados:** N/A (tests E2E cubrirán navegación)

---

## Phase 7: Testing & QA

### Task 7.1: Escribir tests E2E con Playwright

**Descripción:** Flujo completo de gestión de disponibilidad.

**Archivos a crear:**
- `apps/web/tests/e2e/contractor-availability.spec.ts`

**Contenido:**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Contractor Availability - TC-RF-CTR-AVAIL-001 a 020', () => {
  test.beforeEach(async ({ page }) => {
    // Login como CONTRACTOR
    await page.goto('/sign-in');
    await page.fill('[name="email"]', 'contractor@test.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/contractors/dashboard');
  });

  test('should create weekly rule', async ({ page }) => {
    await page.goto('/contractors/availability');

    // Click en "+ Agregar" para Lunes
    await page.click('text=Lunes >> button:has-text("Agregar")');

    // Llenar formulario
    await page.fill('[name="intervals.0.startTime"]', '09:00');
    await page.fill('[name="intervals.0.endTime"]', '17:00');
    await page.click('button:has-text("Guardar")');

    // Verificar que aparece en la lista
    await expect(page.locator('text=Lunes >> text=09:00 - 17:00')).toBeVisible();
  });

  test('should show validation error for overlapping intervals', async ({ page }) => {
    await page.goto('/contractors/availability');

    await page.click('text=Lunes >> button:has-text("Agregar")');
    await page.fill('[name="intervals.0.startTime"]', '09:00');
    await page.fill('[name="intervals.0.endTime"]', '13:00');

    await page.click('button:has-text("+ Agregar intervalo")');
    await page.fill('[name="intervals.1.startTime"]', '12:00');
    await page.fill('[name="intervals.1.endTime"]', '18:00');

    await page.click('button:has-text("Guardar")');

    // Verificar error
    await expect(page.locator('text=no deben traslaparse')).toBeVisible();
  });

  // ... más tests
});
```

**Criterio de aceptación:**
- ✅ Flujo completo funciona (crear/editar/eliminar)
- ✅ Validaciones se muestran
- ✅ Tests pasan en CI

**Casos de prueba relacionados:** TC-RF-CTR-AVAIL-001 a 020

---

### Task 7.2: Escribir tests de accesibilidad con axe-core

**Descripción:** Verificar WCAG 2.1 AA compliance.

**Archivos a crear:**
- `apps/web/tests/e2e/contractor-availability-a11y.spec.ts`

**Contenido:**
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Availability A11y - TC-RNF-CTR-AVAIL-003, 004', () => {
  test('should have no accessibility violations', async ({ page }) => {
    await page.goto('/contractors/availability');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('should navigate with keyboard', async ({ page }) => {
    await page.goto('/contractors/availability');

    // Tab hasta botón "Agregar"
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // ...

    // Enter para abrir modal
    await page.keyboard.press('Enter');

    // Verificar que modal está abierto
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Escape para cerrar
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});
```

**Criterio de aceptación:**
- ✅ 0 violaciones axe-core
- ✅ Navegación por teclado completa
- ✅ Focus rings visibles

**Casos de prueba relacionados:** TC-RNF-CTR-AVAIL-003, TC-RNF-CTR-AVAIL-004

---

### Task 7.3: Escribir tests de performance con k6

**Descripción:** Validar P95 ≤ 800ms para generación de slots.

**Archivos a crear:**
- `apps/web/tests/performance/availability-slot-generation.js`

**(Ver contenido en proposal.md, sección "Testing Plan")**

**Ejecutar:**
```bash
k6 run tests/performance/availability-slot-generation.js
```

**Criterio de aceptación:**
- ✅ P95 ≤ 800ms
- ✅ P99 ≤ 1200ms
- ✅ Error rate < 1%

**Casos de prueba relacionados:** TC-RNF-CTR-AVAIL-001

---

### Task 7.4: Actualizar STP con resultados de ejecución

**Descripción:** Documentar resultados de tests en `/docs/md/STP-ReparaYa.md`.

**Pasos:**
1. Ejecutar todos los tests (unitarios, integración, E2E, performance, a11y)
2. Recopilar resultados (pass/fail, cobertura, métricas)
3. Actualizar tabla de casos de prueba en STP con columna "Estado" y "Resultado"

**Formato:**
```markdown
| ID | Descripción | Tipo | Estado | Resultado |
|----|-------------|------|--------|-----------|
| TC-RF-CTR-AVAIL-001 | Crear horario semanal | Integración | ✅ PASS | 201 Created, rule.id definido |
| TC-RF-CTR-AVAIL-002 | Rechazar intervalos superpuestos | Unitaria | ✅ PASS | Error "no deben traslaparse" |
| ... | ... | ... | ... | ... |
```

**Criterio de aceptación:**
- ✅ STP actualizado con 25 casos
- ✅ Todos los casos marcados como PASS
- ✅ Métricas de cobertura documentadas

**Casos de prueba relacionados:** Todos (25)

---

## Phase 8: Documentation & Handoff

### Task 8.1: Documentar API en README

**Descripción:** Crear documentación de endpoints para desarrolladores.

**Archivos a crear:**
- `apps/web/src/modules/contractors/availability/README.md`

**Contenido:**
```markdown
# Contractor Availability Module

## Endpoints

### Weekly Rules

**Create Weekly Rule**
```
POST /api/contractors/me/availability/weekly
Authorization: Bearer {token} (CONTRACTOR)

Body:
{
  "dayOfWeek": 1,
  "intervals": [
    { "startTime": "09:00", "endTime": "12:00" }
  ]
}

Response: 201
{
  "id": "uuid",
  "dayOfWeek": 1,
  "intervals": [...],
  "enabled": true,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

... (documentar todos los endpoints)

## Usage Examples

**Generate Slots for a Contractor**
```typescript
const slots = await fetch(`/api/contractors/${contractorId}/availability/slots?startDate=2025-11-20&endDate=2025-12-20`);
```

## Error Handling

- 400: Validación falla
- 401: No autenticado
- 403: No autorizado (ownership o rol)
- 409: Conflicto (duplicado, colisión con reserva)
```

**Criterio de aceptación:**
- ✅ Todos los endpoints documentados
- ✅ Ejemplos de uso incluidos
- ✅ Errores documentados

**Casos de prueba relacionados:** N/A (documentación)

---

### Task 8.2: Crear notas de handoff para módulos relacionados

**Descripción:** Documentar cómo integrar con `services` y `booking`.

**Archivos a crear:**
- `openspec/changes/2025-11-20-contractor-availability/HANDOFF.md`

**Contenido:**
```markdown
# Handoff Notes: Contractor Availability

## Integración con Módulo `services`

Cuando implementes el módulo de servicios:

1. Asegúrate de que cada servicio tiene `durationMinutes` configurado
2. Al generar slots, usa el query param `serviceId` para filtrar slots compatibles
3. Ejemplo:
   ```typescript
   const slots = await availabilityService.generateSlots(
     contractorId,
     '2025-11-20',
     '2025-12-20',
     serviceId // <- pasar aquí
   );
   ```

## Integración con Módulo `booking`

Cuando implementes reservas:

1. Antes de crear reserva, valida disponibilidad:
   ```typescript
   const isAvailable = await availabilityService.isAvailableOnDateTime(
     contractorId,
     date,
     startTime,
     endTime
   );
   if (!isAvailable) throw new Error('Slot no disponible');
   ```

2. Exponer método `getConfirmedBookingsByContractor` para que availability lo use:
   ```typescript
   export const bookingService = {
     async getConfirmedBookingsByContractor(
       contractorId: string,
       startDateTime: string,
       endDateTime: string
     ): Promise<Booking[]> {
       return prisma.booking.findMany({
         where: {
           contractorId,
           status: 'CONFIRMED',
           scheduledStart: { gte: startDateTime },
           scheduledEnd: { lte: endDateTime },
         },
       });
     },
   };
   ```

## Dependencias

- Prisma modelos: `ContractorWeeklyRule`, `ContractorAvailabilityException`, `ContractorAvailabilityBlock`
- NPM: `date-fns`, `date-fns-tz`
- `ContractorServiceLocation.timezone` debe estar configurado
```

**Criterio de aceptación:**
- ✅ Notas claras y específicas
- ✅ Ejemplos de código incluidos

**Casos de prueba relacionados:** N/A (documentación)

---

## Checklist Final

**Antes de archivar (`/openspec:archive`):**

- [ ] Todos los 25 casos de prueba pasan
- [ ] Cobertura ≥ 70% en `src/modules/contractors/availability/`
- [ ] Performance P95 ≤ 800ms (k6)
- [ ] Accesibilidad 0 violaciones (axe-core)
- [ ] Responsive tests pasan (375px, 768px, 1024px)
- [ ] CI/CD en verde (GitHub Actions)
- [ ] STP actualizado con resultados
- [ ] PR mergeado a `dev`
- [ ] Build sin errores (`npm run build`)
- [ ] Type-check sin errores (`npm run type-check`)
- [ ] Lint sin errores (`npm run lint`)

---

**Total de tareas:** 30+
**Estimación:** 3-4 sprints (académico, sin presión de tiempo)
**Prioridad:** Alta (feature core para contratistas)

---

**Versión:** 1.0
**Fecha:** 2025-11-20
**Autor:** Claude Code (asistente de desarrollo)
