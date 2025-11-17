# Proposal: Client Profile Onboarding

**Change ID:** `2025-11-17-client-profile-onboarding`
**Status:** Proposed
**Created:** 2025-11-17
**Owner:** Architecture Team

## Why

Actualmente, ReparaYa tiene integrada la autenticación con Clerk (change `auth-clerk-integration` archivado), la cual sincroniza automáticamente usuarios a la base de datos PostgreSQL cuando se registran. Sin embargo, el flujo de onboarding está incompleto:

1. **No hay selección de tipo de usuario**: Cuando un usuario se registra vía Clerk, no se pregunta si es cliente o contratista. El campo `role` en la tabla `users` se establece por defecto como `CLIENT`.

2. **Módulo `users` no implementado**: Aunque existe el spec `/openspec/specs/users/spec.md` y el schema Prisma tiene las tablas necesarias (`User`, `ContractorProfile`, `Address`), el código del módulo `users` no está implementado (solo existe un README placeholder en `/apps/web/src/modules/users/`).

3. **Sin perfil adicional para clientes**: Los datos básicos vienen de Clerk (`firstName`, `lastName`, `email`, `avatarUrl`), pero no hay endpoints ni lógica para que un cliente complete información adicional como teléfono, dirección por defecto, o preferencias.

Este change implementa el **flujo de onboarding completo para clientes** (contratistas se dejarán para un change futuro), permitiendo que al registrarse, un usuario pueda:
- Indicar que es un cliente
- Completar su perfil con información adicional (teléfono, dirección)
- Consultar y editar su perfil posteriormente

Esto desbloquea los módulos de reservas (`booking`), mensajería (`messaging`) y calificaciones (`ratings`), que dependen de perfiles de usuario completos.

## What Changes

### 1. Implementación del módulo `users`

- **Servicios de dominio** (`apps/web/src/modules/users/services/`):
  - `userService.ts`: CRUD de perfiles de usuario, validación de permisos
  - `addressService.ts`: Gestión de direcciones del cliente

- **Repositorios** (`apps/web/src/modules/users/repositories/`):
  - `userRepository.ts`: Acceso a datos vía Prisma para modelo `User`
  - `addressRepository.ts`: Acceso a datos vía Prisma para modelo `Address`

- **Tipos y validadores** (`apps/web/src/modules/users/types/`):
  - DTOs para request/response de endpoints
  - Schemas Zod para validación runtime

- **Errores** (`apps/web/src/modules/users/errors/`):
  - `UserNotFoundError`
  - `AddressNotFoundError`
  - Integración con el sistema de errores de `auth` module

### 2. Endpoints API para gestión de perfiles

- **`GET /api/users/me`**: Obtener perfil del usuario autenticado
  - Autorización: Usuario autenticado (middleware `requireAuth`)
  - Respuesta: Perfil completo con direcciones

- **`PATCH /api/users/me`**: Actualizar perfil del usuario autenticado
  - Autorización: Usuario autenticado
  - Body: `{ phone?, firstName?, lastName?, avatarUrl? }`
  - Validación: Zod schema

- **`POST /api/users/me/addresses`**: Crear nueva dirección para el usuario
  - Autorización: Usuario autenticado
  - Body: `{ addressLine1, addressLine2?, city, state, postalCode, isDefault? }`
  - Si `isDefault: true`, se desactiva el flag en otras direcciones del usuario

- **`PATCH /api/users/me/addresses/:id`**: Actualizar dirección existente
  - Autorización: Usuario autenticado y dueño de la dirección
  - Body: Campos actualizables de `Address`

- **`DELETE /api/users/me/addresses/:id`**: Eliminar dirección
  - Autorización: Usuario autenticado y dueño de la dirección
  - Validación: No permitir eliminar si es la única dirección del usuario

- **`GET /api/users/:id/public`**: Obtener perfil público de un usuario
  - Autorización: Público (sin auth)
  - Respuesta: `{ id, firstName, lastName, avatarUrl }` (sin datos sensibles)
  - Caso de uso: Mostrar nombre/foto del contratista en un servicio

### 3. Flujo de onboarding en UI (especificación, no implementación)

**Nota:** Este proposal define los contratos y lógica de backend. La implementación de UI será parte del siguiente sprint.

