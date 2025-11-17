# Spec: Clerk Authentication Integration

**Module:** auth
**Capability:** auth-clerk-integration
**Version:** 1.0
**Status:** Proposed
**Last Updated:** 2025-11-16

## Purpose and Scope

Esta especificación define la integración de Clerk como sistema de autenticación y autorización para la plataforma ReparaYa. Clerk será responsable de:

- Gestión de identidades de usuario (sign-up, sign-in, sign-out)
- Manejo de sesiones seguras en Next.js App Router
- Sincronización de usuarios entre Clerk y la base de datos de aplicación (PostgreSQL vía Prisma)
- Fundamentos para control de acceso basado en roles (RBAC)

### In Scope

- Configuración de Clerk SDK en Next.js 14 App Router
- Rutas de autenticación (`/sign-in`, `/sign-up`)
- Middleware de protección de rutas privadas
- Webhook de sincronización de usuarios
- Utilities para obtener usuario autenticado y verificar roles
- Tests unitarios, de integración y E2E del módulo de autenticación

### Out of Scope

- Lógica de perfiles de usuario (pertenece al módulo `users`)
- OAuth providers (feature futura)
- Autenticación multifactor (feature futura)
- Recuperación de contraseña (manejado por Clerk directamente)
- UI/UX custom para sign-in/sign-up (se usarán componentes pre-construidos de Clerk con estilos básicos)

---

## ADDED Requirements

### Requirement: AUTH-001 - The system SHALL configure Clerk SDK with required environment variables

**Priority:** HIGH
**Type:** Technical Setup

The system MUST configure Clerk SDK in the Next.js application with the following environment variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Publishable key de Clerk (cliente)
- `CLERK_SECRET_KEY`: Secret key de Clerk (servidor)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`: URL de página de sign-in (default: `/sign-in`)
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`: URL de página de sign-up (default: `/sign-up`)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`: Redirect tras sign-in exitoso (default: `/dashboard`)
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`: Redirect tras sign-up exitoso (default: `/dashboard`)
- `CLERK_WEBHOOK_SECRET`: Secret para verificar firma de webhooks

El sistema DEBE validar que todas las variables críticas estén presentes al iniciar la aplicación y DEBE fallar con error claro si falta alguna.

#### Scenario: Variables de entorno presentes

**Given** todas las variables de entorno de Clerk están configuradas en `.env.local`
**When** el desarrollador ejecuta `npm run dev`
**Then** la aplicación inicia sin errores relacionados con configuración de Clerk
**And** Clerk SDK se inicializa correctamente

#### Scenario: Variable crítica faltante

**Given** la variable `CLERK_SECRET_KEY` no está definida en el ambiente
**When** la aplicación intenta iniciar
**Then** el sistema DEBE lanzar un error con mensaje: "Missing required environment variable: CLERK_SECRET_KEY"
**And** la aplicación NO DEBE iniciar

---

### Requirement: AUTH-002 - The system SHALL provide user registration via /sign-up route

**Priority:** HIGH
**Type:** Functional

The system MUST provide a `/sign-up` route that allows users to create an account with email and password.

Criterios:
- Usuario provee email, contraseña, nombre y apellido
- Email debe ser único (validado por Clerk)
- Contraseña debe cumplir política mínima de seguridad de Clerk (≥8 caracteres)
- Tras registro exitoso, usuario es redirigido a `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
- Sesión es creada automáticamente tras registro (usuario queda autenticado)

#### Scenario: Registro exitoso con credenciales válidas

**Given** el usuario navega a `/sign-up`
**And** el usuario ingresa email "juan@example.com" (no registrado previamente)
**And** el usuario ingresa nombre "Juan" y apellido "Pérez"
**And** el usuario ingresa contraseña "SecurePass123"
**When** el usuario envía el formulario de registro
**Then** Clerk crea la cuenta exitosamente
**And** el sistema redirige al usuario a `/dashboard`
**And** la sesión del usuario está activa
**And** un evento `user.created` es enviado al webhook

#### Scenario: Registro fallido - email duplicado

**Given** el usuario navega a `/sign-up`
**And** existe una cuenta con email "juan@example.com"
**When** el usuario intenta registrarse con el mismo email
**Then** Clerk muestra error: "Email already in use"
**And** el formulario NO es enviado
**And** el usuario permanece en `/sign-up`

#### Scenario: Registro fallido - contraseña débil

**Given** el usuario navega a `/sign-up`
**When** el usuario ingresa contraseña "123"
**Then** Clerk muestra error: "Password must be at least 8 characters"
**And** el formulario NO es enviado

---

### Requirement: AUTH-003 - The system SHALL provide user authentication via /sign-in route

**Priority:** HIGH
**Type:** Functional

The system MUST provide a `/sign-in` route that allows users to authenticate with email and password.

Criterios:
- Usuario provee email y contraseña
- Clerk valida credenciales
- Tras login exitoso, usuario es redirigido a `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- Sesión es creada y persiste en cookies seguras (httpOnly, secure en producción)

