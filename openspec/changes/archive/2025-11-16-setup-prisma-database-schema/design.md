# Design Document: Prisma Database Schema

## Context

ReparaYa es un marketplace que conecta clientes con contratistas de servicios de mantenimiento del hogar. El sistema debe manejar:
- Flujos financieros complejos (anticipos, liquidaciones, comisiones, disputas)
- Búsqueda geoespacial de servicios
- Máquina de estados para reservas (8+ estados con transiciones validadas)
- Integraciones externas (Clerk, Stripe, AWS S3/SES/Location)
- Requisitos estrictos de performance (P95 ≤ 1.2s búsqueda, ≤ 1.5s checkout)
- Cobertura de tests ≥ 70%

**Stakeholders:**
- Equipo de desarrollo (3-4 devs)
- Profesor/evaluador (documentación formal SRS/SDD/SPMP)
- Usuarios finales (clientes, contratistas, admins)

**Constraints:**
- Proyecto académico con tiempo limitado (sprints definidos en SPMP)
- Presupuesto AWS ~100 USD (minimizar servicios caros)
- Monolito Next.js desplegado en Vercel
- PostgreSQL en Supabase (managed, sin auto-suspend en desarrollo)

## Goals / Non-Goals

### Goals
1. **Completitud**: Modelo de datos que soporte TODOS los requisitos funcionales del SRS
2. **Performance**: Índices optimizados para búsqueda geoespacial, filtrado por estado, joins frecuentes
3. **Integridad**: Restricciones FK, unique constraints, enums para evitar datos inconsistentes
4. **Trazabilidad**: Auditoría de cambios de estado (BookingStateHistory, AdminAuditLog)
5. **Escalabilidad preparada**: Diseño que soporte crecimiento a miles de usuarios sin reestructurar tablas
6. **Tipo-seguridad**: Schema Prisma genera tipos TypeScript exactos

### Non-Goals
- **NO** implementar soft-delete aún (preparar estructura pero no agregar campo `deletedAt`)
- **NO** optimización prematura (particionamiento de tablas, sharding, etc.)
- **NO** multi-tenancy (una sola plataforma)
- **NO** i18n en base de datos (todo en español MX por ahora)
- **NO** almacenar datos sensibles de pago (solo IDs/tokens de Stripe)

## Decisions

### Decision 1: UUIDs como Primary Keys

**Contexto:** Elegir entre:
- AUTO_INCREMENT INT
- UUID v4
- ULID
- Timestamp + Random

**Decisión:** Usar UUIDs (v4) con `@default(uuid())` en Prisma.

**Razones:**
1. **Distribuibilidad**: UUIDs se generan en app layer, no requieren roundtrip a DB
2. **Seguridad**: IDs no secuenciales previenen enumeración (evita ataques predictivos)
3. **Merge-friendly**: Si en el futuro se necesita sharding o réplicas, UUIDs evitan conflictos
4. **Compatibilidad**: Clerk usa UUIDs (`user_xxx`), Stripe usa IDs alfanuméricos → consistencia

**Trade-offs:**
- ❌ Mayor tamaño de almacenamiento (16 bytes vs 4 bytes de INT)
- ❌ Índices ligeramente menos eficientes (UUID random vs secuencial)
- ✅ Pero: PostgreSQL tiene soporte nativo excelente, y el tamaño de DB del MVP (<10GB) hace esto irrelevante

**Alternativas consideradas:**
- AUTO_INCREMENT: Descartado por problemas de enumeración y escalabilidad
- ULID: Descartado por menor soporte en Prisma y complejidad adicional innecesaria para MVP

---

### Decision 2: Decimal para Montos Monetarios

**Contexto:** Elegir tipo de dato para precios, anticipos, comisiones:
- FLOAT/DOUBLE
- DECIMAL(12,2)
- INT (centavos, ej: 125000 = $1,250.00)

**Decisión:** Usar `Decimal` de Prisma (mapea a `NUMERIC(12,2)` en PostgreSQL).

**Razones:**
1. **Precisión exacta**: Evita errores de redondeo de punto flotante (crítico en finanzas)
2. **Cumplimiento legal**: LFPDPPP y SAT requieren precisión exacta en facturas
3. **Legibilidad**: $1,250.50 se almacena como `1250.50`, no como `125050` centavos
4. **Compatibilidad Stripe**: Stripe usa centavos en API pero espera cálculos exactos