**Flujo esperado:**

1. Usuario se registra vía Clerk (`/sign-up`)
2. Webhook de Clerk (`/api/webhooks/clerk`) sincroniza usuario a BD con `role: CLIENT` (comportamiento actual)
3. Post-registro, redirect a `/onboarding/role-selection`
4. Usuario selecciona "Soy cliente" o "Soy contratista"
   - Si selecciona "Soy cliente": redirect a `/onboarding/client-profile`
   - Si selecciona "Soy contratista": mostrar mensaje "Próximamente" y redirect a `/dashboard`
5. En `/onboarding/client-profile`, el cliente completa:
   - Teléfono (opcional)
   - Dirección principal (addressLine1, city, state, postalCode)
6. Al completar, se llama a `PATCH /api/users/me` y `POST /api/users/me/addresses`
7. Redirect a `/dashboard`

### 4. Testing completo

- **Tests unitarios** (`apps/web/src/modules/users/__tests__/`):
  - `userService.test.ts`: Casos de CRUD, validación de permisos
  - `addressService.test.ts`: Gestión de direcciones, flag `isDefault`
  - Cobertura objetivo: ≥ 75%

- **Tests de integración** (`tests/integration/api/users.test.ts`):
  - Endpoints `/api/users/me` y `/api/users/:id/public`
  - Autorización: usuario autenticado puede editar su perfil, pero no el de otros
  - Gestión de direcciones con flag `isDefault`

- **Tests E2E** (manual, documentados en STP):
  - Flujo completo de onboarding de cliente
  - Edición de perfil desde dashboard
  - Visualización de perfil público

- **Actualización del STP** (`docs/md/STP-ReparaYa.md`):
  - Nuevos casos de prueba: `TC-USER-001` a `TC-USER-010`
  - Documentación de procedimientos de prueba
  - Registro de resultados de ejecución

### 5. Actualización de specs

- **Reescribir** `/openspec/specs/users/spec.md`:
  - Convertir TODOs en requisitos formales con formato OpenSpec
  - Agregar escenarios concretos (Scenarios)
  - Definir plan de testing detallado
  - Incluir diagramas de flujo de onboarding

- **Actualizar** `/openspec/project.md`:
  - Marcar módulo `users` como "Active" en lugar de "Pendiente de definición"
  - Enlazar al spec actualizado

## Context

### Current State

- ✅ **Auth/Clerk integración archivada**: Webhook de sincronización funcional, middleware de protección implementado
- ✅ **Schema Prisma completo**: Modelos `User`, `ContractorProfile`, `Address` ya definidos en BD
- ✅ **Módulo `auth` implementado**: Exporta `getCurrentUser`, `requireAuth`, `requireRole`
- ❌ **Módulo `users` vacío**: Solo README placeholder, sin servicios ni endpoints
- ❌ **Sin flujo de onboarding**: Usuarios se registran pero no completan perfil

### Dependencies

**Este change depende de:**
- ✅ `2025-11-16-auth-clerk-integration` (archivado - completado)
- ✅ Schema Prisma con tablas `User`, `ContractorProfile`, `Address`

**Este change desbloquea:**
- `booking-checkout`: Requiere perfiles completos de cliente para crear reservas
- `messaging`: Requiere nombres/avatares de usuarios para hilos de conversación
- `ratings`: Requiere perfiles públicos para mostrar quién calificó a quién
- `contractor-profile-onboarding`: Change futuro para onboarding de contratistas

### Problem Statement

Sin perfiles de usuario completos, no podemos implementar ninguna funcionalidad que dependa de:
- Direcciones de cliente (para calcular distancias a servicios, enviar cotizaciones)
- Teléfono de contacto (para notificaciones, soporte)
- Información pública del usuario (para mostrar en servicios, calificaciones)
- Diferenciación entre clientes y contratistas (para mostrar/ocultar funcionalidades)

Este change resuelve el problema para **clientes únicamente**, dejando el onboarding de contratistas (con verificación KYC, Stripe Connect, etc.) para un change futuro.

## Scope

### In Scope