#### Scenario: Login exitoso con credenciales válidas

**Given** existe un usuario registrado con email "juan@example.com" y contraseña "SecurePass123"
**And** el usuario navega a `/sign-in`
**When** el usuario ingresa email "juan@example.com" y contraseña "SecurePass123"
**And** el usuario envía el formulario
**Then** Clerk valida las credenciales exitosamente
**And** el sistema redirige al usuario a `/dashboard`
**And** la sesión del usuario está activa
**And** cookies de sesión están presentes en el navegador

#### Scenario: Login fallido - credenciales inválidas

**Given** el usuario navega a `/sign-in`
**When** el usuario ingresa email "juan@example.com" y contraseña "WrongPassword"
**And** el usuario envía el formulario
**Then** Clerk muestra error: "Invalid credentials"
**And** el usuario permanece en `/sign-in`
**And** NO se crea sesión

---

### Requirement: AUTH-004 - The system SHALL implement middleware to protect private routes

**Priority:** HIGH
**Type:** Security

The system MUST implement middleware in Next.js that protects private routes and redirects unauthenticated users to `/sign-in`.

Rutas protegidas (requieren sesión):
- `/dashboard`
- `/perfil`
- `/reservas/*`
- `/mensajes/*`
- `/servicios/nuevo` (solo contratistas)
- `/admin/*` (solo administradores)

Rutas públicas (accesibles sin sesión):
- `/` (landing)
- `/sign-in`
- `/sign-up`
- `/servicios` (búsqueda pública)
- `/servicios/[id]` (detalle público)
- `/_next/*` (assets)
- `/api/webhooks/*` (webhooks externos)

#### Scenario: Usuario no autenticado intenta acceder a ruta protegida

**Given** el usuario NO tiene sesión activa
**When** el usuario navega a `/dashboard`
**Then** el middleware intercepta la petición
**And** el sistema redirige al usuario a `/sign-in?redirect_url=/dashboard`
**And** el usuario ve la página de login

#### Scenario: Usuario autenticado accede a ruta protegida

**Given** el usuario tiene sesión activa (autenticado)
**When** el usuario navega a `/dashboard`
**Then** el middleware valida la sesión
**And** el sistema permite el acceso
**And** el usuario ve el dashboard

#### Scenario: Usuario no autenticado accede a ruta pública

**Given** el usuario NO tiene sesión activa
**When** el usuario navega a `/servicios`
**Then** el middleware permite el acceso
**And** el usuario ve la página de búsqueda de servicios

---

### Requirement: AUTH-005 - The system SHALL synchronize users via /api/webhooks/clerk endpoint

**Priority:** HIGH
**Type:** Integration

The system MUST implement a `/api/webhooks/clerk` endpoint that synchronizes users between Clerk and the Prisma `users` table when user events occur.

Eventos soportados:
- `user.created`: Crear nuevo registro en tabla `users`
- `user.updated`: Actualizar email, firstName, lastName del usuario
- `user.deleted`: Marcar usuario como inactivo o eliminar (según política)

Criterios:
- Webhook DEBE verificar firma de Clerk usando `CLERK_WEBHOOK_SECRET`
- Webhook DEBE ser idempotente (múltiples llamadas del mismo evento no deben duplicar datos)
- Webhook DEBE retornar 200 OK si procesamiento exitoso
- Webhook DEBE retornar 401 Unauthorized si firma inválida
- Webhook DEBE retornar 500 Internal Server Error si falla procesamiento (para que Clerk reintente)

#### Scenario: Webhook procesa evento user.created exitosamente

**Given** un nuevo usuario se registra en Clerk con:
  - `clerkUserId`: "user_2abc123"
  - `email`: "maria@example.com"
  - `firstName`: "Maria"
  - `lastName`: "López"