**Configuración:**
- `NUMERIC(12,2)` soporta hasta $9,999,999,999.99 MXN (más que suficiente)
- Prisma mapea a tipo `Prisma.Decimal` en TypeScript (aritmética segura)

**Ejemplo:**
```prisma
model Booking {
  basePrice             Decimal  // 1000.00
  finalPrice            Decimal  // 1265.00 (con recargos)
  anticipoAmount        Decimal  // 253.00 (20%)
  liquidacionAmount     Decimal  // 1012.00 (80%)
  comisionAmount        Decimal  // 150.00 (15% de base)
  contractorPayoutAmount Decimal // 850.00 (base - comisión)
}
```

**Alternativas consideradas:**
- FLOAT: Descartado por errores de redondeo (`0.1 + 0.2 !== 0.3`)
- INT (centavos): Descartado por complejidad en queries y conversión constante

---

### Decision 3: Índices Geoespaciales para Búsqueda de Servicios

**Contexto:** RF-001 requiere búsqueda por ubicación con P95 ≤ 1.2s. Opciones:
- PostGIS (extensión espacial de PostgreSQL)
- Índices compuestos simples en (lat, lng)
- Pre-calcular bounding boxes en app layer

**Decisión:** Usar índice compuesto `@@index([locationLat, locationLng])` en Prisma + cálculo de distancia en app layer con Amazon Location Service.

**Razones:**
1. **Simplicidad**: Índice compuesto es suficiente para MVP sin agregar complejidad de PostGIS
2. **Amazon Location**: Ya está en el stack para geocodificación → reusar para distancias
3. **Performance suficiente**: Dataset del MVP (~300 servicios) cabe en memoria, índice compuesto es adecuado
4. **Future-proof**: Si crece a miles de servicios, migrar a PostGIS es trivial (Supabase tiene soporte completo de PostGIS)

**Estrategia de búsqueda:**
```typescript
// 1. Query con bounding box (rápido, usa índice)
const services = await prisma.service.findMany({
  where: {
    locationLat: { gte: minLat, lte: maxLat },
    locationLng: { gte: minLng, lte: maxLng },
    status: 'ACTIVE'
  }
});

// 2. Calcular distancia exacta con Amazon Location
const withDistances = await calculateDistances(services, userLocation);

// 3. Filtrar por radio y ordenar
return withDistances.filter(s => s.distance <= radiusKm).sort((a,b) => a.distance - b.distance);
```

**Trade-offs:**
- ❌ Cálculo de distancia en app layer (más lento que PostGIS)
- ✅ Pero: Con cache y bounding box, cumple requisito de P95 ≤ 1.2s
- ✅ Sin dependencia de extensiones PostgreSQL para MVP

**Alternativas consideradas:**
- PostGIS: Disponible en Supabase, pero agregamos complejidad innecesaria para MVP con 300 servicios
- Elasticsearch: Overkill para 300 servicios, costo adicional

---

### Decision 4: Enum de Estados vs String Libre

**Contexto:** Estados de Booking, Payment, User, etc. pueden ser:
- Strings libres (`"confirmed"`, `"CONFIRMED"`, `"Confirmed"` → inconsistencia)
- Enums de Prisma (validación en schema)
- Enums de PostgreSQL (validación en DB)

**Decisión:** Usar `enum` de Prisma para todos los estados.

**Razones:**
1. **Tipo-seguridad**: TypeScript valida en compile-time (`booking.status = "INVALID"` → error)
2. **Documentación viva**: Estados visibles en schema, no en código disperso
3. **Validación automática**: Prisma rechaza valores inválidos antes de query
4. **Migraciones controladas**: Agregar/eliminar estados es explícito en migrations

**Ejemplo:**
```prisma
enum BookingStatus {
  PENDING_PAYMENT
  CONFIRMED
  ON_ROUTE
  ON_SITE
  IN_PROGRESS
  COMPLETED
  CANCELLED
  DISPUTED
}

model Booking {
  status BookingStatus @default(PENDING_PAYMENT)
}
```

