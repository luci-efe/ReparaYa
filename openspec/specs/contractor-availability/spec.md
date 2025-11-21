# Contractor Availability Specification

## Overview

### Purpose

Este módulo permite a los contratistas gestionar su disponibilidad de horarios mediante:

- **Reglas semanales recurrentes**: Definir horarios base por día de la semana (lunes-domingo)
- **Excepciones puntuales**: Sobrescribir la regla semanal para fechas específicas (feriados, días especiales)
- **Bloqueos manuales**: Marcar intervalos como no disponibles (vacaciones, mantenimiento de equipo)
- **Motor de generación de slots**: Combinar reglas + excepciones + bloqueos para producir slots disponibles consultables

### Scope

**In Scope:**
- CRUD de reglas semanales (por día de la semana)
- CRUD de excepciones por fecha
- CRUD de bloqueos manuales (intervalos de tiempo)
- Motor de combinación que genera slots disponibles finales
- Normalización de zona horaria (IANA → UTC para persistencia)
- Validación de intervalos (no traslapes, rangos válidos, compatibilidad con duración de servicios)
- UI para gestionar disponibilidad (vista semanal, calendario mensual, formularios accesibles)
- Permisos: solo CONTRACTOR dueño; ADMIN puede consultar

**Out of Scope (para versiones futuras):**
- Sincronización con calendarios externos (Google Calendar, Outlook)
- Sugerencias inteligentes de horarios (ML)
- Disponibilidad específica por servicio (v1 es a nivel de contratista)
- Notificaciones push cuando se crea/edita disponibilidad

### Dependencies

**Backend:**
- `auth`: Verificación de rol `CONTRACTOR` y ownership
- `contractors`: `ContractorProfile` (relación 1:1 con reglas/excepciones/bloqueos)
- `services`: Duración de servicios para validar compatibilidad de slots
- `booking`: Lectura de reservas confirmadas para evitar colisiones

**Frontend:**
- `DashboardShell` (layout de contratistas)
- Componentes UI: `Card`, `Button`, `Input`, formularios con `react-hook-form` + `Zod`
- Librerías de calendario: `date-fns` o `dayjs` (para manipulación de fechas/TZ)

**External:**
- Zona horaria IANA del contratista (desde `ContractorServiceLocation.timezone`)
- UTC como estándar de persistencia

---

## Requirements

### Functional Requirements

#### RF-CTR-AVAIL-001: Gestión de Horarios Semanales

**Descripción:**
El contratista puede crear, actualizar, listar y eliminar reglas semanales que definen su disponibilidad recurrente por día de la semana.

**Criterios de aceptación:**
- ✅ Crear regla semanal: `POST /api/contractors/me/availability/weekly`
  - Payload: `{ dayOfWeek: 0-6, intervals: [{ startTime: "HH:MM", endTime: "HH:MM" }] }`
  - Validación:
    - `dayOfWeek` ∈ [0, 6] (0=domingo, 1=lunes, ..., 6=sábado)
    - `startTime < endTime`
    - Intervalos no se traslapan entre sí para el mismo día
    - Formato de tiempo: HH:MM (24 horas)
  - Respuesta: 201 con regla creada (ID, dayOfWeek, intervals, createdAt, updatedAt)
- ✅ Listar reglas semanales: `GET /api/contractors/me/availability/weekly`
  - Respuesta: 200 con array de reglas (agrupadas por día)
- ✅ Actualizar regla semanal: `PATCH /api/contractors/me/availability/weekly/:ruleId`
  - Payload: `{ intervals: [...] }`
  - Validación: misma que crear
  - Respuesta: 200 con regla actualizada
- ✅ Eliminar regla semanal: `DELETE /api/contractors/me/availability/weekly/:ruleId`
  - Respuesta: 204 (no content)
- ✅ Solo el contratista dueño puede modificar sus reglas
- ✅ ADMIN puede leer (no modificar) para auditoría

**Casos de prueba relacionados:**
TC-RF-CTR-AVAIL-001, TC-RF-CTR-AVAIL-002, TC-RF-CTR-AVAIL-003

---

#### RF-CTR-AVAIL-002: Gestión de Excepciones

**Descripción:**
El contratista puede definir excepciones a la regla semanal para fechas específicas (ej: "El 16 de septiembre estoy disponible de 10-14h en vez de mi horario habitual").

**Criterios de aceptación:**
- ✅ Crear excepción: `POST /api/contractors/me/availability/exceptions`
  - Payload: `{ date: "YYYY-MM-DD", intervals: [{ startTime: "HH:MM", endTime: "HH:MM" }], type: "AVAILABLE" | "BLOCKED" }`
  - Validación:
    - `date` es fecha futura o presente
    - Intervalos válidos (startTime < endTime, no traslapes)
    - `type` indica si la excepción agrega disponibilidad o bloquea
  - Respuesta: 201 con excepción creada
