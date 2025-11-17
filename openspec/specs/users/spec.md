# Especificación: Gestión de Usuarios (Users)

## Propósito y alcance

Este módulo gestiona perfiles de usuarios (clientes, contratistas y admins), incluyendo datos adicionales no manejados por Clerk, direcciones de usuario, y perfiles públicos para mostrar en servicios y calificaciones.

**Alcance actual (post change `client-profile-onboarding`):**
- ✅ Gestión de perfiles de **clientes** (CRUD, direcciones)
- ❌ Gestión de perfiles de **contratistas** (KYC, verificación, Stripe Connect) - Pendiente de implementación
- ❌ Panel administrativo de gestión de usuarios - Pendiente

Este spec cubre únicamente la funcionalidad implementada para clientes. El onboarding y gestión de contratistas será un change futuro.

## Requisitos relacionados

- **RF-003**: Registro y gestión de perfiles
- **BR-001**: Usuario debe tener al menos una dirección
- **BR-002**: Solo una dirección puede ser `isDefault: true` por usuario
- **BR-007**: Verificación KYC para contratistas (pendiente de implementación)

## Interfaces y contratos

### Endpoints de Perfiles

#### GET `/api/users/me`

**Descripción:** Obtener perfil completo del usuario autenticado, incluyendo direcciones.

**Autorización:** Usuario autenticado (middleware `requireAuth`)

**Respuesta exitosa (200 OK):**
```json
{
  "id": "uuid",
  "clerkUserId": "user_xxx",
  "email": "cliente@example.com",
  "firstName": "Juan",
  "lastName": "Pérez",
  "phone": "3312345678",
  "avatarUrl": "https://...",
  "role": "CLIENT",
  "status": "ACTIVE",
  "createdAt": "2025-11-17T...",
  "updatedAt": "2025-11-17T...",
  "addresses": [
    {
      "id": "uuid",
      "userId": "uuid",
      "addressLine1": "Av. Chapultepec 123",
      "addressLine2": null,
      "city": "Guadalajara",
      "state": "Jalisco",
      "postalCode": "44100",
      "country": "MX",
      "lat": null,
      "lng": null,
      "isDefault": true,
      "createdAt": "2025-11-17T...",
      "updatedAt": "2025-11-17T..."
    }
  ]
}
```

**Errores:**
- `401 Unauthorized`: Sin sesión válida
- `500 Internal Server Error`: Error del servidor

---

#### PATCH `/api/users/me`

**Descripción:** Actualizar perfil del usuario autenticado.

**Autorización:** Usuario autenticado

**Body (todos los campos opcionales):**
```json
{
  "firstName": "string (1-100 caracteres)",
  "lastName": "string (1-100 caracteres)",
  "phone": "string (10 dígitos, formato mexicano)",
  "avatarUrl": "string (URL válida)"
}
```

**Validaciones (Zod):**
- `firstName`: min 1, max 100 caracteres
- `lastName`: min 1, max 100 caracteres
- `phone`: regex `/^\d{10}$/` (10 dígitos)
- `avatarUrl`: URL válida

**Respuesta exitosa (200 OK):**
```json
{
  "id": "uuid",
  "clerkUserId": "user_xxx",
  "email": "cliente@example.com",
  "firstName": "Juan Actualizado",
  "lastName": "Pérez",
  "phone": "3398765432",
  "avatarUrl": "https://...",
  "role": "CLIENT",
  "status": "ACTIVE",
  "createdAt": "2025-11-17T...",
  "updatedAt": "2025-11-17T..." // Actualizado
}
```

**Errores:**
- `400 Bad Request`: Validación Zod fallida (body con errores)
- `401 Unauthorized`: Sin sesión válida
- `500 Internal Server Error`: Error del servidor

---

#### GET `/api/users/:id/public`

**Descripción:** Obtener perfil público de un usuario (sin datos sensibles).

**Autorización:** Público (sin autenticación requerida)

**Caso de uso:** Mostrar nombre y avatar de contratistas en servicios, o de clientes en calificaciones.

**Respuesta exitosa (200 OK):**
```json
{
  "id": "uuid",
  "firstName": "Juan",
  "lastName": "Pérez",
  "avatarUrl": "https://..."
}
```

**Datos NO expuestos:**
- `email` (sensible)
- `phone` (sensible)
- `clerkUserId` (interno)
- `role`, `status` (no relevantes para perfil público)
- `addresses` (sensible)