**And** Clerk envía evento `user.created` al webhook con firma válida
**When** el webhook recibe el evento
**Then** el sistema verifica la firma exitosamente
**And** el sistema crea un nuevo registro en tabla `users`:
  - `clerkUserId`: "user_2abc123"
  - `email`: "maria@example.com"
  - `firstName`: "Maria"
  - `lastName`: "López"
  - `role`: "CLIENT" (default)
  - `status`: "ACTIVE" (default)
**And** el webhook retorna status 200 OK

#### Scenario: Webhook rechaza evento con firma inválida

**Given** se recibe un POST a `/api/webhooks/clerk`
**And** el header de firma es inválido o está ausente
**When** el webhook intenta verificar la firma
**Then** la verificación falla
**And** el webhook retorna status 401 Unauthorized
**And** NO se procesa el evento
**And** se registra un warning en logs

#### Scenario: Webhook es idempotente (evento duplicado)

**Given** existe un usuario en la tabla `users` con `clerkUserId`: "user_2abc123"
**And** Clerk reenvía el evento `user.created` para el mismo usuario
**When** el webhook recibe el evento duplicado
**Then** el sistema detecta que el `clerkUserId` ya existe
**And** el sistema NO crea un registro duplicado
**And** el webhook retorna status 200 OK (idempotencia exitosa)

#### Scenario: Webhook actualiza usuario con user.updated

**Given** existe un usuario en la tabla `users` con:
  - `clerkUserId`: "user_2abc123"
  - `email`: "maria@example.com"
**And** el usuario actualiza su email en Clerk a "maria.lopez@example.com"
**And** Clerk envía evento `user.updated` con firma válida
**When** el webhook recibe el evento
**Then** el sistema actualiza el registro del usuario:
  - `email`: "maria.lopez@example.com"
  - `updatedAt`: timestamp actual
**And** el webhook retorna status 200 OK

---

### Requirement: AUTH-006 - The system SHALL provide getCurrentUser() helper for server components

**Priority:** HIGH
**Type:** Developer Experience

The system MUST provide a `getCurrentUser()` helper that returns the authenticated user with all their information from the database.

Criterios:
- Usar `auth()` de Clerk para obtener `userId` (clerkUserId)
- Query a Prisma para obtener registro completo de `users`
- Retornar `User | null` (null si no hay sesión o usuario no existe en DB)
- Cachear resultado durante la request (usar React cache si aplica)

#### Scenario: Obtener usuario autenticado en server component

**Given** el usuario tiene sesión activa con `clerkUserId`: "user_2abc123"
**And** existe un registro en tabla `users` para ese `clerkUserId`
**When** un server component llama a `getCurrentUser()`
**Then** el sistema obtiene el `userId` de Clerk
**And** el sistema consulta la tabla `users` por `clerkUserId`
**And** el sistema retorna el objeto `User` completo:
```typescript
{
  id: "uuid-123",
  clerkUserId: "user_2abc123",
  email: "maria@example.com",
  firstName: "Maria",
  lastName: "López",
  role: "CLIENT",
  status: "ACTIVE",
  createdAt: Date,
  updatedAt: Date,
  ...
}
```

#### Scenario: getCurrentUser sin sesión activa

**Given** NO hay sesión activa (usuario no autenticado)
**When** un server component llama a `getCurrentUser()`
**Then** el sistema detecta que no hay `userId` en Clerk
**And** el sistema retorna `null`

---

### Requirement: AUTH-007 - The system SHALL provide requireAuth() helper to enforce authentication

**Priority:** HIGH
**Type:** Developer Experience

The system MUST provide a `requireAuth()` helper that ensures there is an authenticated user or throws an error.

Criterios:
- Usar `getCurrentUser()` internamente
- Si retorna `null`, lanzar `UnauthorizedError` con status 401
- Si retorna `User`, retornarlo
- Útil para server actions y API routes que requieren autenticación

#### Scenario: requireAuth con sesión válida

**Given** el usuario tiene sesión activa
**When** un server action llama a `requireAuth()`
**Then** el sistema retorna el objeto `User` completo
**And** el server action puede continuar su ejecución

#### Scenario: requireAuth sin sesión

**Given** NO hay sesión activa
**When** un server action llama a `requireAuth()`
**Then** el sistema lanza `UnauthorizedError` con mensaje "Authentication required"
**And** el error tiene `statusCode: 401`
**And** el server action NO continúa su ejecución