- ✅ Listar excepciones: `GET /api/contractors/me/availability/exceptions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - Query params opcionales para filtrar rango de fechas
  - Respuesta: 200 con array de excepciones
- ✅ Actualizar excepción: `PATCH /api/contractors/me/availability/exceptions/:exceptionId`
  - Payload: `{ intervals: [...], type: "..." }`
  - Respuesta: 200 con excepción actualizada
- ✅ Eliminar excepción: `DELETE /api/contractors/me/availability/exceptions/:exceptionId`
  - Respuesta: 204
- ✅ Permisos: solo dueño modifica; ADMIN lee

**Casos de prueba relacionados:**
TC-RF-CTR-AVAIL-004, TC-RF-CTR-AVAIL-005, TC-RF-CTR-AVAIL-006

---

#### RF-CTR-AVAIL-003: Gestión de Bloqueos Manuales

**Descripción:**
El contratista puede crear bloqueos ad-hoc para intervalos de tiempo específicos (ej: "Vacaciones del 20-25 dic", "Mantenimiento de equipo 10-12h del 5 nov").

**Criterios de aceptación:**
- ✅ Crear bloqueo: `POST /api/contractors/me/availability/blocks`
  - Payload: `{ startDateTime: "ISO8601", endDateTime: "ISO8601", reason?: string }`
  - Validación:
    - `startDateTime < endDateTime`
    - Fechas futuras o presentes
    - No se permite bloquear intervalos con reservas CONFIRMADAS (validar vs `booking`)
  - Respuesta: 201 con bloqueo creado
- ✅ Listar bloqueos: `GET /api/contractors/me/availability/blocks?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - Respuesta: 200 con array de bloqueos
- ✅ Eliminar bloqueo: `DELETE /api/contractors/me/availability/blocks/:blockId`
  - Respuesta: 204
- ✅ Validación de colisiones con reservas:
  - Si el intervalo del bloqueo cubre una reserva CONFIRMADA → error 400 con mensaje descriptivo
  - Se permite bloquear sobre reservas PENDING_PAYMENT o CANCELLED
- ✅ Permisos: solo dueño crea/elimina; ADMIN lee

**Casos de prueba relacionados:**
TC-RF-CTR-AVAIL-007, TC-RF-CTR-AVAIL-008, TC-RF-CTR-AVAIL-009

---

#### RF-CTR-AVAIL-004: Generación de Slots Disponibles

**Descripción:**
Motor de combinación que produce slots disponibles finales para un contratista en un rango de fechas, aplicando: reglas semanales → excepciones → bloqueos → reservas confirmadas.

**Criterios de aceptación:**
- ✅ Endpoint: `GET /api/contractors/:contractorId/availability/slots?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&serviceId=UUID`
  - Query params:
    - `startDate`, `endDate` (obligatorios, máximo 8 semanas de rango)
    - `serviceId` (opcional): si se provee, filtra slots compatibles con la duración del servicio
  - Respuesta: 200 con array de slots:
    ```json
    [
      {
        "date": "2025-11-21",
        "startTime": "09:00",
        "endTime": "12:00",
        "durationMinutes": 180,
        "timezone": "America/Mexico_City"
      }
    ]
    ```
- ✅ Algoritmo de combinación:
  1. Para cada día en `[startDate, endDate]`:
     - Obtener `dayOfWeek` del día
     - Buscar regla semanal para ese `dayOfWeek`
     - Si hay excepción para esa fecha exacta, usar intervalos de la excepción (sobrescribe regla semanal)
     - Si no hay regla ni excepción → día sin disponibilidad
  2. Restar bloqueos manuales que se intersecten con intervalos del día
  3. Restar reservas CONFIRMADAS que se intersecten
  4. Retornar slots resultantes
- ✅ Normalización de zona horaria:
  - Entrada: fechas/horas en TZ del contratista (desde `ContractorServiceLocation.timezone`)
  - Salida: slots en TZ del contratista (para UI)
  - Persistencia interna: UTC (para cálculos consistentes)
- ✅ Performance:
  - Limitar rango máximo a 8 semanas (~56 días) para evitar carga excesiva
  - Índices en BD para búsquedas rápidas (ver Data Model)
  - P95 ≤ 800ms para generación de slots (ver RNF-CTR-AVAIL-001)
- ✅ Acceso público: lectura de slots es pública (clientes necesitan ver disponibilidad)

**Casos de prueba relacionados:**
TC-RF-CTR-AVAIL-010, TC-RF-CTR-AVAIL-011, TC-RF-CTR-AVAIL-012, TC-RF-CTR-AVAIL-013

---

#### RF-CTR-AVAIL-005: Conversiones de Zona Horaria

**Descripción:**
Todas las operaciones de disponibilidad deben normalizar correctamente entre la zona horaria del contratista (IANA) y UTC.

**Criterios de aceptación:**
- ✅ Al crear/actualizar reglas/excepciones/bloqueos:
  - Input: tiempos en TZ del contratista
  - Persistencia: conversión a UTC
  - Output: conversión de vuelta a TZ del contratista
- ✅ Manejo de DST (Daylight Saving Time):
  - Usar librerías robustas (`date-fns-tz` o `dayjs` con plugin timezone)
  - Ajustar correctamente transiciones DST (ej: horario de verano México)
- ✅ Validación de TZ:
  - Verificar que `ContractorServiceLocation.timezone` sea válido (IANA format)
  - Si no está configurado → error 400 al intentar crear disponibilidad
- ✅ Documentación clara en API:
  - Todos los endpoints especifican en qué TZ esperan/retornan datos
  - Ejemplo: "startTime is in contractor's local timezone (IANA)"

**Casos de prueba relacionados:**
TC-RF-CTR-AVAIL-014, TC-RF-CTR-AVAIL-015

---

#### RF-CTR-AVAIL-006: Autorización y Acceso

**Descripción:**
Control de permisos para gestión y lectura de disponibilidad.

**Criterios de aceptación:**
- ✅ **CONTRACTOR (dueño)**:
  - CRUD completo de sus propias reglas/excepciones/bloqueos
  - Lectura de sus propios slots
