# Proposal: Contractor Profile Onboarding

**Change ID:** `2025-11-17-profiles-contractor`
**Status:** Proposed
**Created:** 2025-11-17
**Owner:** Architecture Team

## Why

ReparaYa ya tiene implementado el flujo de onboarding para **clientes** (change `client-profile-onboarding` archivado), el cual permite que usuarios con rol `CLIENT` completen su perfil con información adicional (teléfono, direcciones). Sin embargo, el flujo para **contratistas** está incompleto:

1. **Tabla `contractor_profiles` existe pero no hay endpoints**: El schema Prisma define `ContractorProfile` con campos básicos (`userId`, `businessName`, `description`, `specialties`, `verified`, `stripeConnectAccountId`), pero no hay servicios ni API para que un contratista cree o edite su perfil.

2. **Sin flujo de verificación**: No hay lógica para que un contratista pase por verificación (KYC) antes de poder publicar servicios. El campo `verified` existe en la BD pero no hay workflow para actualizarlo.

3. **Sin preparación para Stripe Connect**: Aunque existe `stripeConnectAccountId` en el schema, no hay documentación ni endpoints para integrarlo en el futuro (se implementará en un change posterior, pero debemos documentar los campos mínimos aquí).

4. **Bloquea catálogo de servicios**: Sin perfiles de contratista, no podemos implementar el módulo de publicación de servicios (`services-publishing`), ya que cada servicio debe estar asociado a un `ContractorProfile`.

Este change implementa el **flujo de onboarding completo para contratistas**, permitiendo que al registrarse con rol `CONTRACTOR`, un usuario pueda:
- Completar su perfil profesional (nombre comercial, descripción, especialidades, áreas de servicio)
- Quedar en estado `DRAFT` hasta ser verificado por un admin
- Ser habilitado para publicar servicios al ser marcado como `ACTIVE` por un admin

**Nota importante:** Este change NO implementa la integración con Stripe Connect (payouts), solo documenta los campos mínimos necesarios para habilitarlo en el futuro.

## What Changes

### 1. Implementación del módulo `contractors` (nuevo)

- **Servicios de dominio** (`apps/web/src/modules/contractors/services/`):
  - `contractorProfileService.ts`: CRUD de perfiles de contratista, gestión de estados (`DRAFT`, `ACTIVE`, `SUSPENDED`)
  - Validación de permisos: solo `role=CONTRACTOR` puede crear/editar su perfil; admins pueden suspender

- **Repositorios** (`apps/web/src/modules/contractors/repositories/`):
  - `contractorProfileRepository.ts`: Acceso a datos vía Prisma para modelo `ContractorProfile`

- **Tipos y validadores** (`apps/web/src/modules/contractors/types/`):
  - DTOs para request/response de endpoints
  - Schemas Zod para validación runtime (nombres comerciales, descripciones, especialidades)

- **Errores** (`apps/web/src/modules/contractors/errors/`):
  - `ContractorProfileNotFoundError`
  - `ContractorProfileAlreadyExistsError`
  - `InvalidVerificationStatusError`

### 2. Modelo de datos: Tabla `contractor_profiles`

**Relación:** 1:1 con `users` (un usuario con `role=CONTRACTOR` puede tener exactamente un `ContractorProfile`)

**Justificación de 1:1:** Un contratista solo puede tener un perfil profesional. No permitimos múltiples negocios por usuario para simplificar verificación KYC y Stripe Connect. Si un usuario quiere operar múltiples negocios, debe crear cuentas separadas.

**Campos definidos en Prisma (ya existentes, sin cambios al schema):**