---

### Requirement: AUTH-008 - The system SHALL provide requireRole() helper for role-based access control

**Priority:** HIGH
**Type:** Security

The system MUST provide a `requireRole(role: UserRole)` helper that verifies the authenticated user has the required role.

Roles soportados:
- `CLIENT`: Usuario cliente (default)
- `CONTRACTOR`: Usuario contratista
- `ADMIN`: Administrador de plataforma

Criterios:
- Usar `requireAuth()` para obtener usuario
- Validar que `user.role === role`
- Si no coincide, lanzar `ForbiddenError` con status 403
- Si coincide, retornar usuario

#### Scenario: requireRole exitoso (usuario tiene el rol)

**Given** el usuario autenticado tiene `role: "CONTRACTOR"`
**When** un server action llama a `requireRole("CONTRACTOR")`
**Then** el sistema valida que el rol coincide
**And** el sistema retorna el objeto `User`
**And** el server action puede continuar

#### Scenario: requireRole falla (usuario no tiene el rol)

**Given** el usuario autenticado tiene `role: "CLIENT"`
**When** un server action llama a `requireRole("ADMIN")`
**Then** el sistema detecta que el rol no coincide
**And** el sistema lanza `ForbiddenError` con mensaje "Insufficient permissions: requires ADMIN role"
**And** el error tiene `statusCode: 403`
**And** el server action NO continúa

---

### Requirement: AUTH-009 - The system SHALL allow users to sign out securely

**Priority:** MEDIUM
**Type:** Functional

The system MUST allow users to sign out securely.

Criterios:
- Usar componente `<SignOutButton>` de Clerk o API `signOut()`
- Invalidar sesión en Clerk
- Limpiar cookies de sesión
- Redirigir a landing page (`/`)

#### Scenario: Usuario cierra sesión exitosamente

**Given** el usuario tiene sesión activa
**And** el usuario está en `/dashboard`
**When** el usuario hace clic en botón "Cerrar sesión"
**Then** el sistema invalida la sesión en Clerk
**And** las cookies de sesión son eliminadas
**And** el sistema redirige al usuario a `/`
**And** el usuario ya NO tiene sesión activa

---

### Requirement: AUTH-010 - The webhook SHALL verify cryptographic signature of all events

**Priority:** HIGH
**Type:** Security

The webhook `/api/webhooks/clerk` MUST verify the cryptographic signature of all received events using the `svix` library.

Criterios:
- Usar `CLERK_WEBHOOK_SECRET` para verificar firma
- Rechazar eventos con firma inválida (retornar 401)
- Aceptar solo eventos firmados por Clerk
- Prevenir ataques de replay y man-in-the-middle

#### Scenario: Evento con firma válida es procesado

**Given** Clerk envía un evento `user.created` con firma válida
**When** el webhook recibe el evento
**Then** el sistema verifica la firma usando `svix.verify()`
**And** la verificación es exitosa
**And** el evento es procesado normalmente

#### Scenario: Evento con firma inválida es rechazado

**Given** se envía un POST a `/api/webhooks/clerk` desde origen desconocido
**And** la firma en headers no es válida
**When** el webhook intenta verificar la firma
**Then** `svix.verify()` lanza error
**And** el webhook retorna 401 Unauthorized
**And** el evento NO es procesado
**And** se registra un warning con IP del atacante en logs

---

## Interfaces and Contracts

### API Routes

#### POST /api/webhooks/clerk

**Purpose:** Recibir eventos de Clerk y sincronizar usuarios con base de datos

**Headers:**
- `svix-id`: ID del evento (para idempotencia)
- `svix-timestamp`: Timestamp del evento
- `svix-signature`: Firma criptográfica del evento

**Request Body:**
```typescript
{
  type: 'user.created' | 'user.updated' | 'user.deleted',
  data: {
    id: string,                    // clerkUserId
    email_addresses: Array<{
      email_address: string,
      id: string
    }>,
    first_name: string,
    last_name: string,
    ...
  }
}
```

**Response:**
- `200 OK`: Evento procesado exitosamente
- `401 Unauthorized`: Firma inválida
- `500 Internal Server Error`: Error al procesar evento (Clerk reintentará)

---

### Utility Functions

#### `getCurrentUser(): Promise<User | null>`