- ✅ **CLIENT / público**:
  - Solo lectura de slots disponibles (vía `GET /api/contractors/:contractorId/availability/slots`)
  - No acceso a CRUD de reglas/excepciones/bloqueos
- ✅ **ADMIN**:
  - Lectura de reglas/excepciones/bloqueos de cualquier contratista (auditoría)
  - No modificación (para evitar conflictos con ownership)
- ✅ Validación en service layer:
  - Verificar `user.role === 'CONTRACTOR'` para operaciones de escritura
  - Verificar `contractorProfile.userId === user.id` (ownership)
  - Retornar 403 si falla autorización

**Casos de prueba relacionados:**
TC-RF-CTR-AVAIL-016, TC-RF-CTR-AVAIL-017, TC-RF-CTR-AVAIL-018

---

#### RF-CTR-AVAIL-007: Compatibilidad con Duración de Servicios

**Descripción:**
Validar que los slots generados sean compatibles con la duración de los servicios del contratista.

**Criterios de aceptación:**
- ✅ Cada servicio tiene un campo `durationMinutes` (ej: 60, 120, 180)
- ✅ Al crear reglas semanales:
  - Validación opcional: advertir si intervalos < duración de algún servicio del contratista
  - No bloquear creación (puede tener servicios de diferentes duraciones)
- ✅ Al generar slots:
  - Si `serviceId` está en query params:
    - Obtener `durationMinutes` del servicio
    - Filtrar solo slots con `durationMinutes >= service.durationMinutes`
  - Si `serviceId` no está:
    - Retornar todos los slots disponibles
- ✅ UI: mostrar warning si se crea regla con intervalo muy corto (< 30 min)

**Casos de prueba relacionados:**
TC-RF-CTR-AVAIL-019, TC-RF-CTR-AVAIL-020

---

### Non-Functional Requirements

#### RNF-CTR-AVAIL-001: Performance

**Descripción:**
El sistema debe generar slots disponibles con latencia aceptable para UX fluida.

**Criterios de aceptación:**
- ✅ **P95 ≤ 800ms** para `GET /api/contractors/:contractorId/availability/slots`
  - Rango de prueba: 8 semanas (56 días)
  - Datos de prueba: 100 reglas semanales, 50 excepciones, 20 bloqueos, 30 reservas
- ✅ **P99 ≤ 1200ms** para mismo endpoint
- ✅ Optimizaciones:
  - Índices en BD: `(contractorProfileId, dayOfWeek)`, `(contractorProfileId, date)`
  - Limitar rango máximo a 8 semanas
  - Evitar N+1 queries (usar `Prisma.include` estratégicamente)
- ✅ Tests de performance: k6 script con 100 VU durante 60s

**Casos de prueba relacionados:**
TC-RNF-CTR-AVAIL-001

---

#### RNF-CTR-AVAIL-002: Concurrencia y Consistencia

**Descripción:**
Evitar race conditions cuando múltiples operaciones modifican disponibilidad o reservas simultáneamente.

**Criterios de aceptación:**
- ✅ **Transacciones atómicas**:
  - Crear bloqueo + validar reservas confirmadas → en transacción Prisma
  - Evitar que dos clientes reserven el mismo slot simultáneamente (esto es más crítico en módulo `booking`)
- ✅ **Validación idempotente**:
  - Si se intenta crear regla duplicada (mismo día, mismos intervalos) → error 409
  - Si se intenta crear excepción duplicada (misma fecha) → error 409 o merge inteligente (a definir)
- ✅ **Lock optimista (futuro)**:
  - Para v1: validaciones síncronas en transacción son suficientes
  - Para v2: considerar versioning con `updatedAt` + `version` field

**Casos de prueba relacionados:**
TC-RNF-CTR-AVAIL-002

---

#### RNF-CTR-AVAIL-003: Accesibilidad (A11y)

**Descripción:**
La UI de gestión de disponibilidad debe ser completamente accesible según WCAG 2.1 AA.

**Criterios de aceptación:**
- ✅ **Navegación por teclado**:
  - Tab order natural en formularios (reglas → excepciones → bloqueos)
  - Escape cierra modales
  - Enter/Space activa botones
  - Flechas navegan en calendario
- ✅ **ARIA labels completos**:
  - `aria-label` en botones de calendario (ej: "Día 21 de noviembre")
  - `aria-current="date"` en día seleccionado
  - `aria-invalid` en inputs con errores
  - `aria-describedby` para mensajes de error
  - `role="alert"` en mensajes de validación
- ✅ **Lector de pantalla**:
  - Anuncios cuando se crea/elimina regla
  - Estados de carga audibles ("Cargando disponibilidad...")
- ✅ **Focus rings visibles**:
  - `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2` en todos los elementos interactivos
- ✅ **Contraste de color**:
  - Ratio ≥ 4.5:1 para texto normal
  - Ratio ≥ 3:1 para UI components
- ✅ **Tests**:
  - Playwright + axe-core en TC-RNF-CTR-AVAIL-003 y 004
  - 0 violaciones de accesibilidad

**Casos de prueba relacionados:**
TC-RNF-CTR-AVAIL-003, TC-RNF-CTR-AVAIL-004

---

#### RNF-CTR-AVAIL-004: Responsiveness

**Descripción:**
La UI debe ser completamente funcional en dispositivos móviles y desktop.

**Criterios de aceptación:**
- ✅ **Mobile-first design**:
  - Viewport mínimo: 375px (iPhone SE)
  - Breakpoints: sm (640px), md (768px), lg (1024px)