**Trade-offs:**
- ❌ Cambiar nombres de estados requiere migration (vs string que puede cambiar en runtime)
- ✅ Pero: Esto es BUENO → evita cambios accidentales sin trazabilidad

**Alternativas consideradas:**
- String libre: Descartado por riesgo de inconsistencia
- Enum PostgreSQL: Similar, pero Prisma abstrae mejor

---

### Decision 5: Relación User ↔ ContractorProfile (1:1 vs Embedded)

**Contexto:** Contratistas tienen datos adicionales (KYC, Stripe Connect). Opciones:
- Tabla separada `ContractorProfile` con FK a `User` (1:1)
- Columnas JSON en `User` (embedded)
- Tabla única con columnas opcionales

**Decisión:** Tabla separada `ContractorProfile` con relación 1:1.

**Razones:**
1. **Separation of Concerns**: User tiene datos comunes (auth, perfil), ContractorProfile tiene datos específicos (negocio, verificación)
2. **Performance**: Queries de clientes no cargan datos de contratista innecesariamente
3. **Escalabilidad**: Agregar campos a ContractorProfile no afecta User
4. **Seguridad**: Datos KYC sensibles aislados en tabla aparte (control de acceso más granular)

**Schema:**
```prisma
model User {
  id                String             @id @default(uuid())
  role              UserRole
  contractorProfile ContractorProfile? // Opcional, solo si role=CONTRACTOR
}

model ContractorProfile {
  id                      String  @id @default(uuid())
  userId                  String  @unique
  user                    User    @relation(fields: [userId], references: [id])
  verified                Boolean @default(false)
  stripeConnectAccountId  String?
  // ... más campos
}
```

**Trade-offs:**
- ❌ Requiere JOIN para obtener perfil completo de contratista
- ✅ Pero: El 80% de queries son de clientes buscando servicios → optimización correcta

**Alternativas consideradas:**
- JSON en User: Descartado por dificultar queries y validación
- Tabla única: Descartado por columnas mayormente NULL para clientes

---

### Decision 6: BookingStateHistory para Auditoría

**Contexto:** RF-006 requiere tracking de cambios de estado en reservas. Opciones:
- Tabla de auditoría `BookingStateHistory`
- Campo JSON en `Booking` con array de cambios
- Trigger de PostgreSQL que loguea cambios

**Decisión:** Tabla separada `BookingStateHistory` con FK a `Booking`.

**Razones:**
1. **Requisito explícito**: SDD menciona "historial de eventos si aplica"
2. **Trazabilidad legal**: Disputas requieren saber quién cambió qué y cuándo
3. **Queries eficientes**: "¿Cuándo se confirmó esta reserva?" → query directo vs parsear JSON
4. **Extensibilidad**: Agregar campos (ej: `ipAddress`, `userAgent`) es trivial

**Schema:**
```prisma
model BookingStateHistory {
  id        String        @id @default(uuid())
  bookingId String
  booking   Booking       @relation(fields: [bookingId], references: [id])
  fromState BookingStatus
  toState   BookingStatus
  changedBy String
  user      User          @relation(fields: [changedBy], references: [id])
  notes     String?
  createdAt DateTime      @default(now())

  @@index([bookingId, createdAt])
}
```

**Trade-offs:**
- ❌ Tabla adicional (complejidad)
- ✅ Pero: Requisito legal y de negocio justifica el costo

**Alternativas consideradas:**
- JSON en Booking: Descartado por dificultad en queries
- Triggers: Descartado por complejidad y dificultar tests

---

### Decision 7: ServiceRatingStats (Cache de Promedios)

**Contexto:** Mostrar rating promedio de cada servicio. Opciones:
- Calcular on-the-fly con `AVG()` cada vez
- Tabla de cache `ServiceRatingStats`
- Materialized View de PostgreSQL

**Decisión:** Tabla de cache `ServiceRatingStats` actualizada por triggers de app.

**Razones:**
1. **Performance**: `SELECT average FROM ServiceRatingStats WHERE serviceId = ?` es O(1) vs O(N) de AVG()
2. **Requisito de búsqueda**: Listado de servicios muestra rating → cachearlo es crítico
3. **Control**: Actualización en app layer (cuando se crea/modera Rating) vs trigger DB
4. **Simplicidad**: Sin dependencias de features avanzadas de PostgreSQL