```prisma
model ContractorProfile {
  id                     String   @id @default(uuid())
  userId                 String   @unique              // FK → users.id (1:1)
  businessName           String                        // Nombre comercial (ej: "Plomería García")
  description            String                        // Descripción del negocio (máx 500 chars)
  specialties            String[]                      // Especialidades (ej: ["plomería", "electricidad"])
  verified               Boolean  @default(false)      // KYC verificado por admin
  verificationDocuments  Json?                         // URLs de documentos (INE, comprobante domicilio)
  stripeConnectAccountId String?                       // Para futuro Stripe Connect (NULL por ahora)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  user                   User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Nuevos campos conceptuales a documentar (NO requieren migración, se usan campos existentes):**

- **`serviceAreas`**: Se almacena en `description` como texto libre por ahora (ej: "Cubro Guadalajara y área metropolitana"). En un change futuro, podría ser un campo JSON con coordenadas geográficas.

- **`verificationStatus`**: Se deriva de los campos existentes:
  - `DRAFT`: `verified = false` y perfil recién creado (estado inicial)
  - `ACTIVE`: `verified = true` (admin aprobó KYC)
  - `SUSPENDED`: Se implementará en el futuro con un campo adicional (por ahora, fuera de alcance)

**Campo para Stripe Connect (documentado, no implementado):**

- **`stripeConnectAccountId`**: Campo opcional que almacenará el ID de la cuenta conectada de Stripe cuando se implemente el módulo de pagos. Por ahora, siempre será `NULL`.
  - Referencia: https://stripe.com/docs/connect/express-accounts
  - Se llenará en un change futuro: `stripe-connect-contractor-payouts`

### 3. Endpoints API para gestión de perfiles de contratista

- **`POST /api/contractors/profile`**: Crear perfil de contratista
  - Autorización: Usuario autenticado con `role=CONTRACTOR` (middleware `requireRole('CONTRACTOR')`)
  - Body: `{ businessName, description, specialties[], verificationDocuments? }`
  - Validación: Zod schema, verificar que no exista ya un perfil para ese `userId`
  - Estado inicial: `verified = false` (DRAFT)
  - Respuesta: Perfil creado con `id`, `userId`, `verified: false`

- **`GET /api/contractors/profile/me`**: Obtener perfil del contratista autenticado
  - Autorización: Usuario autenticado con `role=CONTRACTOR`
  - Respuesta: Perfil completo con todos los campos

- **`PATCH /api/contractors/profile/me`**: Actualizar perfil del contratista autenticado
  - Autorización: Usuario autenticado con `role=CONTRACTOR`
  - Body: `{ businessName?, description?, specialties?, verificationDocuments? }`
  - Validación: Solo permitir edición si perfil está en estado `DRAFT` (no permitir editar si ya está `ACTIVE` sin aprobación admin)

- **`GET /api/contractors/:id`**: Obtener perfil público de un contratista
  - Autorización: Público (sin auth)
  - Respuesta: `{ id, userId, businessName, description, specialties, verified }` (sin `verificationDocuments` ni `stripeConnectAccountId`)
  - Caso de uso: Mostrar información del contratista en la página de un servicio

- **`PATCH /api/admin/contractors/:id/verify`**: Aprobar perfil de contratista (admin)
  - Autorización: Usuario autenticado con `role=ADMIN` (middleware `requireRole('ADMIN')`)
  - Body: `{ verified: true | false }`
  - Validación: Solo admins pueden cambiar el estado de verificación
  - Efecto: Actualiza `verified = true`, permitiendo que el contratista publique servicios

### 4. Reglas de permisos

| Acción | Rol Requerido | Validación Adicional |
|--------|---------------|---------------------|
| Crear perfil (`POST /api/contractors/profile`) | `CONTRACTOR` | No debe existir perfil previo para ese `userId` |
| Editar perfil (`PATCH /api/contractors/profile/me`) | `CONTRACTOR` | Solo el dueño puede editar su propio perfil |
| Ver perfil propio (`GET /api/contractors/profile/me`) | `CONTRACTOR` | Solo el dueño puede ver su perfil completo |
| Ver perfil público (`GET /api/contractors/:id`) | Público | Solo retorna campos públicos |
| Aprobar perfil (`PATCH /api/admin/contractors/:id/verify`) | `ADMIN` | Solo admins |
| Suspender perfil (futuro) | `ADMIN` | Fuera de alcance de este change |

### 5. Flujo de onboarding en UI (especificación, no implementación)

**Nota:** Este proposal define los contratos y lógica de backend. La implementación de UI será parte del siguiente sprint.

**Flujo esperado:**

1. Usuario se registra vía Clerk (`/sign-up`)
2. Webhook de Clerk (`/api/webhooks/clerk`) sincroniza usuario a BD con `role: CONTRACTOR` (si seleccionó "Soy contratista" en formulario de registro)
3. Post-registro, redirect a `/onboarding/contractor-profile`
4. Contratista completa formulario:
   - Nombre comercial (ej: "Plomería García")
   - Descripción del negocio (máx 500 caracteres)
   - Especialidades (checkbox: plomería, electricidad, carpintería, pintura, jardinería, limpieza, otros)
   - Áreas de servicio (texto libre, ej: "Guadalajara y Zapopan")
   - (Opcional) Subir documentos de verificación (INE, comprobante de domicilio) → guardar URLs en `verificationDocuments`
5. Al completar, se llama a `POST /api/contractors/profile`
6. Perfil queda en estado `DRAFT` (`verified: false`)
7. Redirect a `/dashboard/contractor` con mensaje: "Tu perfil está en revisión. Podrás publicar servicios cuando sea aprobado."
8. Admin revisa perfil y llama a `PATCH /api/admin/contractors/:id/verify` con `verified: true`
9. Contratista recibe notificación (email, futuro) y ya puede publicar servicios

### 6. Testing completo

- **Tests unitarios** (`apps/web/src/modules/contractors/__tests__/`):
  - `contractorProfileService.test.ts`: Casos de CRUD, validación de permisos, transiciones de estado
  - `contractorProfileRepository.test.ts`: Acceso a datos con Prisma mock
  - Cobertura objetivo: ≥ 75%

- **Tests de integración** (`tests/integration/api/contractors.test.ts`):
  - Endpoints `/api/contractors/profile`, `/api/contractors/:id`, `/api/admin/contractors/:id/verify`
  - Autorización: solo `role=CONTRACTOR` puede crear perfil, solo admin puede verificar
  - Validación de estado: no permitir crear perfil duplicado, no permitir editar perfil `ACTIVE` sin aprobación admin

- **Tests E2E** (manual, documentados en STP):
  - Flujo completo de onboarding de contratista
  - Edición de perfil desde dashboard
  - Aprobación de perfil por admin
  - Visualización de perfil público

- **Actualización del STP** (`docs/md/STP-ReparaYa.md`):
  - Nuevos casos de prueba: `TC-CONTRACTOR-001` a `TC-CONTRACTOR-012`
  - Documentación de procedimientos de prueba
  - Registro de resultados de ejecución

### 7. Actualización de specs

- **Crear** `/openspec/specs/profiles/profiles-contractor.md`:
  - Requisitos funcionales (RF-CONTRACTOR-001 a RF-CONTRACTOR-005)
  - Requisitos no funcionales (RNF-CONTRACTOR-001 a RNF-CONTRACTOR-003)
  - Modelo de datos (tabla `contractor_profiles`, relación 1:1 con `users`)
  - Reglas de permisos y seguridad
  - Plan de testing detallado
  - Diagramas de flujo de onboarding

- **Actualizar** `/openspec/project.md`:
  - Agregar módulo `contractors` en sección "Module Specifications"
  - Enlazar al spec nuevo `profiles-contractor`

## Context

### Current State

- ✅ **Auth/Clerk integración archivada**: Webhook de sincronización funcional, middleware de protección implementado
- ✅ **Schema Prisma completo**: Modelo `ContractorProfile` ya definido en BD
- ✅ **Módulo `auth` implementado**: Exporta `getCurrentUser`, `requireAuth`, `requireRole`
- ✅ **Módulo `users` implementado**: Onboarding de clientes funcional (change `client-profile-onboarding` archivado)
- ❌ **Módulo `contractors` vacío**: No existe aún, se creará en este change
- ❌ **Sin flujo de onboarding para contratistas**: Usuarios con `role=CONTRACTOR` no pueden completar perfil

### Dependencies

**Este change depende de:**
- ✅ `2025-11-16-auth-clerk-integration` (archivado - completado)
- ✅ `2025-11-17-client-profile-onboarding` (archivado - completado)
- ✅ Schema Prisma con tabla `ContractorProfile`

**Este change desbloquea:**
- `services-publishing`: Requiere perfiles de contratista para asociar servicios
- `catalog-search`: Requiere perfiles de contratista para mostrar quién ofrece cada servicio
- `booking-checkout`: Requiere perfiles de contratista para crear reservas
- `stripe-connect-contractor-payouts`: Change futuro para integrar Stripe Connect (usará campo `stripeConnectAccountId`)

### Problem Statement

Sin perfiles de contratista completos, no podemos implementar ninguna funcionalidad que dependa de:
- Información profesional del contratista (nombre comercial, descripción, especialidades)
- Estado de verificación (KYC) para habilitar publicación de servicios
- Relación 1:1 con servicios publicados (cada servicio debe pertenecer a un contratista)
- Preparación para Stripe Connect (campo `stripeConnectAccountId` debe existir y estar documentado)

Este change resuelve el problema implementando el flujo completo de onboarding, dejando la integración con Stripe Connect para un change futuro.

## Scope

### In Scope

1. ✅ Implementación completa del módulo `contractors` (servicios, repositorios, tipos, errores)
2. ✅ Endpoints API para gestión de perfiles de contratista
3. ✅ Validaciones con Zod para todos los inputs
4. ✅ Autorización: solo `role=CONTRACTOR` puede crear/editar su perfil, solo admin puede verificar
5. ✅ Tests unitarios, integración y E2E (≥ 75% cobertura)
6. ✅ Actualización del STP con casos `TC-CONTRACTOR-001` a `TC-CONTRACTOR-012`
7. ✅ Creación del spec `/openspec/specs/profiles/profiles-contractor.md`
8. ✅ Documentación de campos mínimos para Stripe Connect (sin implementarlo)
9. ✅ Documentación de cómo este perfil se relacionará con catálogo de servicios y bookings

### Out of Scope

1. ❌ **UI de onboarding**: Se define el contrato de API, pero la implementación de páginas Next.js queda para el siguiente sprint
2. ❌ **Integración con Stripe Connect**: No se implementa la creación de cuentas conectadas de Stripe, solo se documenta el campo `stripeConnectAccountId`
3. ❌ **Upload de documentos de verificación a S3**: No se implementa subida de imágenes/PDFs, solo URLs dummy en `verificationDocuments`
4. ❌ **Notificaciones por email**: No se envían emails de aprobación de perfil ni cambios de estado
5. ❌ **Publicación de servicios**: El módulo `services-publishing` será un change futuro
6. ❌ **Estado `SUSPENDED`**: Por ahora, solo manejamos `DRAFT` y `ACTIVE` (suspensión será un change futuro)

### Future Work

- Change futuro: `stripe-connect-contractor-payouts` (integración completa con Stripe Connect)
- Change futuro: `services-publishing` (catálogo de servicios ofrecidos por contratistas)
- Change futuro: `contractor-verification-documents-upload` (integración con AWS S3)
- Enhancement: Notificaciones transaccionales con AWS SES (aprobación de perfil, cambios de estado)
- Enhancement: Estado `SUSPENDED` para contratistas con mal comportamiento

## Success Criteria

Este change se considera completado cuando:

1. ✅ **Tests al 100%**:
   - Cobertura ≥ 75% en `src/modules/contractors`
   - Todos los casos de prueba `TC-CONTRACTOR-001` a `TC-CONTRACTOR-012` documentados en STP
   - Tests unitarios e integración ejecutados y pasando en CI/CD
   - Tests E2E ejecutados manualmente y documentados

2. ✅ **Endpoints funcionales**:
   - `POST /api/contractors/profile` crea perfil con validación de no duplicados
   - `GET /api/contractors/profile/me` retorna perfil completo del contratista autenticado
   - `PATCH /api/contractors/profile/me` actualiza perfil con validación Zod
   - `GET /api/contractors/:id` retorna solo datos públicos
   - `PATCH /api/admin/contractors/:id/verify` permite a admins aprobar perfiles

3. ✅ **Validaciones de seguridad**:
   - Solo `role=CONTRACTOR` puede crear/editar su perfil (test: usuario con `role=CLIENT` no puede crear perfil de contratista)
   - Solo `role=ADMIN` puede verificar perfiles (test: contratista no puede auto-aprobar su perfil)
   - Endpoints protegidos con middleware `requireAuth` y `requireRole`
   - Sin exposición de datos sensibles en endpoints públicos (`verificationDocuments`, `stripeConnectAccountId`)

4. ✅ **Documentación actualizada**:
   - `/openspec/specs/profiles/profiles-contractor.md` creado con requisitos formales y escenarios
   - `/docs/md/STP-ReparaYa.md` actualizado con sección 4.1.3 (casos TC-CONTRACTOR-*)
   - `/openspec/project.md` enlaza al nuevo spec en sección "Module Specifications"

5. ✅ **CI/CD pasa**:
   - `npm run test` ejecuta tests y cobertura
   - `npm run build` compila sin errores
   - CodeRabbit aprueba PR sin issues críticos

## Risks & Mitigations

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Schema Prisma requiere cambios** | Baja | Medio | El schema ya está validado. Solo usamos campos existentes. |
| **Conflicto con módulo de servicios** | Media | Alto | Documentar claramente la relación 1:N entre `ContractorProfile` y `Service` para el change futuro. |
| **Cobertura de tests < 75%** | Baja | Medio | Implementar tests en paralelo con código. Usar `npm run test:coverage` antes de PR. |
| **Sin integración con Stripe Connect** | Alta | Bajo | Marcar como "Out of Scope". Documentar campo `stripeConnectAccountId` para change futuro. |
| **UI de onboarding no lista** | Alta | Bajo | Este change solo implementa backend. UI será próximo sprint. |
| **Verificación KYC manual** | Alta | Medio | Por ahora, admins aprueban manualmente. En el futuro, integrar con servicio de KYC automatizado. |

## Dependencies

### Required Before Implementation

- ✅ Change `2025-11-16-auth-clerk-integration` archivado (completado)
- ✅ Change `2025-11-17-client-profile-onboarding` archivado (completado)
- ✅ Prisma schema con modelo `ContractorProfile`
- ✅ Módulo `auth` exportando `getCurrentUser`, `requireAuth`, `requireRole`

### Blocks These Changes

Este change desbloquea:
- `services-publishing`: Necesita perfiles de contratista para asociar servicios
- `catalog-search`: Necesita perfiles de contratista para mostrar información del proveedor
- `booking-checkout`: Necesita perfiles de contratista para crear reservas
- `stripe-connect-contractor-payouts`: Necesita campo `stripeConnectAccountId` documentado

## Handoff Notes

### Para el equipo de frontend (próximo sprint)

Cuando implementen la UI de onboarding, consideren:

1. **Flujo de redirects**:
   - Post-registro en Clerk → `/onboarding/contractor-profile`
   - Si ya completó onboarding → `/dashboard/contractor`
   - Usar localStorage o cookie para trackear estado de onboarding

2. **Formulario de perfil de contratista**:
   - Nombre comercial: max 100 caracteres
   - Descripción: textarea, max 500 caracteres
   - Especialidades: checkbox multiple (plomería, electricidad, carpintería, pintura, jardinería, limpieza, otros)
   - Áreas de servicio: input de texto libre, placeholder "Ej: Guadalajara y Zapopan"
   - Documentos de verificación: file upload (INE, comprobante domicilio) → subir a S3 y guardar URLs

3. **Validación en cliente**:
   - Usar los mismos schemas Zod exportados desde `src/modules/contractors/validators`
   - Mostrar errores de validación inline

4. **Dashboard de contratista**:
   - Mostrar estado de verificación: "En revisión" (`verified: false`) o "Aprobado" (`verified: true`)
   - Si no está aprobado, mostrar mensaje: "Tu perfil está en revisión. Podrás publicar servicios cuando sea aprobado."
   - Permitir editar perfil solo si está en estado `DRAFT`

### Para módulos downstream (services, booking, payments)

Este change garantiza que:

1. **Todos los contratistas tienen perfil profesional**:
   - `businessName`, `description`, `specialties` siempre presentes
   - `verified` indica si pasó KYC (solo contratistas con `verified: true` pueden publicar servicios)
   - Cada contratista tiene relación 1:1 con `users.id` vía `userId`

2. **Endpoints disponibles**:
   - `GET /api/contractors/:id` para mostrar información del contratista en servicios
   - `GET /api/contractors/profile/me` para obtener perfil completo del contratista autenticado

3. **Campos mínimos esperados**:
   - `ContractorProfile.id` (UUID) - Clave primaria para relaciones
   - `ContractorProfile.userId` (UUID) - FK a `users.id`
   - `ContractorProfile.businessName` - Siempre presente
   - `ContractorProfile.description` - Siempre presente
   - `ContractorProfile.specialties` - Array de strings (puede estar vacío)
   - `ContractorProfile.verified` - Boolean (false = DRAFT, true = ACTIVE)
   - `ContractorProfile.stripeConnectAccountId` - Opcional (NULL por ahora, llenado en change futuro)

4. **Relaciones futuras**:
   - `Service.contractorProfileId` → `ContractorProfile.id` (1:N)
   - `Booking.contractorId` → `User.id` (donde `User.role = CONTRACTOR`)
   - `Payment.contractorStripeAccountId` → `ContractorProfile.stripeConnectAccountId` (en change futuro)

### Para el change de Stripe Connect (futuro)

El flujo de integración con Stripe Connect será:

1. **Creación de cuenta conectada de Stripe**:
   - `POST /api/contractors/stripe/connect` (endpoint nuevo, fuera de este change)
   - Crear cuenta Express de Stripe Connect
   - Almacenar `stripeConnectAccountId` en `ContractorProfile`

2. **Onboarding de Stripe**:
   - Redirect a Stripe para completar formulario de KYC
   - Webhook de Stripe para actualizar estado de cuenta conectada

3. **Payouts**:
   - Cuando se completa un servicio, transferir fondos desde plataforma a cuenta conectada
   - Usar `ContractorProfile.stripeConnectAccountId` para identificar destinatario

Estos flujos quedan fuera del alcance de este change. Solo documentamos el campo `stripeConnectAccountId` para habilitarlo en el futuro.

### Cómo este perfil se relacionará con catálogo de servicios y bookings

**Relación con Servicios (`services-publishing`, change futuro):**

- Cada `Service` tendrá un campo `contractorProfileId` (FK → `ContractorProfile.id`)
- Un contratista puede publicar múltiples servicios (1:N)
- Solo contratistas con `verified: true` pueden publicar servicios
- Ejemplo de servicio:
  ```json
  {
    "id": "service-uuid",
    "contractorProfileId": "contractor-uuid",
    "title": "Reparación de fugas de agua",
    "description": "...",
    "price": 500.00,
    "category": "plomería"
  }
  ```

**Relación con Bookings (`booking-checkout`, change futuro):**

- Cada `Booking` tendrá un campo `contractorId` (FK → `User.id` donde `User.role = CONTRACTOR`)
- Se obtiene el perfil del contratista vía `ContractorProfile.userId = Booking.contractorId`
- Flujo:
  1. Cliente reserva un servicio
  2. Se crea `Booking` con `clientId` (cliente) y `contractorId` (dueño del servicio)
  3. Se obtiene información del contratista desde `ContractorProfile` para mostrar en la reserva
- Ejemplo:
  ```json
  {
    "id": "booking-uuid",
    "clientId": "client-user-uuid",
    "contractorId": "contractor-user-uuid",
    "serviceId": "service-uuid",
    "status": "pending"
  }
  ```

**Campos mínimos para habilitar Stripe Connect (sin implementarlo):**

| Campo | Tipo | Uso Futuro |
|-------|------|-----------|
| `stripeConnectAccountId` | String (nullable) | Almacenar ID de cuenta conectada de Stripe |
| `verified` | Boolean | Solo contratistas verificados pueden recibir payouts |
| `userId` | UUID | Vincular pagos y reservas con el contratista |

Referencia de Stripe Connect: https://stripe.com/docs/connect/express-accounts

## Testing Plan

### 1. Casos de Prueba a Agregar al STP

Los siguientes casos de prueba se documentarán en `/docs/md/STP-ReparaYa.md`, sección 4.1.3 (Perfiles de Contratista):

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| **TC-CONTRACTOR-001** | Crear perfil de contratista (POST /api/contractors/profile) | Integración | Alta | RF-CONTRACTOR-001 |
| **TC-CONTRACTOR-002** | No permitir crear perfil duplicado para el mismo userId | Integración | Alta | RF-CONTRACTOR-001 |
| **TC-CONTRACTOR-003** | Usuario con role=CLIENT no puede crear perfil de contratista | Integración | Alta | RF-CONTRACTOR-002 |
| **TC-CONTRACTOR-004** | Obtener perfil del contratista autenticado (GET /api/contractors/profile/me) | Integración | Alta | RF-CONTRACTOR-002 |
| **TC-CONTRACTOR-005** | Actualizar perfil de contratista (PATCH /api/contractors/profile/me) | Integración | Alta | RF-CONTRACTOR-002 |
| **TC-CONTRACTOR-006** | Obtener perfil público de contratista (GET /api/contractors/:id) | Integración | Alta | RF-CONTRACTOR-003 |
| **TC-CONTRACTOR-007** | Endpoint público no expone datos sensibles (verificationDocuments, stripeConnectAccountId) | Integración | Alta | RNF-CONTRACTOR-001 |
| **TC-CONTRACTOR-008** | Admin aprueba perfil de contratista (PATCH /api/admin/contractors/:id/verify) | Integración | Alta | RF-CONTRACTOR-004 |
| **TC-CONTRACTOR-009** | Contratista no puede auto-aprobar su perfil | Integración | Alta | RF-CONTRACTOR-004 |
| **TC-CONTRACTOR-010** | Validación de datos con Zod en creación de perfil | Unitaria | Alta | RNF-CONTRACTOR-002 |
| **TC-CONTRACTOR-011** | Transición de estado DRAFT → ACTIVE al aprobar perfil | Unitaria | Alta | RF-CONTRACTOR-005 |
| **TC-CONTRACTOR-012** | Campo stripeConnectAccountId es NULL por defecto | Unitaria | Media | RF-CONTRACTOR-006 |

**Requisitos funcionales definidos:**
- **RF-CONTRACTOR-001**: El sistema DEBE permitir que un usuario con `role=CONTRACTOR` cree su perfil profesional
- **RF-CONTRACTOR-002**: El sistema DEBE permitir que un contratista edite su perfil solo si está en estado `DRAFT`
- **RF-CONTRACTOR-003**: El sistema DEBE permitir que cualquier usuario vea el perfil público de un contratista
- **RF-CONTRACTOR-004**: El sistema DEBE permitir que un admin apruebe perfiles de contratista
- **RF-CONTRACTOR-005**: El sistema DEBE implementar estados de verificación (`DRAFT`, `ACTIVE`)
- **RF-CONTRACTOR-006**: El sistema DEBE preparar el campo `stripeConnectAccountId` para integración futura con Stripe Connect

**Requisitos no funcionales definidos:**
- **RNF-CONTRACTOR-001**: Los endpoints públicos NO DEBEN exponer datos sensibles
- **RNF-CONTRACTOR-002**: Todas las entradas DEBEN ser validadas con Zod
- **RNF-CONTRACTOR-003**: Cobertura de código ≥ 75% en el módulo `contractors`

### 2. Criterios de Aceptación

- ✅ Cobertura de código ≥ 75% en el módulo `src/modules/contractors`
- ✅ Todos los casos de prueba `TC-CONTRACTOR-001` a `TC-CONTRACTOR-012` pasan
- ✅ Tests de autorización verifican que solo `role=CONTRACTOR` puede crear perfil y solo `role=ADMIN` puede verificar
- ✅ Validaciones de Zod rechazan inputs inválidos con errores descriptivos
- ✅ Endpoint público `/api/contractors/:id` no expone datos sensibles (`verificationDocuments`, `stripeConnectAccountId`)
- ✅ Campo `stripeConnectAccountId` está documentado pero siempre es NULL (no se implementa Stripe Connect)
- ✅ CI/CD ejecuta tests y pasa sin errores

### 3. Estrategia de Implementación de Tests

**Archivos de test a crear:**

```
apps/web/src/modules/contractors/__tests__/
├── contractorProfileService.test.ts   # Tests unitarios de servicios
├── contractorProfileRepository.test.ts # Tests de acceso a datos (con Prisma mock)
└── validators.test.ts                  # Tests de schemas Zod