**Purpose:** Obtener usuario autenticado con datos completos de la base de datos

**Usage:**
```typescript
import { getCurrentUser } from '@/modules/auth';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return <div>Hola {user.firstName}</div>;
}
```

**Returns:**
- `User` object si hay sesión activa y usuario existe en DB
- `null` si no hay sesión o usuario no existe en DB

---

#### `requireAuth(): Promise<User>`

**Purpose:** Garantizar que hay usuario autenticado o lanzar error 401

**Usage:**
```typescript
import { requireAuth } from '@/modules/auth';

export async function createBooking(data: BookingInput) {
  const user = await requireAuth(); // Lanza error si no hay sesión

  // user está garantizado aquí
  return prisma.booking.create({
    data: {
      ...data,
      clientId: user.id,
    },
  });
}
```

**Returns:**
- `User` object (garantizado)

**Throws:**
- `UnauthorizedError` con `statusCode: 401` si no hay sesión

---

#### `requireRole(role: UserRole): Promise<User>`

**Purpose:** Garantizar que usuario tiene rol específico o lanzar error 403

**Usage:**
```typescript
import { requireRole } from '@/modules/auth';

export async function approveService(serviceId: string) {
  const admin = await requireRole('ADMIN'); // Lanza error si no es admin

  // admin está garantizado aquí
  return prisma.service.update({
    where: { id: serviceId },
    data: { status: 'ACTIVE' },
  });
}
```

**Returns:**
- `User` object con el rol requerido (garantizado)

**Throws:**
- `UnauthorizedError` con `statusCode: 401` si no hay sesión
- `ForbiddenError` con `statusCode: 403` si usuario no tiene el rol

---

## Data Model

### User Table (Existing in Prisma)

```prisma
model User {
  id          String     @id @default(uuid())
  clerkUserId String     @unique
  email       String     @unique
  firstName   String
  lastName    String
  phone       String?
  avatarUrl   String?
  role        UserRole   @default(CLIENT)
  status      UserStatus @default(ACTIVE)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // ... relaciones
}

enum UserRole {
  CLIENT
  CONTRACTOR
  ADMIN
}

enum UserStatus {
  ACTIVE
  BLOCKED
  PENDING_VERIFICATION
}
```

**Fields managed by auth module:**
- `clerkUserId`: ID de Clerk (sincronizado vía webhook)
- `email`: Email del usuario (sincronizado vía webhook)
- `firstName`: Nombre (sincronizado vía webhook)
- `lastName`: Apellido (sincronizado vía webhook)

**Fields managed by other modules:**
- `role`: Inicialmente CLIENT, puede ser actualizado por módulo `users`
- `status`: Puede ser actualizado por módulo `admin`
- `phone`, `avatarUrl`: Gestionados por módulo `users`

---

## Security and Permissions

### Session Security

- Sessions are managed by Clerk using secure, httpOnly cookies
- Tokens are refreshed automatically by Clerk SDK
- Tokens are NOT exposed to client-side JavaScript
- Session data is encrypted and signed

### Webhook Security

- All webhook events MUST be verified using `svix` signature verification
- Webhook endpoint MUST reject unsigned or invalidly signed requests
- Webhook MUST log suspicious requests for security monitoring

### Role-Based Access Control

| Role | Can Access |
|------|------------|
| CLIENT | Own profile, own bookings, public services, messaging with contractors |
| CONTRACTOR | Own profile, own services, own bookings (as contractor), messaging with clients |
| ADMIN | All resources, moderation tools, user management, dispute resolution |

**Note:** Detailed authorization rules for specific resources will be defined in respective module specs (users, booking, etc.)

### Environment Variables Security

- ALL Clerk keys MUST be stored in environment variables (never in code)
- Secret keys MUST never be committed to git
- Production keys MUST be different from development keys
- Vercel environment variables MUST be set with appropriate access levels

---

## Testing Plan