**Estrategia de actualización:**
```typescript
// En servicio de Rating
async function createRating(data) {
  const rating = await prisma.rating.create({ data });

  // Recalcular stats
  const { _avg, _count } = await prisma.rating.aggregate({
    where: { serviceId: data.serviceId, moderationStatus: 'APPROVED' },
    _avg: { stars: true },
    _count: true
  });

  await prisma.serviceRatingStats.upsert({
    where: { serviceId: data.serviceId },
    update: { average: _avg.stars, totalRatings: _count },
    create: { serviceId: data.serviceId, average: _avg.stars, totalRatings: _count }
  });
}
```

**Trade-offs:**
- ❌ Riesgo de desincronización (stats vs ratings reales)
- ✅ Mitigación: Tests de integración validan consistencia, job cron nocturno recalcula todo

**Alternativas consideradas:**
- AVG() on-the-fly: Descartado por performance (300 servicios × 10-50 ratings cada uno)
- Materialized View: Descartado por complejidad y menor portabilidad

---

### Decision 8: Idempotencia de Webhooks con ProcessedWebhookEvent

**Contexto:** Stripe puede enviar el mismo webhook múltiples veces (retry). Opciones:
- Procesar siempre (riesgo de duplicados)
- Tabla `ProcessedWebhookEvent` con `stripeEventId` unique
- Cache Redis con TTL

**Decisión:** Tabla `ProcessedWebhookEvent` en PostgreSQL.

**Razones:**
1. **Requisito explícito**: RF-007 menciona "idempotencia por `event.id`"
2. **Persistencia**: DB es source of truth, Redis cache puede evictarse
3. **Auditoría**: Saber cuándo se procesó cada evento es útil para debugging
4. **Simplicidad**: Sin dependencia externa (Redis)

**Flujo:**
```typescript
async function handleStripeWebhook(event: Stripe.Event) {
  // 1. Verificar firma
  // ...

  // 2. Check idempotencia
  const existing = await prisma.processedWebhookEvent.findUnique({
    where: { stripeEventId: event.id }
  });
  if (existing) return { status: 'already_processed' };

  // 3. Procesar
  await processEvent(event);

  // 4. Marcar como procesado
  await prisma.processedWebhookEvent.create({
    data: {
      stripeEventId: event.id,
      eventType: event.type
    }
  });
}
```

**Trade-offs:**
- ❌ Query adicional por webhook (SELECT + INSERT)
- ✅ Pero: Webhooks son <10/día en MVP, performance no es issue

**Alternativas consideradas:**
- Redis: Descartado por complejidad de setup y costo en Vercel
- Ninguna: Descartado por riesgo de double-charge

## Risks / Trade-offs

### Risk 1: Migración a PostGIS en el Futuro

**Riesgo:** Si el proyecto crece >10,000 servicios, búsqueda geoespacial puede ser lenta.

**Mitigación:**
- Diseño actual permite migrar a PostGIS sin cambiar API pública
- Agregar tipo `GEOGRAPHY` y cambiar índice es una migración de Prisma
- Monitorear con k6: Si P95 > 1.2s, trigger de optimización

**Probabilidad:** Baja (proyecto académico, MVP con 300 servicios)

**Impacto:** Medio (requiere migration pero no afecta lógica de negocio)

---

### Risk 2: UUIDs Causan Fragmentación de Índices

**Riesgo:** UUIDs aleatorios pueden causar fragmentación en índices B-tree.

**Mitigación:**
- PostgreSQL tiene `uuid_generate_v1mc()` (time-based) pero Prisma no lo soporta nativamente
- Monitorear con `pg_stat_user_indexes` → REINDEX si fragmentación >20%
- Para MVP (<10,000 filas), impacto es negligible

**Probabilidad:** Baja

**Impacto:** Bajo (REINDEX es operación rutinaria)

---

### Risk 3: Decimal en TypeScript Requiere Librería Adicional

**Riesgo:** `Prisma.Decimal` no es `number` nativo de JS, puede causar bugs.

