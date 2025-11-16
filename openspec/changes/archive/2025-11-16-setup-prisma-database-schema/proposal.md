# Change: Configuración de Prisma y Schema Completo de Base de Datos

## Why

ReparaYa necesita un modelo de datos completo y bien estructurado para soportar todas las funcionalidades del marketplace:
- Autenticación y gestión de usuarios (clientes, contratistas, admins)
- Catálogo de servicios con búsqueda geoespacial
- Sistema de reservas con máquina de estados compleja
- Flujo de pagos (anticipos, liquidaciones, reembolsos) integrado con Stripe
- Mensajería contextual por reserva
- Sistema de calificaciones con cache de promedios
- Panel administrativo con moderación y resolución de disputas

Actualmente no existe el directorio `apps/web/prisma/` ni el schema de base de datos, lo que bloquea el desarrollo de todos los módulos.

## What Changes

### 1. Infraestructura de Prisma
- Crear directorio `apps/web/prisma/`
- Configurar `schema.prisma` con conexión a PostgreSQL (Supabase) vía `DATABASE_URL`
- Agregar scripts npm para `prisma:generate` y `prisma:migrate`
- Crear cliente Prisma singleton en `apps/web/src/lib/db.ts`

**Nota:** Inicialmente se consideró Neon como proveedor de PostgreSQL, pero se optó por Supabase para evitar cold starts durante desarrollo. Neon suspende automáticamente la base de datos después de 5 minutos de inactividad en el plan free, lo que causa latencias significativas (3-5 segundos) en la primera conexión después de cada suspensión. Supabase mantiene la base de datos activa, proporcionando tiempos de respuesta consistentes durante el desarrollo.

### 2. Schema Completo (15 entidades + 8 enums)

**Dominio Auth & Users:**
- `User` (con `clerk_user_id`, role, status)
- `ContractorProfile` (datos profesionales, verificación KYC, Stripe Connect)

**Dominio Services:**
- `Category` (categorías de servicios)
- `Service` (publicaciones de contratistas con geolocalización)
- `Availability` (slots de disponibilidad para booking)

**Dominio Booking:**
- `Booking` (reservas con máquina de estados)
- `BookingStateHistory` (auditoría de transiciones)

**Dominio Payments:**
- `Payment` (anticipos, liquidaciones, reembolsos)
- `ProcessedWebhookEvent` (idempotencia de webhooks Stripe)

**Dominio Messaging:**
- `Message` (mensajes contextuales por reserva)

**Dominio Ratings:**
- `Rating` (calificaciones 1-5 con moderación)
- `ServiceRatingStats` (cache de promedios)

**Dominio Admin:**
- `Dispute` (gestión de disputas)
- `AdminAuditLog` (trazabilidad de acciones admin)

**Soporte:**
- `Address` (direcciones de clientes)

### 3. Configuración de CodeRabbit (Bonus)
- Corregir `.coderabbit.yaml` para schema v2
- Habilitar auto-reviews en PRs hacia `dev` y `main`
- Reorganizar configuración según spec oficial

## Impact

**Affected specs:**
- `auth` - Define modelo User con clerk_user_id
- `users` - Define ContractorProfile y Address
- `catalog-search` - Define Service, Category con índices geoespaciales
- `services-publishing` - Define Availability
- `booking-checkout` - Define Booking y BookingStateHistory
- `payments-webhooks` - Define Payment y ProcessedWebhookEvent
- `reservation-lifecycle-messaging` - Define Message
- `ratings-reviews` - Define Rating y ServiceRatingStats
- `admin-moderation` - Define Dispute y AdminAuditLog

**Affected code:**
- `apps/web/package.json` - Nuevos scripts Prisma
- `apps/web/prisma/schema.prisma` - Nuevo archivo (completo)
- `apps/web/src/lib/db.ts` - Nuevo archivo (Prisma client)
- `.coderabbit.yaml` - Corrección de configuración

**Dependencies:**
- Todos los módulos de dominio dependen de este schema
- Los tests de integración necesitan el schema para seedear datos
- Las migraciones de Prisma deben ejecutarse antes de `npm run dev`

## Testing Plan