**Errores:**
- `404 Not Found`: Usuario con ID especificado no existe
- `500 Internal Server Error`: Error del servidor

---

### Endpoints de Direcciones

#### POST `/api/users/me/addresses`

**Descripción:** Crear nueva dirección para el usuario autenticado.

**Autorización:** Usuario autenticado

**Body:**
```json
{
  "addressLine1": "string (5-200 caracteres)",
  "addressLine2": "string (max 200 caracteres, opcional)",
  "city": "string (2-100 caracteres)",
  "state": "string (2-100 caracteres)",
  "postalCode": "string (5 dígitos)",
  "isDefault": "boolean (opcional, default: false)"
}
```

**Validaciones (Zod):**
- `addressLine1`: min 5, max 200 caracteres
- `addressLine2`: max 200 caracteres (opcional)
- `city`: min 2, max 100 caracteres
- `state`: min 2, max 100 caracteres
- `postalCode`: regex `/^\d{5}$/` (5 dígitos)
- `isDefault`: boolean opcional (default: false)

**Regla de negocio (BR-002):**
- Si `isDefault: true`, se desactiva automáticamente el flag en otras direcciones del usuario
- Solo una dirección puede ser `isDefault: true` por usuario

**Respuesta exitosa (201 Created):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "addressLine1": "Av. Chapultepec 123",
  "addressLine2": null,
  "city": "Guadalajara",
  "state": "Jalisco",
  "postalCode": "44100",
  "country": "MX", // Hardcoded para México
  "lat": null,
  "lng": null,
  "isDefault": true,
  "createdAt": "2025-11-17T...",
  "updatedAt": "2025-11-17T..."
}
```

**Errores:**
- `400 Bad Request`: Validación Zod fallida
- `401 Unauthorized`: Sin sesión válida
- `500 Internal Server Error`: Error del servidor

---

#### PATCH `/api/users/me/addresses/:id`

**Descripción:** Actualizar dirección existente del usuario autenticado.

**Autorización:** Usuario autenticado y dueño de la dirección

**Body (todos los campos opcionales):**
```json
{
  "addressLine1": "string (5-200 caracteres)",
  "addressLine2": "string (max 200 caracteres)",
  "city": "string (2-100 caracteres)",
  "state": "string (2-100 caracteres)",
  "postalCode": "string (5 dígitos)",
  "isDefault": "boolean"
}
```

**Validación de propiedad:**
- Se verifica que la dirección con `:id` pertenece al usuario autenticado
- Si no pertenece, retorna `404 Not Found`

**Regla de negocio (BR-002):**
- Si `isDefault: true`, se desactiva automáticamente el flag en otras direcciones del usuario (excepto la actual)

**Respuesta exitosa (200 OK):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "addressLine1": "Av. Chapultepec 456 (actualizado)",
  "addressLine2": "Depto 5",
  "city": "Guadalajara",
  "state": "Jalisco",
  "postalCode": "44100",
  "country": "MX",
  "lat": null,
  "lng": null,
  "isDefault": true,
  "createdAt": "2025-11-17T...",
  "updatedAt": "2025-11-17T..." // Actualizado
}
```

**Errores:**
- `400 Bad Request`: Validación Zod fallida
- `401 Unauthorized`: Sin sesión válida
- `404 Not Found`: Dirección no existe o no pertenece al usuario
- `500 Internal Server Error`: Error del servidor

---

#### DELETE `/api/users/me/addresses/:id`

**Descripción:** Eliminar dirección del usuario autenticado.

**Autorización:** Usuario autenticado y dueño de la dirección

**Validación de propiedad:**
- Se verifica que la dirección con `:id` pertenece al usuario autenticado
- Si no pertenece, retorna `404 Not Found`

**Regla de negocio (BR-001):**
- No permitir eliminar si es la única dirección del usuario
- Si usuario tiene solo 1 dirección, retorna `400 Bad Request`

**Respuesta exitosa (204 No Content):**
- Sin body
- Dirección eliminada correctamente

**Errores:**
- `400 Bad Request`: Intentando eliminar la única dirección del usuario
- `401 Unauthorized`: Sin sesión válida
- `404 Not Found`: Dirección no existe o no pertenece al usuario
- `500 Internal Server Error`: Error del servidor

---

## Modelo de datos

### Entidad: User (heredada de módulo auth)