1. ✅ Implementación completa del módulo `users` (servicios, repositorios, tipos, errores)
2. ✅ Endpoints API para gestión de perfiles y direcciones
3. ✅ Validaciones con Zod para todos los inputs
4. ✅ Autorización: solo el dueño puede editar su perfil
5. ✅ Tests unitarios, integración y E2E (≥ 75% cobertura)
6. ✅ Actualización del STP con casos TC-USER-001 a TC-USER-010
7. ✅ Reescritura del spec `/openspec/specs/users/spec.md`
8. ✅ Documentación de contratos de API y flujos de onboarding

### Out of Scope

1. ❌ **UI de onboarding**: Se define el contrato de API, pero la implementación de páginas Next.js queda para el siguiente sprint
2. ❌ **Onboarding de contratistas**: No se implementa el flujo de `ContractorProfile`, verificación KYC, ni integración con Stripe Connect
3. ❌ **Geocodificación de direcciones**: No se integra con Amazon Location Service para obtener `lat`/`lng` (queda para change futuro)
4. ❌ **Upload de avatar a S3**: No se implementa subida de imágenes, solo URL del avatar de Clerk
5. ❌ **Notificaciones por email**: No se envían emails de bienvenida ni confirmación de perfil

### Future Work

- Change futuro: `contractor-profile-onboarding` (verificación KYC, Stripe Connect, especialidades)
- Change futuro: `address-geocoding` (integración con Amazon Location Service)
- Change futuro: `avatar-upload` (integración con AWS S3)
- Enhancement: Notificaciones transaccionales con AWS SES

## Success Criteria

Este change se considera completado cuando:

1. ✅ **Tests al 100%**:
   - Cobertura ≥ 75% en `src/modules/users`
   - Todos los casos de prueba `TC-USER-001` a `TC-USER-010` documentados en STP
   - Tests unitarios e integración ejecutados y pasando en CI/CD
   - Tests E2E ejecutados manualmente y documentados

2. ✅ **Endpoints funcionales**:
   - `GET /api/users/me` retorna perfil completo con direcciones
   - `PATCH /api/users/me` actualiza perfil con validación Zod
   - `POST /api/users/me/addresses` crea direcciones con flag `isDefault`
   - `DELETE /api/users/me/addresses/:id` valida que no se elimine la única dirección
   - `GET /api/users/:id/public` retorna solo datos públicos

3. ✅ **Validaciones de seguridad**:
   - Solo el dueño puede editar su perfil (test: usuario A no puede editar perfil de usuario B)
   - Endpoints protegidos con middleware `requireAuth`
   - Sin exposición de datos sensibles en endpoints públicos

4. ✅ **Documentación actualizada**:
   - `/openspec/specs/users/spec.md` reescrito con requisitos formales y escenarios
   - `/docs/md/STP-ReparaYa.md` actualizado con sección 4.1.2 (casos TC-USER-*)
   - `/openspec/project.md` marca módulo `users` como "Active"

5. ✅ **CI/CD pasa**:
   - `npm run test` ejecuta tests y cobertura
   - `npm run build` compila sin errores
   - CodeRabbit aprueba PR sin issues críticos

## Risks & Mitigations

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| **Schema Prisma requiere cambios** | Baja | Medio | El schema ya está validado en change anterior. Solo usamos campos existentes. |
| **Conflicto con webhook de Clerk** | Media | Alto | Tests de integración verifican que webhook no sobrescriba datos editados manualmente. |
| **Cobertura de tests < 75%** | Baja | Medio | Implementar tests en paralelo con código. Usar `npm run test:coverage` antes de PR. |
| **Falta de geocodificación** | Alta | Bajo | Marcar como "Out of Scope". Los campos `lat`/`lng` en Address son opcionales. |
| **UI de onboarding no lista** | Alta | Bajo | Este change solo implementa backend. UI será próximo sprint. |

## Dependencies

### Required Before Implementation

- ✅ Change `2025-11-16-auth-clerk-integration` archivado (completado)
- ✅ Prisma schema con modelos `User`, `ContractorProfile`, `Address`
- ✅ Módulo `auth` exportando `getCurrentUser`, `requireAuth`

### Blocks These Changes

Este change desbloquea:
- `booking-checkout`: Necesita direcciones de cliente
- `reservation-lifecycle-messaging`: Necesita nombres/avatares
- `ratings-reviews`: Necesita perfiles públicos
- `contractor-profile-onboarding`: Flujo similar pero para contratistas