tests/integration/api/
├── contractors.test.ts                 # Tests de integración de endpoints
└── admin/
    └── contractorVerification.test.ts  # Tests de endpoint de admin
```

**Mocks y fixtures:**

- Mock de Clerk para autenticación:
  - Usar `jest.mock('@clerk/nextjs')` para simular `auth()` y `currentUser()`
  - Fixtures de usuarios de prueba con `role=CONTRACTOR` y `role=ADMIN`

- Mock de Prisma:
  - Usar `jest.mock('@prisma/client')` para tests unitarios
  - Para tests de integración, usar base de datos de test (PostgreSQL en Docker o Supabase test project)

- Fixtures de datos:
  - `contractorProfileFixtures.ts`: Perfiles de prueba con diferentes estados (`verified: true/false`)
  - `userFixtures.ts`: Usuarios de prueba con `role=CONTRACTOR`

**Integraciones externas:**

- **Clerk**: Usar ambiente de test con usuarios de prueba
- **Prisma**: Usar `DATABASE_URL` de test (PostgreSQL local o Supabase test)
- **Sin integraciones externas adicionales**: Este módulo no toca Stripe, AWS S3 ni Amazon Location

### 4. Procedimientos de Prueba

**Tests unitarios:**
```bash
npm run test -- src/modules/contractors
```

**Tests de integración:**
```bash
npm run test -- tests/integration/api/contractors.test.ts
```

**Verificación de cobertura:**
```bash
npm run test:coverage
# Verificar que src/modules/contractors tenga ≥ 75%
```

**Tests E2E (manual):**
1. Registrarse como nuevo usuario con `role=CONTRACTOR` vía `/sign-up`
2. Verificar redirect a onboarding
3. Completar perfil de contratista con nombre comercial, descripción, especialidades
4. Verificar que perfil queda en estado `DRAFT` (`verified: false`)
5. Iniciar sesión como admin
6. Aprobar perfil vía endpoint `/api/admin/contractors/:id/verify`
7. Verificar que perfil cambia a estado `ACTIVE` (`verified: true`)
8. Verificar que perfil público no expone datos sensibles

### 5. Casos de Prueba de Seguridad

| Caso | Procedimiento | Resultado Esperado |
|------|--------------|-------------------|
| **Autorización por rol** | Usuario con `role=CLIENT` intenta `POST /api/contractors/profile` | 403 Forbidden |
| **Endpoint público** | `GET /api/contractors/:id` | Solo retorna `businessName`, `description`, `specialties`, `verified` (sin `verificationDocuments`, `stripeConnectAccountId`) |
| **Sin auth** | Llamar `GET /api/contractors/profile/me` sin header de autenticación | 401 Unauthorized |
| **Auto-aprobación** | Contratista intenta `PATCH /api/admin/contractors/:id/verify` con su propio ID | 403 Forbidden |
| **Input sanitization** | Enviar HTML en `businessName`: `<script>alert('xss')</script>` | Zod rechaza con error de validación |

### 6. Criterios de Éxito para CI/CD

El PR será aprobado solo si:
- ✅ Todos los tests pasan (`npm run test`)
- ✅ Cobertura ≥ 75% en `src/modules/contractors`
- ✅ Build exitoso (`npm run build`)
- ✅ Linter pasa sin errores (`npm run lint`)
- ✅ CodeRabbit no reporta issues críticos

## Timeline

**Estimación de esfuerzo:** 3-4 días de desarrollo + 1 día de testing y documentación

| Fase | Duración | Entregables |
|------|----------|-------------|
| **Diseño y spec** | 0.5 días | Este proposal.md + spec nuevo |
| **Implementación de servicios** | 1 día | `contractorProfileService.ts`, repositorios |
| **Implementación de endpoints** | 1 día | API routes en `/api/contractors/*` y `/api/admin/contractors/*` |
| **Tests unitarios e integración** | 1.5 días | Tests en `__tests__/` y `tests/integration/` |
| **Actualización de STP** | 0.5 días | Documentar casos TC-CONTRACTOR-* |
| **Revisión y ajustes** | 0.5 días | Code review, fixes de CodeRabbit |
| **Total** | **5 días** | Change listo para `/openspec:apply` y merge a dev |

## Approval

- [ ] Architecture Team
- [ ] QA Lead
- [ ] Product Owner

---

**Next Steps:**
1. Obtener aprobación de este proposal
2. Ejecutar `/openspec:apply` para iniciar implementación
3. Crear PR hacia `dev` cuando tests pasen
4. Ejecutar `/openspec:archive` cuando PR sea mergeado