**Mitigación:**
- DTOs con Zod validan conversiones: `z.number().transform(n => new Prisma.Decimal(n))`
- Tests unitarios de cálculos financieros (BR-001, BR-002, BR-003)
- Documentar en guía de desarrollo: "Siempre usar `Decimal.add()`, nunca `+`"

**Probabilidad:** Media (devs pueden olvidar)

**Impacto:** Alto (errores de dinero son críticos)

**Plan de mitigación activa:**
- Crear helpers `calculateFinalPrice()`, `splitAnticipoLiquidacion()` que encapsulen Decimal
- Lint rule custom: "Prohibir operadores aritméticos sobre tipos Decimal"

## Migration Plan

### Phase 1: Setup (Week 1)
1. Crear estructura de carpetas y archivos base
2. Definir enums y modelos básicos (User, Category, Service)
3. Ejecutar primera migración: `prisma migrate dev --name init-core-models`
4. Validar conexión a Supabase DB

### Phase 2: Dominio Booking & Payments (Week 1-2)
1. Agregar Booking, BookingStateHistory, Payment, ProcessedWebhookEvent
2. Migración: `prisma migrate dev --name add-booking-payments`
3. Seed de datos de prueba (100 bookings)

### Phase 3: Dominios Auxiliares (Week 2)
1. Agregar Message, Rating, ServiceRatingStats, Dispute, AdminAuditLog
2. Migración: `prisma migrate dev --name add-messaging-ratings-admin`
3. Seed completo (300 servicios, 200 usuarios, 200 bookings, 500 mensajes)

### Phase 4: Índices y Optimización (Week 3)
1. Agregar índices geoespaciales, compuestos, unique constraints
2. Migración: `prisma migrate dev --name add-performance-indexes`
3. Ejecutar tests de performance con k6
4. Ajustar índices según resultados

### Rollback Strategy
- Cada fase puede revertirse con `prisma migrate resolve --rolled-back <migration-name>`
- Si falla una migración, resetear DB dev: `prisma migrate reset`
- Git mantiene historial de todas las migraciones → bisect para encontrar problemas

## Open Questions

1. **¿Necesitamos soft-delete desde MVP?**
   - Respuesta pendiente: Consultar con equipo si es requisito legal (LFPDPPP)
   - Si sí: Agregar `deletedAt DateTime?` a User, Service, Rating

2. **¿Qué política de retención de mensajes?**
   - STP menciona "7 días después del cierre de reserva"
   - ¿Implementar job cron con Vercel Cron o manual?

3. **¿Moneda múltiple en el futuro?**
   - MVP es solo MXN
   - Si se expande: Agregar tabla `Currency` y FK desde Payment/Booking
   - Por ahora: Hardcodear `"mxn"` en schema

4. **¿Necesitamos tabla `Notification` para email/push?**
   - Por ahora: AWS SES envía directo sin persistencia
   - Si se requiere historial: Agregar tabla en Phase 3.5

## Appendix: Comparación con Modelo Extraído por Agente

El agente de exploración generó un modelo de datos exhaustivo de 15 entidades en `/tmp/modelo_datos_reparaya.md`. Diferencias con este diseño:

| Aspecto | Modelo Agente | Este Diseño | Decisión |
|---------|---------------|-------------|----------|
| ContractorCoverage | Tabla separada con municipios | Embedded en ContractorProfile (array) | ❌ KISS principle: Array es suficiente para MVP |
| Municipality | Tabla con catálogo de municipios | No existe | ❌ Overkill: Usar string libre por ahora |
| ServicePhoto | Tabla separada con metadata | Array de URLs en Service | ❌ S3 es source of truth, no duplicar metadata |
| ServiceSchedule | Tabla de horarios de contratista | No existe (usar Availability) | ✅ Usar Availability directamente |
| Reservation vs Booking | Llama "Reservation" | Llama "Booking" | ✅ Unificar nombre: "Booking" es más común en inglés |
| Address | Tabla completa con lat/lng | Simplificada, lat/lng opcional | ✅ MVP: Address simple, geocodificar on-demand |

**Conclusion:** Este diseño es una versión simplificada y pragmática del modelo exhaustivo del agente, optimizada para MVP sin sacrificar extensibilidad futura.
