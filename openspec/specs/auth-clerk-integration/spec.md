# auth-clerk-integration Specification

## Purpose
TBD - created by archiving change 2025-11-16-auth-clerk-integration. Update Purpose after archive.
## Requirements
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