## Handoff Notes

### Para el equipo de frontend (próximo sprint)

Cuando implementen la UI de onboarding, consideren:

1. **Flujo de redirects**:
   - Post-registro en Clerk → `/onboarding/role-selection`
   - Si ya completó onboarding → `/dashboard`
   - Usar localStorage o cookie para trackear estado de onboarding

2. **Formulario de perfil de cliente**:
   - Teléfono: validación de formato mexicano (10 dígitos)
   - Dirección: autocompletado con Google Places API (opcional, mejora UX)
   - Avatar: mostrar el de Clerk, permitir edición futura

3. **Validación en cliente**:
   - Usar los mismos schemas Zod exportados desde `src/modules/users/validators`
   - Mostrar errores de validación inline

### Para módulos downstream (booking, messaging, ratings)

Este change garantiza que:

1. **Todos los clientes tienen perfil básico**:
   - `firstName`, `lastName`, `email` vienen de Clerk (siempre presentes)
   - `phone` es opcional (validar antes de usarlo)
   - Cada cliente tiene al menos una dirección (si completó onboarding)

2. **Endpoints disponibles**:
   - `GET /api/users/:id/public` para mostrar nombre/avatar en servicios
   - `GET /api/users/me` para obtener direcciones del cliente autenticado

3. **Campos mínimos esperados**:
   - `User.id` (UUID) - Clave primaria para relaciones
   - `User.firstName`, `User.lastName` - Siempre presentes
   - `User.phone` - Opcional (validar con `?.` o nullish coalescing)
   - `User.avatarUrl` - Opcional (usar placeholder si es null)

4. **Relaciones futuras**:
   - `Booking.clientId` → `User.id`
   - `Message.senderId` → `User.id`
   - `Rating.userId` → `User.id`

### Para el change de contratistas (futuro)

El flujo de onboarding de contratistas será similar pero incluirá:

1. **Creación de `ContractorProfile`**:
   - `POST /api/users/contractor-profile`
   - Campos: `businessName`, `description`, `specialties[]`
   - Upload de documentos de verificación a S3

2. **Integración con Stripe Connect**:
   - Crear cuenta conectada de Stripe
   - Almacenar `stripeConnectAccountId` en `ContractorProfile`

3. **Flujo de verificación KYC**:
   - Admins revisan documentos
   - Actualizan campo `verified: true`
   - Envío de email de aprobación

Estos flujos quedan fuera del alcance de este change.

## Testing Plan

### 1. Casos de Prueba a Agregar al STP

Los siguientes casos de prueba se documentarán en `/docs/md/STP-ReparaYa.md`, sección 4.1.2 (Gestión de Usuarios):

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| **TC-USER-001** | Obtener perfil de usuario autenticado (GET /api/users/me) | Integración | Alta | RF-003 |
| **TC-USER-002** | Actualizar perfil de usuario autenticado (PATCH /api/users/me) | Integración | Alta | RF-003 |
| **TC-USER-003** | Usuario no puede editar perfil de otro usuario | Integración | Alta | RF-003 |
| **TC-USER-004** | Obtener perfil público de usuario (GET /api/users/:id/public) | Integración | Alta | RF-003 |
| **TC-USER-005** | Crear dirección para usuario autenticado (POST /api/users/me/addresses) | Integración | Alta | RF-003 |
| **TC-USER-006** | Actualizar dirección existente (PATCH /api/users/me/addresses/:id) | Integración | Media | RF-003 |
| **TC-USER-007** | Eliminar dirección (DELETE /api/users/me/addresses/:id) | Integración | Media | RF-003 |
| **TC-USER-008** | No permitir eliminar única dirección del usuario | Integración | Alta | BR-001 |
| **TC-USER-009** | Flag isDefault se desactiva en otras direcciones al crear nueva como default | Unitaria | Alta | BR-002 |
| **TC-USER-010** | Validación de datos con Zod en actualización de perfil | Unitaria | Alta | RNF-001 |

**Reglas de negocio definidas:**
- **BR-001**: Un cliente debe tener al menos una dirección si ha completado onboarding
- **BR-002**: Solo una dirección puede ser `isDefault: true` por usuario

### 2. Criterios de Aceptación