- ✅ **Componentes adaptativos**:
  - Calendario: vista semanal en mobile, mensual en desktop
  - Formularios: inputs full-width en mobile, grid 2-col en desktop
  - Sidebar: overlay en mobile, fixed en desktop
- ✅ **Touch targets**:
  - Botones ≥ 44x44px (guía iOS/Android)
  - Espaciado suficiente entre elementos táctiles
- ✅ **Tests**:
  - Playwright con viewports: 375px, 768px, 1024px, 1920px
  - Verificar que todos los elementos sean clicables/tocables

**Casos de prueba relacionados:**
TC-RNF-CTR-AVAIL-005

---

## Data Model

### Database Schema

#### ContractorWeeklyRule

**Propósito:** Almacenar reglas de disponibilidad recurrente por día de la semana.

```prisma
model ContractorWeeklyRule {
  id                    String   @id @default(uuid())
  contractorProfileId   String
  dayOfWeek             Int      @db.SmallInt // 0=Sunday, 1=Monday, ..., 6=Saturday
  intervals             Json     // [{ startTime: "09:00", endTime: "12:00" }, ...]
  enabled               Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  contractorProfile     ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)

  @@index([contractorProfileId, dayOfWeek])
  @@map("contractor_weekly_rules")
}
```

**Campos:**
- `dayOfWeek`: 0-6 (0=domingo según estándar JS Date)
- `intervals`: JSON array de objetos `{ startTime: "HH:MM", endTime: "HH:MM" }`
  - **Nota:** Se almacena en JSON para permitir múltiples intervalos por día (ej: 9-12h y 14-18h)
- `enabled`: flag para desactivar temporalmente sin eliminar

**Índices:**
- `(contractorProfileId, dayOfWeek)`: búsqueda rápida de reglas por día

---

#### ContractorAvailabilityException

**Propósito:** Sobrescribir la regla semanal para fechas específicas.

```prisma
model ContractorAvailabilityException {
  id                    String   @id @default(uuid())
  contractorProfileId   String
  date                  DateTime @db.Date
  intervals             Json     // [{ startTime: "HH:MM", endTime: "HH:MM" }, ...]
  type                  String   // "AVAILABLE" | "BLOCKED"
  reason                String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  contractorProfile     ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)

  @@unique([contractorProfileId, date])
  @@index([contractorProfileId, date])
  @@map("contractor_availability_exceptions")
}
```

**Campos:**
- `date`: fecha exacta (YYYY-MM-DD)
- `type`:
  - `"AVAILABLE"`: excepción que agrega disponibilidad (sobrescribe regla semanal)
  - `"BLOCKED"`: excepción que bloquea el día completo (ej: feriado)
- `reason`: opcional, para documentar (ej: "Día de la Independencia")

**Constraints:**
- `@@unique([contractorProfileId, date])`: máximo 1 excepción por día

---

#### ContractorAvailabilityBlock

**Propósito:** Bloqueos ad-hoc para intervalos de tiempo específicos.

```prisma
model ContractorAvailabilityBlock {
  id                    String   @id @default(uuid())
  contractorProfileId   String
  startDateTime         DateTime
  endDateTime           DateTime
  reason                String?  // "Vacation", "Equipment maintenance", etc.
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  contractorProfile     ContractorProfile @relation(fields: [contractorProfileId], references: [id], onDelete: Cascade)

  @@index([contractorProfileId, startDateTime, endDateTime])
  @@map("contractor_availability_blocks")
}
```

**Campos:**
- `startDateTime`, `endDateTime`: ISO8601 (con TZ → convertir a UTC al persistir)
- `reason`: opcional, texto libre

**Índices:**
- `(contractorProfileId, startDateTime, endDateTime)`: detección de solapamientos

---

#### Relación con ContractorProfile

```prisma
model ContractorProfile {
  // ... campos existentes ...

  weeklyRules             ContractorWeeklyRule[]
  availabilityExceptions  ContractorAvailabilityException[]
  availabilityBlocks      ContractorAvailabilityBlock[]
}
```

---

### DTOs and Types

#### WeeklyRuleDTO

```typescript
// Entrada
export interface CreateWeeklyRuleDTO {
  dayOfWeek: number; // 0-6
  intervals: TimeInterval[];
}

export interface TimeInterval {
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
}

// Respuesta
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

---

#### AvailabilityExceptionDTO

```typescript
// Entrada
export interface CreateExceptionDTO {
  date: string; // "YYYY-MM-DD"
  intervals: TimeInterval[];
  type: 'AVAILABLE' | 'BLOCKED';
  reason?: string;
}