```typescript
{
  id: string (uuid, PK)
  clerkUserId: string (unique, not null)
  email: string (unique, not null)
  firstName: string
  lastName: string
  phone: string? (nullable)
  avatarUrl: string? (nullable)
  role: UserRole (CLIENT | CONTRACTOR | ADMIN, default: CLIENT)
  status: UserStatus (ACTIVE | BLOCKED | PENDING_VERIFICATION, default: ACTIVE)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Relaciones:**
- `addresses`: Address[] (1:N)
- `contractorProfile`: ContractorProfile? (1:1, solo si role = CONTRACTOR)
- `clientBookings`: Booking[] (1:N, relación "ClientBookings")
- `contractorBookings`: Booking[] (1:N, relación "ContractorBookings")
- `messagesSent`: Message[] (1:N)
- `ratings`: Rating[] (1:N)

**Índices:**
- `clerkUserId` (único)
- `email` (único)
- `(role, status)` (compuesto)

---

### Entidad: Address

```typescript
{
  id: string (uuid, PK)
  userId: string (FK → User.id)
  addressLine1: string (not null)
  addressLine2: string? (nullable)
  city: string (not null)
  state: string (not null)
  postalCode: string (not null)
  country: string (default: "MX")
  lat: Decimal? (nullable, precision: 10,8)
  lng: Decimal? (nullable, precision: 11,8)
  isDefault: boolean (default: false)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Relaciones:**
- `user`: User (N:1)

**Índices:**
- `(userId, isDefault)` (compuesto, para buscar dirección default rápidamente)

**Constraints:**
- FK `userId` con `onDelete: Cascade` (si se elimina usuario, se eliminan sus direcciones)

**Notas:**
- Campos `lat`/`lng` son opcionales (pendiente de integración con Amazon Location Service)
- Campo `country` hardcoded a "MX" (México) en MVP
- Solo una dirección puede tener `isDefault: true` por usuario (constraint aplicado en lógica de aplicación, no en BD)

---

### Entidad: ContractorProfile (Fuera de alcance - pendiente)

**Nota:** El perfil de contratista NO está implementado en este change. Será parte de un change futuro que incluirá:

```typescript
{
  id: string (uuid, PK)
  userId: string (FK → User.id, unique)
  businessName: string?
  description: string?
  specialties: string[]
  verified: boolean (default: false)
  verificationDocuments: json? (S3 keys)
  stripeConnectAccountId: string?
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## Integraciones externas

### Clerk

- **Dependencia:** Módulo `auth` (ya implementado)
- **Datos básicos heredados:** `firstName`, `lastName`, `email`, `avatarUrl` se sincronizan desde Clerk vía webhook
- **Edición de perfil:** Los campos sincronizados de Clerk pueden sobrescribirse localmente con `PATCH /api/users/me`, pero el webhook de Clerk podría revertirlos si el usuario actualiza su perfil en Clerk. Esto es un trade-off aceptable para el MVP.

### AWS S3 (Futuro - Fuera de alcance)

- **Uso futuro:** Upload de avatar custom (actualmente solo URL de Clerk)
- **Uso futuro:** Documentos de verificación para contratistas

### Amazon Location Service (Futuro - Fuera de alcance)

- **Uso futuro:** Geocodificación de direcciones para obtener `lat`/`lng`
- **Uso futuro:** Cálculo de distancias entre cliente y contratista

---

## Consideraciones de seguridad

### Autorización

- **Endpoints protegidos:**
  - `GET /api/users/me`: Requiere autenticación (middleware `requireAuth`)
  - `PATCH /api/users/me`: Requiere autenticación (solo el dueño edita su perfil)
  - `POST /api/users/me/addresses`: Requiere autenticación
  - `PATCH /api/users/me/addresses/:id`: Requiere autenticación + validación de propiedad (userId)
  - `DELETE /api/users/me/addresses/:id`: Requiere autenticación + validación de propiedad (userId)

- **Endpoints públicos:**
  - `GET /api/users/:id/public`: Sin autenticación (solo expone datos no sensibles)

### Validación de entrada

- **Zod schemas:** Todos los endpoints POST/PATCH validan inputs con schemas Zod
- **Input sanitization:** Zod rechaza inputs inválidos antes de procesamiento
- **Protección contra XSS:** Next.js escapa automáticamente contenido en componentes React. No se permite HTML en campos de texto (Zod valida strings simples)

### Datos sensibles

- **Endpoint público no expone:**
  - Email (PII)
  - Teléfono (PII)
  - ClerkUserId (identificador interno)
  - Direcciones (PII)

- **PATCH /api/users/me no permite editar:**
  - `email` (sincronizado de Clerk, no editable)
  - `clerkUserId` (inmutable)
  - `role` (gestión exclusiva de admins - fuera de alcance)
  - `status` (gestión exclusiva de admins - fuera de alcance)

### GDPR / Privacidad (Consideraciones futuras)

- **Soft delete:** Actualmente, si un usuario elimina su cuenta en Clerk, el webhook marca `status: BLOCKED` (no se elimina físicamente)
- **Derecho al olvido:** No implementado en MVP. Requerirá endpoint de admin para eliminar físicamente usuario y datos relacionados

---

## Testing & QA

### Tipos de pruebas

1. **Unitarias:**
   - Servicios de perfil (CRUD) con mocks de repositorios
   - Validaciones Zod con inputs válidos/inválidos
   - Repositorios con mocks de Prisma
   - Cobertura objetivo: ≥ 85%

2. **Integración:**
   - Endpoints de perfil con autorización (mock de Clerk)
   - CRUD de direcciones con validación de propiedad
   - Reglas de negocio (BR-001, BR-002)
   - Cobertura objetivo: ≥ 75%

3. **E2E (Manual):**
   - Flujo completo de onboarding de cliente (registro → completar perfil → agregar dirección)
   - Edición de perfil desde dashboard
   - Gestión de múltiples direcciones
   - Visualización de perfil público

4. **Seguridad:**
   - Tests de autorización (usuario no puede editar perfil de otro)
   - Endpoint público no expone datos sensibles
   - Input sanitization con Zod

### Casos de prueba relacionados

Documentados en `/docs/md/STP-ReparaYa.md`, sección 4.1.2:

| ID | Descripción | Tipo | Req | Status |
|----|-------------|------|-----|--------|
| TC-USER-001 | Obtener perfil de usuario autenticado | Integración | RF-003-01 | PASS |
| TC-USER-002 | Actualizar perfil de usuario autenticado | Integración | RF-003-02 | PASS |
| TC-USER-003 | Usuario no puede editar perfil de otro usuario | Integración | RF-003-02 | PASS |
| TC-USER-004 | Obtener perfil público de usuario | Integración | RF-003-03 | PASS |
| TC-USER-005 | Crear dirección para usuario autenticado | Integración | RF-003-04 | PASS |
| TC-USER-006 | Actualizar dirección existente | Integración | RF-003-05 | PASS |
| TC-USER-007 | Eliminar dirección | Integración | RF-003-05 | PASS |
| TC-USER-008 | No permitir eliminar única dirección | Integración | BR-001 | PASS |
| TC-USER-009 | Flag isDefault se desactiva en otras direcciones | Unitaria | BR-002 | PASS |
| TC-USER-010 | Validación de datos con Zod | Unitaria | RNF-001 | PASS |

### Comandos de prueba

```bash
# Tests unitarios
npm run test -- src/modules/users

# Tests de integración
npm run test -- tests/integration/api/users.test.ts

# Cobertura
npm run test:coverage
# Verificar src/modules/users ≥ 75%

# Build
npm run build

# Linter
npm run lint
```

---

## Pendientes (Fuera de alcance de este spec)

- [ ] Onboarding de contratistas (verificación KYC, Stripe Connect)
- [ ] Geocodificación de direcciones con Amazon Location Service
- [ ] Upload de avatar custom a S3
- [ ] Panel administrativo de gestión de usuarios (bloqueo, desbloqueo, eliminación)
- [ ] Notificaciones transaccionales con AWS SES (confirmación de perfil, cambios de datos)
- [ ] Implementación de GDPR compliance (derecho al olvido)

---

## Referencias

- **Change implementado:** `2025-11-17-client-profile-onboarding`
- **Spec delta:** `/openspec/changes/2025-11-17-client-profile-onboarding/specs/users/spec.md`
- **Plan de pruebas:** `/docs/md/STP-ReparaYa.md` sección 4.1.2
- **Módulo relacionado:** `/openspec/specs/auth/spec.md` (autenticación con Clerk)

**Última actualización:** 2025-11-17
**Estado:** ACTIVE (implementación completa para clientes)