- ✅ Cobertura de código ≥ 75% en el módulo `src/modules/users`
- ✅ Todos los casos de prueba `TC-USER-001` a `TC-USER-010` pasan
- ✅ Tests de autorización verifican que solo el dueño puede editar su perfil
- ✅ Validaciones de Zod rechazan inputs inválidos con errores descriptivos
- ✅ Endpoint público `/api/users/:id/public` no expone datos sensibles (phone, email)
- ✅ CI/CD ejecuta tests y pasa sin errores

### 3. Estrategia de Implementación de Tests

**Archivos de test a crear:**

```
apps/web/src/modules/users/__tests__/
├── userService.test.ts         # Tests unitarios de servicios
├── addressService.test.ts      # Tests unitarios de gestión de direcciones
├── userRepository.test.ts      # Tests de acceso a datos (con Prisma mock)
└── addressRepository.test.ts   # Tests de acceso a datos

tests/integration/api/
└── users.test.ts               # Tests de integración de endpoints
```

**Mocks y fixtures:**

- Mock de Clerk para autenticación:
  - Usar `jest.mock('@clerk/nextjs')` para simular `auth()` y `currentUser()`
  - Fixtures de usuarios de prueba con diferentes roles (CLIENT, CONTRACTOR, ADMIN)

- Mock de Prisma:
  - Usar `jest.mock('@prisma/client')` para tests unitarios
  - Para tests de integración, usar base de datos de test (PostgreSQL en Docker o Supabase test project)

- Fixtures de datos:
  - `userFixtures.ts`: Usuarios de prueba con diferentes estados
  - `addressFixtures.ts`: Direcciones de prueba con/sin geocodificación

**Integraciones externas:**

- **Clerk**: Usar ambiente de test con usuarios de prueba
- **Prisma**: Usar `DATABASE_URL` de test (PostgreSQL local o Supabase test)
- **Sin integraciones externas adicionales**: Este módulo no toca Stripe, AWS S3 ni Amazon Location

### 4. Procedimientos de Prueba

**Tests unitarios:**
```bash
npm run test -- src/modules/users
```

**Tests de integración:**
```bash
npm run test -- tests/integration/api/users.test.ts
```

**Verificación de cobertura:**
```bash
npm run test:coverage
# Verificar que src/modules/users tenga ≥ 75%
```

**Tests E2E (manual):**
1. Registrarse como nuevo usuario vía `/sign-up`
2. Verificar redirect a onboarding
3. Completar perfil de cliente
4. Verificar que datos se guardan correctamente en `/dashboard`
5. Editar perfil y verificar actualización
6. Crear nueva dirección y verificar flag `isDefault`

### 5. Casos de Prueba de Seguridad

| Caso | Procedimiento | Resultado Esperado |
|------|--------------|-------------------|
| **Autorización** | Usuario A intenta `PATCH /api/users/:userB_id` | 403 Forbidden |
| **Endpoint público** | `GET /api/users/:id/public` | Solo retorna `firstName`, `lastName`, `avatarUrl` (sin `email`, `phone`) |
| **Sin auth** | Llamar `GET /api/users/me` sin header de autenticación | 401 Unauthorized |
| **Input sanitization** | Enviar HTML en `firstName`: `<script>alert('xss')</script>` | Zod rechaza con error de validación |

### 6. Criterios de Éxito para CI/CD

El PR será aprobado solo si:
- ✅ Todos los tests pasan (`npm run test`)
- ✅ Cobertura ≥ 75% en `src/modules/users`
- ✅ Build exitoso (`npm run build`)
- ✅ Linter pasa sin errores (`npm run lint`)
- ✅ CodeRabbit no reporta issues críticos

## Timeline

**Estimación de esfuerzo:** 3-4 días de desarrollo + 1 día de testing y documentación

| Fase | Duración | Entregables |
|------|----------|-------------|
| **Diseño y spec** | 0.5 días | Este proposal.md + spec actualizado |
| **Implementación de servicios** | 1 día | `userService.ts`, `addressService.ts`, repositorios |
| **Implementación de endpoints** | 1 día | API routes en `/api/users/*` |
| **Tests unitarios e integración** | 1.5 días | Tests en `__tests__/` y `tests/integration/` |
| **Actualización de STP** | 0.5 días | Documentar casos TC-USER-* |
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