// Respuesta
export interface ExceptionResponseDTO {
  id: string;
  contractorProfileId: string;
  date: string;
  intervals: TimeInterval[];
  type: 'AVAILABLE' | 'BLOCKED';
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

#### AvailabilityBlockDTO

```typescript
// Entrada
export interface CreateBlockDTO {
  startDateTime: string; // ISO8601
  endDateTime: string;   // ISO8601
  reason?: string;
}

// Respuesta
export interface BlockResponseDTO {
  id: string;
  contractorProfileId: string;
  startDateTime: string;
  endDateTime: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

#### AvailableSlotDTO

```typescript
// Respuesta del motor de generación
export interface AvailableSlotDTO {
  date: string;           // "YYYY-MM-DD"
  startTime: string;      // "HH:MM" (en TZ del contratista)
  endTime: string;        // "HH:MM"
  durationMinutes: number;
  timezone: string;       // "America/Mexico_City" (IANA)
}
```

---

## API Contracts

### Reglas Semanales

#### `POST /api/contractors/me/availability/weekly`

**Auth:** Requiere `CONTRACTOR`, ownership implícito (usa userId del token)

**Request:**
```json
{
  "dayOfWeek": 1,
  "intervals": [
    { "startTime": "09:00", "endTime": "12:00" },
    { "startTime": "14:00", "endTime": "18:00" }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "contractorProfileId": "uuid",
  "dayOfWeek": 1,
  "intervals": [...],
  "enabled": true,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Errors:**
- `400`: Validación falla (intervalos inválidos, traslapes, formato)
- `401`: No autenticado
- `403`: No es CONTRACTOR o no es dueño
- `409`: Ya existe regla para ese día (si se decide permitir solo 1 por día)

---

#### `GET /api/contractors/me/availability/weekly`

**Auth:** Requiere `CONTRACTOR`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "dayOfWeek": 1,
    "intervals": [...],
    "enabled": true,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
]
```

---

#### `PATCH /api/contractors/me/availability/weekly/:ruleId`

**Auth:** Requiere `CONTRACTOR`, ownership

**Request:**
```json
{
  "intervals": [
    { "startTime": "10:00", "endTime": "14:00" }
  ],
  "enabled": true
}
```

**Response:** `200 OK` (regla actualizada)

**Errors:**
- `400`: Validación falla
- `404`: Regla no encontrada
- `403`: No es dueño

---

#### `DELETE /api/contractors/me/availability/weekly/:ruleId`

**Auth:** Requiere `CONTRACTOR`, ownership

**Response:** `204 No Content`

**Errors:**
- `404`: Regla no encontrada
- `403`: No es dueño

---

### Excepciones

#### `POST /api/contractors/me/availability/exceptions`

**Auth:** Requiere `CONTRACTOR`

**Request:**
```json
{
  "date": "2025-11-25",
  "intervals": [{ "startTime": "10:00", "endTime": "14:00" }],
  "type": "AVAILABLE",
  "reason": "Día especial"
}
```

**Response:** `201 Created` (excepción creada)

**Errors:**
- `400`: Validación falla
- `409`: Ya existe excepción para esa fecha

---

#### `GET /api/contractors/me/availability/exceptions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Auth:** Requiere `CONTRACTOR`

**Query Params:**
- `startDate` (opcional): filtrar desde fecha
- `endDate` (opcional): filtrar hasta fecha

**Response:** `200 OK` (array de excepciones)

---

#### `PATCH /api/contractors/me/availability/exceptions/:exceptionId`

**Auth:** Requiere `CONTRACTOR`, ownership

**Request:** (campos a actualizar)
```json
{
  "intervals": [...],
  "type": "BLOCKED"
}
```

**Response:** `200 OK`

---

#### `DELETE /api/contractors/me/availability/exceptions/:exceptionId`

**Auth:** Requiere `CONTRACTOR`, ownership

**Response:** `204 No Content`

---

### Bloqueos

#### `POST /api/contractors/me/availability/blocks`

**Auth:** Requiere `CONTRACTOR`

**Request:**
```json
{
  "startDateTime": "2025-11-20T09:00:00-06:00",
  "endDateTime": "2025-11-20T12:00:00-06:00",
  "reason": "Mantenimiento de equipo"
}
```

**Response:** `201 Created`

**Errors:**
- `400`: Validación falla (intervalo inválido, colisión con reserva confirmada)
- `409`: Colisión con reserva confirmada

---

#### `GET /api/contractors/me/availability/blocks?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

**Auth:** Requiere `CONTRACTOR`

**Response:** `200 OK` (array de bloqueos)

---

#### `DELETE /api/contractors/me/availability/blocks/:blockId`

**Auth:** Requiere `CONTRACTOR`, ownership

**Response:** `204 No Content`

---

### Generación de Slots

#### `GET /api/contractors/:contractorId/availability/slots?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&serviceId=UUID`

**Auth:** Público (lectura)

**Query Params:**
- `startDate` (requerido): inicio del rango
- `endDate` (requerido): fin del rango (máximo 8 semanas desde startDate)
- `serviceId` (opcional): filtrar slots compatibles con duración del servicio

**Response:** `200 OK`
```json
[
  {
    "date": "2025-11-21",
    "startTime": "09:00",
    "endTime": "12:00",
    "durationMinutes": 180,
    "timezone": "America/Mexico_City"
  }
]
```

**Errors:**
- `400`: Rango de fechas inválido (> 8 semanas)
- `404`: Contratista no encontrado

---

## Algorithm: Slot Generation

### Pseudocódigo

```
FUNCTION generateSlots(contractorId, startDate, endDate, serviceId?):
  // 1. Obtener datos base
  contractor = obtener ContractorProfile con ContractorServiceLocation
  timezone = contractor.location.timezone (ej: "America/Mexico_City")

  IF NOT timezone:
    THROW Error("Contratista no tiene timezone configurado")

  // 2. Obtener reglas, excepciones, bloqueos
  weeklyRules = obtener WeeklyRules WHERE contractorProfileId = contractorId
  exceptions = obtener Exceptions WHERE contractorProfileId = contractorId AND date IN [startDate, endDate]
  blocks = obtener Blocks WHERE contractorProfileId = contractorId AND [startDateTime, endDateTime] INTERSECTS [startDate, endDate]
  bookings = obtener Bookings WHERE contractorId = contractorId AND status = CONFIRMED AND [scheduledStart, scheduledEnd] INTERSECTS [startDate, endDate]

  // 3. Para cada día en el rango
  slots = []
  FOR EACH day IN [startDate, endDate]:
    dayOfWeek = obtener día de la semana (0-6) de day

    // 3a. Obtener intervalos base
    intervals = []
    exception = buscar excepción para day exacto

    IF exception:
      IF exception.type == "BLOCKED":
        CONTINUE // saltar día completo
      ELSE:
        intervals = exception.intervals
    ELSE:
      rule = buscar WeeklyRule WHERE dayOfWeek = dayOfWeek
      IF rule AND rule.enabled:
        intervals = rule.intervals
      ELSE:
        CONTINUE // sin disponibilidad

    // 3b. Restar bloqueos que intersecten con este día
    FOR EACH block IN blocks:
      IF block intersecta con day:
        intervals = restar block de intervals

    // 3c. Restar reservas confirmadas
    FOR EACH booking IN bookings:
      IF booking intersecta con day:
        intervals = restar booking de intervals

    // 3d. Filtrar por duración de servicio (si aplica)
    IF serviceId:
      service = obtener Service WHERE id = serviceId
      intervals = filtrar intervals WHERE (endTime - startTime) >= service.durationMinutes

    // 3e. Agregar slots resultantes
    FOR EACH interval IN intervals:
      slots.push({
        date: day,
        startTime: interval.startTime (en timezone),
        endTime: interval.endTime (en timezone),
        durationMinutes: calcular(interval),
        timezone: timezone
      })

  RETURN slots
```

### Operaciones de Intervalos

**Intersección de intervalos:**
```
FUNCTION intervalsIntersect(a, b):
  RETURN a.start < b.end AND b.start < a.end
```

**Restar intervalo:**
```
FUNCTION subtractInterval(base, toSubtract):
  result = []
  IF NOT intervalsIntersect(base, toSubtract):
    RETURN [base] // no hay intersección

  // Parte antes de la intersección
  IF base.start < toSubtract.start:
    result.push({ start: base.start, end: toSubtract.start })

  // Parte después de la intersección
  IF base.end > toSubtract.end:
    result.push({ start: toSubtract.end, end: base.end })

  RETURN result
```

---

## Security & Authorization

### Access Control Matrix

| Rol | Crear Reglas | Editar Reglas | Eliminar Reglas | Leer Reglas | Leer Slots |
|-----|--------------|---------------|-----------------|-------------|------------|
| **CONTRACTOR (dueño)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **CONTRACTOR (otro)** | ❌ | ❌ | ❌ | ❌ | ✅ (solo slots públicos) |
| **CLIENT** | ❌ | ❌ | ❌ | ❌ | ✅ (solo slots públicos) |
| **ADMIN** | ❌ | ❌ | ❌ | ✅ (auditoría) | ✅ |
| **Público** | ❌ | ❌ | ❌ | ❌ | ✅ (solo slots públicos) |

### Validaciones de Seguridad

1. **Ownership:**
   - Verificar que `contractorProfile.userId === user.id` antes de modificar
   - Error 403 si falla

2. **Rol:**
   - Solo `CONTRACTOR` puede crear/editar/eliminar disponibilidad
   - Error 403 si `user.role !== 'CONTRACTOR'`

3. **Input Sanitization:**
   - Validar todos los inputs con Zod antes de persistir
   - Escapar campos de texto libre (`reason`) para evitar XSS

4. **Rate Limiting (futuro):**
   - Limitar creación de reglas/excepciones/bloqueos a N por minuto
   - Prevenir spam o abuso

5. **Auditoría:**
   - Logs de creación/edición/eliminación (timestamps en `createdAt`/`updatedAt`)
   - Admin puede consultar historial (futuro: tabla de auditoría)

---

## UI/UX Specifications

### Components

#### AvailabilityManager (Componente principal)

**Ubicación:** `src/components/contractors/availability/AvailabilityManager.tsx`

**Propósito:** Orquestador principal que muestra las 3 secciones (reglas semanales, excepciones, bloqueos)

**Estructura:**
```tsx
<DashboardShell>
  <div className="space-y-6">
    <header>
      <h1 className="text-2xl font-bold">Gestionar Disponibilidad</h1>
      <p className="text-sm text-gray-600">Configura tus horarios...</p>
    </header>

    {/* Cards de resumen */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>Reglas Semanales: {weeklyRules.length}</Card>
      <Card>Excepciones: {exceptions.length}</Card>
      <Card>Bloqueos: {blocks.length}</Card>
    </div>

    {/* Tabs o secciones */}
    <AvailabilityWeekly />
    <AvailabilityExceptions />
    <AvailabilityBlocks />
  </div>
</DashboardShell>
```

**Estados:**
- Loading: skeleton de cards
- Error: alert box rojo
- Empty: "No tienes horarios configurados. Crea tu primer horario semanal."

---

#### AvailabilityWeekly

**Propósito:** Vista semanal con formulario para crear/editar reglas por día

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

**Formulario (modal o inline):**
- Select día de la semana (lunes-domingo)
- Input startTime (time picker)
- Input endTime (time picker)
- Botón "+ Agregar intervalo" (para múltiples por día)
- Botón "Guardar"

**Validaciones (Zod):**
```typescript
const weeklyRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  intervals: z.array(
    z.object({
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
    })
  ).refine(
    (intervals) => {
      // Validar que no haya traslapes
      // Validar que startTime < endTime
    }
  ),
});
```

---

#### AvailabilityExceptions

**Propósito:** Calendario mensual para agregar excepciones en fechas específicas

**UI:**
```
┌──────────────────────────────┐
│   Noviembre 2025            │
│ L  M  M  J  V  S  D         │
│             1  2  3         │
│ 4  5  6  7  8  9 10         │
│11 12 13 14 15 16 17 ⭐      │ <- 17 tiene excepción
└──────────────────────────────┘

[Click en día → Modal para agregar excepción]
```

**Modal:**
- Fecha (pre-seleccionada)
- Tipo: Radio buttons (AVAILABLE, BLOCKED)
- Intervalos (si AVAILABLE): time pickers
- Razón (opcional): textarea
- Botón "Guardar"

**Estados del calendario:**
- Día con excepción: badge azul
- Día con bloqueo: badge rojo
- Día normal: sin badge

---

#### AvailabilityBlocks

**Propósito:** Lista de bloqueos con formulario para crear nuevos

**UI:**
```
┌─────────────────────────────────────┐
│ Bloqueos                            │
├─────────────────────────────────────┤
│ 20-25 Nov 2025 - Vacaciones [X]    │
│ 10 Dic 2025 10:00-12:00 - Mtto [X] │
│                                      │
│ [+ Nuevo Bloqueo]                   │
└─────────────────────────────────────┘
```

**Formulario:**
- Fecha inicio + hora (datetime-local)
- Fecha fin + hora (datetime-local)
- Razón (opcional): input text
- Botón "Crear Bloqueo"

**Validaciones:**
- `startDateTime < endDateTime`
- No permite bloquear sobre reservas confirmadas (mostrar warning)

---

### Navigation

**Ruta:** `/contractors/availability`

**Sidebar:**
- Item "Disponibilidad" ya existe (icon: calendar)
- Active highlight cuando estamos en `/contractors/availability`

**Breadcrumb:**
```
Dashboard > Disponibilidad
```

---

### Accessibility

**Checklist:**
- ✅ Focus rings en todos los elementos interactivos (`focus:ring-2 focus:ring-blue-500`)
- ✅ ARIA labels en calendario (`aria-label="Día 21 de noviembre"`)
- ✅ `aria-current="date"` en día seleccionado
- ✅ `aria-invalid` en inputs con errores
- ✅ `role="alert"` en mensajes de error
- ✅ Navegación por teclado:
  - Tab: entre inputs
  - Flechas: en calendario (izquierda/derecha para días, arriba/abajo para semanas)
  - Enter: seleccionar día
  - Escape: cerrar modal
- ✅ Skip links: `<a href="#main-content">Ir al contenido</a>` (sr-only)

---

### Responsive Design

**Mobile (375px - 767px):**
- Calendario: vista semanal (1 semana a la vez)
- Formularios: inputs full-width
- Sidebar: overlay
- Cards: 1 columna

**Tablet (768px - 1023px):**
- Calendario: vista mensual simplificada
- Cards: 2 columnas

**Desktop (1024px+):**
- Calendario: vista mensual completa
- Cards: 3 columnas
- Sidebar: fixed

---

## Testing Plan

### Test Cases Mapping

Todos los casos están documentados en `/docs/md/STP-ReparaYa.md` sección 4.1.12.

#### Functional Tests (20 casos)

| ID | Descripción | Tipo | Prioridad |
|----|-------------|------|-----------|
| TC-RF-CTR-AVAIL-001 | Crear horario semanal exitosamente | Integración | Alta |
| TC-RF-CTR-AVAIL-002 | Rechazar intervalos superpuestos | Unitaria | Alta |
| TC-RF-CTR-AVAIL-003 | Listar horarios semanales del contratista | Integración | Alta |
| TC-RF-CTR-AVAIL-004 | Crear excepción para día específico | Integración | Alta |
| TC-RF-CTR-AVAIL-005 | Excepción sobrescribe regla semanal | Unitaria | Alta |
| TC-RF-CTR-AVAIL-006 | Listar excepciones por rango de fechas | Integración | Media |
| TC-RF-CTR-AVAIL-007 | Crear bloqueo manual | Integración | Alta |
| TC-RF-CTR-AVAIL-008 | Rechazar bloqueo que colisiona con reserva | Integración | Alta |
| TC-RF-CTR-AVAIL-009 | Eliminar bloqueo | Integración | Media |
| TC-RF-CTR-AVAIL-010 | Generar slots disponibles sin excepciones | Integración | Alta |
| TC-RF-CTR-AVAIL-011 | Generar slots con excepciones aplicadas | Integración | Alta |
| TC-RF-CTR-AVAIL-012 | Generar slots con bloqueos restados | Integración | Alta |
| TC-RF-CTR-AVAIL-013 | Generar slots con reservas confirmadas restadas | Integración | Alta |
| TC-RF-CTR-AVAIL-014 | Conversión correcta de timezone (crear regla) | Unitaria | Alta |
| TC-RF-CTR-AVAIL-015 | Conversión correcta con DST | Unitaria | Media |
| TC-RF-CTR-AVAIL-016 | Contratista solo modifica su disponibilidad | Integración | Alta |
| TC-RF-CTR-AVAIL-017 | Cliente puede leer slots públicos | Integración | Alta |
| TC-RF-CTR-AVAIL-018 | Admin puede leer reglas de contratistas | Integración | Media |
| TC-RF-CTR-AVAIL-019 | Filtrar slots por duración de servicio | Integración | Media |
| TC-RF-CTR-AVAIL-020 | Warning si intervalo < 30 min | E2E | Baja |

#### Non-Functional Tests (5 casos)

| ID | Descripción | Tipo | Prioridad |
|----|-------------|------|-----------|
| TC-RNF-CTR-AVAIL-001 | Performance - Slots P95 ≤ 800ms | Performance/k6 | Alta |
| TC-RNF-CTR-AVAIL-002 | Race condition - bloqueo vs reserva | Integración | Media |
| TC-RNF-CTR-AVAIL-003 | A11y - Navegación por teclado | E2E/Playwright | Alta |
| TC-RNF-CTR-AVAIL-004 | A11y - ARIA y lector de pantalla | E2E/Playwright | Alta |
| TC-RNF-CTR-AVAIL-005 | Responsive - Mobile 375px | E2E/Playwright | Alta |

---

### Test Coverage Goals

- **Módulo `availability`:** ≥ 70% cobertura
- **Services:** ≥ 80% (lógica crítica de negocio)
- **Repositories:** ≥ 70% (CRUD básico)
- **Validators:** ≥ 90% (edge cases de validación)
- **UI Components:** ≥ 60% (renders + interacciones básicas)

---

### Test Artifacts

**Archivos de test:**
```
src/modules/contractors/availability/__tests__/
├── availabilityService.test.ts        (lógica de negocio)
├── availabilityRepository.test.ts     (CRUD)
├── validators.test.ts                 (Zod schemas)
└── slotGenerator.test.ts              (algoritmo de combinación)

tests/integration/api/contractors/
└── availability.test.ts               (endpoints HTTP)

tests/performance/
└── availability-slot-generation.js    (k6 script)

tests/e2e/
└── contractor-availability.spec.ts    (Playwright)

src/components/contractors/availability/__tests__/
├── AvailabilityManager.test.tsx
├── AvailabilityWeekly.test.tsx
└── AvailabilityBlocks.test.tsx
```

---

### Acceptance Criteria

**Para archivar este cambio (`/openspec:archive`):**

- ✅ Todos los 25 casos de prueba (TC-RF-CTR-AVAIL-* + TC-RNF-CTR-AVAIL-*) pasan
- ✅ Cobertura ≥ 70% en `src/modules/contractors/availability`
- ✅ Performance: P95 ≤ 800ms (k6 test)
- ✅ Accesibilidad: 0 violaciones (axe-core)
- ✅ Responsive: tests pasan en 375px, 768px, 1024px (Playwright)
- ✅ CI/CD en verde (GitHub Actions)
- ✅ STP actualizado con resultados de ejecución
- ✅ PR mergeado a `dev`

---

## Integration Points

### Con Módulo `services`

**Flujo:**
1. Al crear/editar servicio → validar que `durationMinutes` sea razonable (15-480 min)
2. Al generar slots → si `serviceId` está en query → filtrar slots compatibles

**Contrato:**
- `Service.durationMinutes`: number (minutos)
- `availabilityService.generateSlots(contractorId, startDate, endDate, serviceId?)`

---

### Con Módulo `booking`

**Flujo:**
1. Al crear reserva → validar que el slot esté disponible (llamar `isAvailableOnDateTime`)
2. Al crear bloqueo → validar que no haya reservas CONFIRMADAS en ese intervalo

**Contrato:**
- `bookingService.getConfirmedBookingsByContractor(contractorId, startDate, endDate)`
- `availabilityService.isAvailableOnDateTime(contractorId, date, startTime, endTime): boolean`

---

### Con Módulo `messaging`

**Futuro:** Enviar recordatorios cuando se crea/edita/elimina disponibilidad que afecte reservas futuras.

---

## Future Enhancements

### v2: Disponibilidad por Servicio

- Cada servicio tiene su propia disponibilidad (en vez de a nivel de contratista)
- Más granular pero más complejo de gestionar

### v3: Sincronización con Calendarios Externos

- Google Calendar, Outlook
- Importar eventos externos como bloqueos automáticos
- Exportar disponibilidad a calendarios externos

### v4: Sugerencias Inteligentes

- ML para sugerir horarios basados en:
  - Patrones de reservas pasadas
  - Zonas de alta demanda
  - Horarios de competidores

### v5: Disponibilidad Dinámica

- Ajustar disponibilidad automáticamente según:
  - Clima (servicios outdoor)
  - Tráfico (tiempos de traslado)
  - Carga de trabajo actual

---

## Appendix

### Glossary

- **Slot:** Intervalo de tiempo disponible para reservar
- **Regla semanal:** Horario recurrente por día de la semana
- **Excepción:** Sobrescritura de regla semanal para fecha específica
- **Bloqueo:** Intervalo marcado como no disponible ad-hoc
- **TZ (Timezone):** Zona horaria IANA (ej: "America/Mexico_City")
- **DST:** Daylight Saving Time (horario de verano)
- **IANA:** Internet Assigned Numbers Authority (estándar de TZ)

### References

- **STP:** `/docs/md/STP-ReparaYa.md` sección 4.1.12
- **Project Context:** `/openspec/project.md`
- **Schema Prisma:** `/apps/web/prisma/schema.prisma`
- **Specs relacionados:**
  - Contractor Profiles: `/openspec/specs/profiles/profiles-contractor.md`
  - Contractor Location: `/openspec/specs/contractor-location/spec.md`

---

**Versión:** 1.0
**Fecha:** 2025-11-20
**Estado:** Draft (pendiente de aprobación)
**Autor:** Claude Code (asistente de desarrollo)