### Casos de prueba a documentar en STP:

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-DB-001-01 | Conexión a base de datos Supabase exitosa | Integración | Alta | Infraestructura |
| TC-DB-001-02 | Migración inicial genera todas las tablas | Integración | Alta | Infraestructura |
| TC-DB-001-03 | Índices creados correctamente (geoespaciales, FKs, unique) | Integración | Alta | RNF-3.5.1 |
| TC-DB-001-04 | Restricciones de integridad referencial funcionan | Unitaria | Alta | Calidad |
| TC-DB-001-05 | Enums de Prisma coinciden con valores de specs | Unitaria | Alta | Trazabilidad |
| TC-DB-002-01 | Cliente Prisma singleton no crea múltiples instancias | Unitaria | Alta | Performance |
| TC-DB-002-02 | Queries de Prisma usan tipos correctos (UUID, DateTime) | Unitaria | Media | TypeScript |
| TC-DB-003-01 | Seed script carga 300+ servicios sin errores | Integración | Media | Testing |
| TC-DB-003-02 | Seed script carga 200+ usuarios (clientes/contratistas) | Integración | Media | Testing |
| TC-DB-003-03 | Queries geoespaciales funcionan con datos seed | Integración | Alta | RF-001 |

### Criterios de aceptación:

- ✅ `npx prisma generate` se ejecuta sin errores
- ✅ `npx prisma migrate dev --name init` crea todas las 15 tablas + enums
- ✅ Schema tiene mínimo 15 índices (clerk_user_id, email, status, geoespaciales, etc.)
- ✅ Todos los campos obligatorios del SRS están presentes
- ✅ Cliente Prisma en `src/lib/db.ts` funciona en dev y producción
- ✅ CodeRabbit valida PRs hacia `dev` correctamente
- ✅ No hay warnings de propiedades no reconocidas en `.coderabbit.yaml`

### Estrategia de implementación:

**Archivos a crear:**
- `apps/web/prisma/schema.prisma` (schema completo, ~800 líneas)
- `apps/web/src/lib/db.ts` (cliente Prisma singleton)
- `apps/web/prisma/seed.ts` (datos de prueba para desarrollo)

**Validaciones:**
- Ejecutar `npx prisma validate` para verificar sintaxis
- Ejecutar `npx prisma format` para formateo consistente
- Verificar que `npx prisma generate` crea tipos TypeScript
- Probar conexión con `DATABASE_URL` de `.env.local`

**Integraciones externas:**
- Base de datos: PostgreSQL en Supabase (proyecto: https://vmsqbguwjjpusedhapqo.supabase.co)
- Prisma CLI: Usar versión 5.18.0 (compatible con package.json)
- TypeScript: Schema debe generar tipos estrictos para todo

**Orden de ejecución:**
1. Crear `schema.prisma` con configuración + todos los modelos
2. Crear `db.ts` con cliente singleton
3. Actualizar `package.json` con scripts
4. Corregir `.coderabbit.yaml`
5. Ejecutar `prisma validate` localmente
6. **NO ejecutar `prisma migrate` aún** (el equipo lo hará después de aprobar la propuesta)

## Migration Strategy

### Pre-requisitos
- Variable `DATABASE_URL` configurada en `.env.local` (✅ ya disponible)
- Prisma CLI instalado en devDependencies (✅ ya en package.json)
- Supabase DB accesible desde entorno de desarrollo

### Pasos de Migración (para el equipo, después de aprobar)

```bash
# 1. Generar cliente Prisma
cd apps/web
npx prisma generate

# 2. Crear migración inicial
npx prisma migrate dev --name init

# 3. Verificar tablas creadas
npx prisma studio  # Abre UI para explorar DB

# 4. (Opcional) Seed de datos de prueba
npx prisma db seed
```

### Rollback Plan
- Si hay errores en la migración: `git checkout -- prisma/migrations/`
- Si la DB queda en mal estado: Usar Supabase Dashboard para reset de DB dev
- Los cambios al schema se pueden iterar con `prisma migrate dev --name <nombre>`

### Consideraciones
- **NO usar `prisma db push`** en producción (solo para prototipado rápido)
- Las migraciones se commitean en Git para trazabilidad
- Cada ambiente (dev, staging, prod) tiene su propia DB en Supabase
- Los seeds solo se ejecutan en dev/staging, nunca en producción