### Test Cases to Add to STP

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-AUTH-001 | Registro exitoso con email y contraseña válidos | E2E | Alta | AUTH-002 |
| TC-AUTH-002 | Registro fallido - email duplicado | E2E | Alta | AUTH-002 |
| TC-AUTH-003 | Registro fallido - contraseña débil | E2E | Media | AUTH-002 |
| TC-AUTH-004 | Login exitoso con credenciales válidas | E2E | Alta | AUTH-003 |
| TC-AUTH-005 | Login fallido - credenciales inválidas | E2E | Alta | AUTH-003 |
| TC-AUTH-006 | Middleware bloquea ruta protegida sin sesión | Integración | Alta | AUTH-004 |
| TC-AUTH-007 | Middleware permite ruta protegida con sesión | Integración | Alta | AUTH-004 |
| TC-AUTH-008 | Middleware permite ruta pública sin sesión | Integración | Media | AUTH-004 |
| TC-AUTH-009 | Webhook procesa user.created y crea usuario en DB | Integración | Alta | AUTH-005 |
| TC-AUTH-010 | Webhook actualiza usuario con user.updated | Integración | Alta | AUTH-005 |
| TC-AUTH-011 | Webhook es idempotente (evento duplicado) | Integración | Alta | AUTH-005 |
| TC-AUTH-012 | Webhook rechaza firma inválida | Integración | Crítica | AUTH-010 |
| TC-AUTH-013 | getCurrentUser retorna usuario autenticado | Unitaria | Alta | AUTH-006 |
| TC-AUTH-014 | getCurrentUser retorna null sin sesión | Unitaria | Alta | AUTH-006 |
| TC-AUTH-015 | requireRole lanza error si rol no coincide | Unitaria | Alta | AUTH-008 |
| TC-AUTH-016 | requireRole retorna usuario si rol coincide | Unitaria | Alta | AUTH-008 |
| TC-AUTH-017 | Cierre de sesión invalida sesión y redirige | E2E | Media | AUTH-009 |

### Acceptance Criteria for Testing

- ✅ Cobertura de código ≥ 70% en módulo `src/modules/auth`
- ✅ Todos los casos TC-AUTH-001 a TC-AUTH-017 pasan
- ✅ Tests de integración usan test database (no producción)
- ✅ Tests E2E usan Clerk test environment
- ✅ Webhook tests validan idempotencia estrictamente
- ✅ Security tests validan firma de webhook con múltiples escenarios

### Test Implementation Strategy

**Unit Tests** (`src/modules/auth/__tests__/`):
- Mock de `auth()` de Clerk para simular sesiones
- Mock de Prisma client para queries de usuario
- Fixtures de usuarios de prueba con diferentes roles
- Tests de helpers (`getCurrentUser`, `requireAuth`, `requireRole`)

**Integration Tests** (`tests/integration/`):
- Test de webhook endpoint completo con firma válida/inválida
- Test de middleware con diferentes rutas y estados de sesión
- Test de sincronización con base de datos de test

**E2E Tests** (`tests/e2e/`):
- Playwright con Clerk test user configurado
- Flujos completos: sign-up → dashboard
- Flujos completos: sign-in → dashboard → sign-out
- Protección de rutas: acceso sin sesión → redirect a sign-in

**Mocks and Test Data:**
- Clerk SDK: Mock de `auth()`, `currentUser()`, `authMiddleware()`
- Prisma: Mock o test database con seed data
- Clerk Test Environment: Configurar usuario de prueba en Clerk dashboard

---

## Performance Considerations

### Session Verification Latency

- **Target:** P95 < 100ms, P99 < 200ms para verificación de sesión en middleware
- **Strategy:** Clerk SDK usa edge runtime cuando es posible para minimizar latency
- **Monitoring:** Agregar logs de tiempo en middleware (desarrollo) y APM (producción)

### Webhook Processing Time

- **Target:** P95 < 800ms, P99 < 1.2s para procesamiento completo de evento
- **Strategy:**
  - Queries de Prisma optimizadas (upsert en lugar de select + insert)
  - Índices en `clerkUserId` (ya existente en schema)
  - Minimal logging en path crítico
- **Monitoring:** Logs de tiempo de procesamiento de cada evento

### Database Query Optimization

- `clerkUserId` tiene índice único (mejora lookups)
- `getCurrentUser()` puede usar caché de request si se llama múltiples veces
- Considerar caché de usuario en memoria si se vuelve bottleneck (medición requerida primero)

---

## Migration and Rollback

### Database Migration

**No se requiere migración de schema** - La tabla `users` ya existe con el campo `clerkUserId`.

Sin embargo, si hay usuarios existentes creados manualmente (por ejemplo, en seeds), se debe:

1. Crear usuarios correspondientes en Clerk
2. Actualizar campo `clerkUserId` en registros existentes
3. O bien limpiar datos de desarrollo y re-seed con usuarios de Clerk

**Recomendación para MVP:** Limpiar DB de desarrollo y crear usuarios frescos via Clerk sign-up.

### Rollback Plan

Si la integración de Clerk falla o necesita ser revertida:

1. **Rollback de código:**
   - Revertir PR de integración de Clerk
   - Remover dependencias de `@clerk/nextjs`

2. **Rollback de DB:**
   - No se requiere (schema no cambia)
   - Usuarios existentes permanecen (pueden ser reutilizados con otro sistema)

3. **Rollback de configuración:**
   - Remover variables de entorno de Clerk
   - Deshabilitar webhook en Clerk dashboard

**Risk:** Usuarios que se registraron durante el periodo de Clerk quedarán sin credenciales si se revierte. **Mitigación:** No hacer rollback en producción; solo en desarrollo.

---

## Monitoring and Observability

### Metrics to Track

- **Authentication Success Rate:** % de intentos de login exitosos
- **Registration Success Rate:** % de intentos de registro exitosos
- **Webhook Processing Success Rate:** % de eventos procesados sin error
- **Session Verification Latency:** P50, P95, P99 de tiempo de verificación de sesión
- **Webhook Processing Latency:** P50, P95, P99 de tiempo de procesamiento de eventos

### Logs to Implement

- **Auth Events:**
  - Sign-up attempt (success/failure)
  - Sign-in attempt (success/failure)
  - Sign-out
  - Unauthorized access attempt (blocked by middleware)
  - Forbidden access attempt (wrong role)

- **Webhook Events:**
  - Event received (type, user id)
  - Signature verification (success/failure)
  - User created/updated/deleted in DB
  - Errors in processing (with stack trace)

**Log Level Guidelines:**
- `INFO`: Successful operations
- `WARN`: Retryable errors, invalid signatures
- `ERROR`: Non-retryable errors, unexpected failures

---

## Future Enhancements (Out of Scope for MVP)

1. **OAuth Providers**
   - Google Sign-In
   - GitHub Sign-In
   - Requires additional Clerk configuration

2. **Multi-Factor Authentication (MFA)**
   - SMS-based 2FA
   - Authenticator app support
   - Requires Clerk premium features

3. **Role Assignment in Sign-Up**
   - Custom sign-up form with role selector
   - Requires custom UI instead of Clerk pre-built components

4. **Bidirectional Sync (DB → Clerk)**
   - Update Clerk user metadata when role changes in DB
   - Requires additional webhook or sync job

5. **Advanced Session Management**
   - Device management (list active sessions)
   - Force logout from all devices
   - Session expiration policies

---

## Dependencies and Integration Points

### Upstream Dependencies (Required Before Implementation)

- ✅ PostgreSQL database configured (Supabase)
- ✅ Prisma schema with `User` model
- ✅ Next.js 14 App Router setup
- ⬜ Clerk account created
- ⬜ Clerk application configured
- ⬜ Environment variables set

### Downstream Consumers (Modules That Will Use Auth)

- **users** - Will use `getCurrentUser()` to get authenticated user
- **booking** - Will use `requireAuth()` and `requireRole()` for authorization
- **payments** - Will use `requireAuth()` for payment operations
- **messaging** - Will use `requireAuth()` to validate chat participants
- **ratings** - Will use `requireAuth()` to validate who can rate
- **admin** - Will use `requireRole('ADMIN')` for all admin operations

---

## Glossary

- **Clerk:** Third-party authentication service (SaaS)
- **ClerkUserId:** Unique identifier of user in Clerk (format: `user_2xxx...`)
- **Session:** Authenticated state of a user (managed by Clerk via cookies)
- **Webhook:** HTTP callback from Clerk to our application when events occur
- **Idempotency:** Property of an operation that can be applied multiple times with same result
- **Middleware:** Next.js function that runs before route handlers to intercept requests
- **Server Component:** React component that runs on server (Next.js App Router)
- **Server Action:** Async function that runs on server, callable from client (Next.js App Router)

---

## References

- [Clerk Documentation - Next.js Integration](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Webhooks Documentation](https://clerk.com/docs/integrations/webhooks)
- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Svix - Webhook Verification Library](https://www.svix.com/)
- `/openspec/project.md` - Project context
- `/docs/md/STP-ReparaYa.md` - Test plan
