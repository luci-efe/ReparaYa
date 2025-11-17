# Spec Delta: Users Module - Client Profile Onboarding

**Change ID:** `2025-11-17-client-profile-onboarding`
**Created:** 2025-11-17

Este documento describe las **modificaciones y adiciones** al módulo `users` como parte del change `client-profile-onboarding`. Solo se documentan los cambios introducidos por este change.

---

## ADDED Requirements

### Requirement: USER-001 - The system SHALL allow authenticated users to retrieve their complete profile

Un usuario autenticado SHALL obtener su perfil completo, incluyendo sus direcciones registradas mediante el endpoint `GET /api/users/me`.

#### Scenario: Usuario autenticado obtiene su perfil

**Given:** Usuario está autenticado con sesión válida de Clerk
**When:** Ejecuta `GET /api/users/me` con header de autenticación
**Then:**
- Respuesta: 200 OK
- Body contiene perfil completo: `{ id, clerkUserId, email, firstName, lastName, phone, avatarUrl, role, status, createdAt, updatedAt, addresses: [...] }`
- Campo `addresses` incluye todas las direcciones del usuario ordenadas por `isDefault DESC`

#### Scenario: Usuario sin autenticación intenta obtener perfil

**Given:** Request sin header de autenticación
**When:** Ejecuta `GET /api/users/me`
**Then:**
- Respuesta: 401 Unauthorized
- Body: `{ error: "No autorizado" }`

---

### Requirement: USER-002 - The system SHALL allow authenticated users to update their profile with validation

Un usuario autenticado SHALL actualizar su perfil con validación de datos mediante schemas Zod en el endpoint `PATCH /api/users/me`.

#### Scenario: Usuario actualiza su teléfono

**Given:** Usuario autenticado
**When:** Ejecuta `PATCH /api/users/me` con body `{ phone: "3312345678" }`
**Then:**
- Respuesta: 200 OK
- Body contiene perfil actualizado con nuevo teléfono
- Campo `updatedAt` se actualiza

#### Scenario: Usuario intenta actualizar con teléfono inválido

**Given:** Usuario autenticado
**When:** Ejecuta `PATCH /api/users/me` con body `{ phone: "invalid" }`
**Then:**
- Respuesta: 400 Bad Request
- Body: `{ error: [{ message: "Teléfono debe tener 10 dígitos", path: ["phone"] }] }`
- Perfil NO se actualiza

#### Scenario: Usuario no puede editar perfil de otro usuario

**Given:** Usuario A autenticado (ID: user_A)
**When:** Intenta ejecutar `PATCH /api/users/user_B` (endpoint no existe, solo `/api/users/me`)
**Then:**
- Endpoint no existe
- Solo se puede editar perfil propio vía `/api/users/me`

---

### Requirement: USER-003 - The system SHALL provide public user profiles without sensitive data

Cualquier usuario (autenticado o no) SHALL obtener el perfil público de un usuario mediante `GET /api/users/:id/public`, con datos limitados y sin información sensible (firstName, lastName, avatarUrl únicamente).

#### Scenario: Obtener perfil público de un contratista

**Given:** Usuario con ID `user_123` existe
**When:** Cualquiera ejecuta `GET /api/users/user_123/public`
**Then:**
- Respuesta: 200 OK
- Body contiene solo: `{ id, firstName, lastName, avatarUrl }`
- NO expone datos sensibles: email, phone, clerkUserId, status

#### Scenario: Obtener perfil público de usuario inexistente

**Given:** Usuario con ID `user_999` NO existe
**When:** Ejecuta `GET /api/users/user_999/public`
**Then:**
- Respuesta: 404 Not Found
- Body: `{ error: "Usuario no encontrado" }`

---

### Requirement: USER-004 - The system SHALL allow authenticated users to create addresses

Un usuario autenticado SHALL crear direcciones para su perfil mediante `POST /api/users/me/addresses`, con validación obligatoria de datos (addressLine1, city, state, postalCode).

#### Scenario: Crear primera dirección del usuario

**Given:** Usuario autenticado sin direcciones
**When:** Ejecuta `POST /api/users/me/addresses` con body:
```json
{
  "addressLine1": "Av. Chapultepec 123",
  "city": "Guadalajara",
  "state": "Jalisco",
  "postalCode": "44100",
  "isDefault": true
}
```
**Then:**
- Respuesta: 201 Created
- Body contiene dirección creada con `isDefault: true`
- Campo `country` se establece automáticamente como "MX"

#### Scenario: Crear dirección con validación fallida

**Given:** Usuario autenticado
**When:** Ejecuta `POST /api/users/me/addresses` con body `{ addressLine1: "123" }`
**Then:**
- Respuesta: 400 Bad Request
- Body contiene errores de validación Zod (falta city, state, postalCode)

---

### Requirement: USER-005 - The system MUST enforce unique isDefault flag per user (BR-002)

Solo una dirección MUST tener `isDefault: true` por usuario. Al crear o actualizar una dirección como `isDefault: true`, el sistema SHALL desactivar automáticamente el flag `isDefault` en todas las otras direcciones del mismo usuario.

#### Scenario: Crear nueva dirección como default desactiva otras

**Given:**
- Usuario tiene dirección A con `isDefault: true`
**When:** Crea dirección B con `isDefault: true`
**Then:**
- Dirección B se crea con `isDefault: true`
- Dirección A se actualiza automáticamente a `isDefault: false`

#### Scenario: Actualizar dirección existente como default

**Given:**
- Usuario tiene dirección A con `isDefault: true`
- Usuario tiene dirección B con `isDefault: false`
**When:** Actualiza dirección B con `PATCH /api/users/me/addresses/:idB` body `{ isDefault: true }`
**Then:**
- Dirección B se actualiza a `isDefault: true`
- Dirección A se actualiza automáticamente a `isDefault: false`

---

### Requirement: USER-006 - The system MUST prevent deletion of user's last address (BR-001)

Un usuario que ha completado onboarding MUST tener al menos una dirección. El sistema SHALL rechazar con error 400 Bad Request cualquier intento de eliminar la única dirección restante del usuario.

#### Scenario: Usuario intenta eliminar su única dirección

**Given:** Usuario tiene 1 dirección
**When:** Ejecuta `DELETE /api/users/me/addresses/:id`
**Then:**
- Respuesta: 400 Bad Request
- Body: `{ error: "No puedes eliminar la única dirección de tu perfil" }`
- Dirección NO se elimina

#### Scenario: Usuario elimina dirección teniendo múltiples

**Given:** Usuario tiene 2 direcciones
**When:** Ejecuta `DELETE /api/users/me/addresses/:id` (una de ellas)
**Then:**
- Respuesta: 204 No Content
- Dirección se elimina correctamente
- Usuario aún tiene 1 dirección

---

### Requirement: USER-007 - The system SHALL validate address ownership before update/delete operations

El sistema SHALL validar que las operaciones de update (`PATCH /api/users/me/addresses/:id`) y delete (`DELETE /api/users/me/addresses/:id`) solo puedan ejecutarse si la dirección pertenece al usuario autenticado. Si la dirección no pertenece al usuario, el sistema SHALL retornar 404 Not Found.

#### Scenario: Usuario intenta actualizar dirección de otro usuario

**Given:**
- Usuario A autenticado
- Dirección X pertenece a usuario B
**When:** Usuario A ejecuta `PATCH /api/users/me/addresses/:idX`
**Then:**
- Respuesta: 404 Not Found (dirección no encontrada en contexto del usuario A)
- Dirección NO se actualiza

#### Scenario: Usuario intenta eliminar dirección de otro usuario

**Given:**
- Usuario A autenticado
- Dirección X pertenece a usuario B
**When:** Usuario A ejecuta `DELETE /api/users/me/addresses/:idX`
**Then:**
- Respuesta: 404 Not Found
- Dirección NO se elimina

---

## MODIFIED Requirements

_(Ningún requisito existente se modifica en este change. Solo se agregan nuevos requisitos al módulo users.)_

---

## Testing Plan

### Casos de Prueba

Los siguientes casos de prueba están documentados en `/docs/md/STP-ReparaYa.md`, sección 4.1.2:

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-USER-001 | Obtener perfil de usuario autenticado (GET /api/users/me) | Integración | Alta | RF-003-01 |
| TC-USER-002 | Actualizar perfil de usuario autenticado (PATCH /api/users/me) | Integración | Alta | RF-003-02 |
| TC-USER-003 | Usuario no puede editar perfil de otro usuario | Integración | Alta | RF-003-02 |
| TC-USER-004 | Obtener perfil público de usuario (GET /api/users/:id/public) | Integración | Alta | RF-003-03 |
| TC-USER-005 | Crear dirección para usuario autenticado (POST /api/users/me/addresses) | Integración | Alta | RF-003-04 |
| TC-USER-006 | Actualizar dirección existente (PATCH /api/users/me/addresses/:id) | Integración | Media | RF-003-05 |
| TC-USER-007 | Eliminar dirección (DELETE /api/users/me/addresses/:id) | Integración | Media | RF-003-05 |
| TC-USER-008 | No permitir eliminar única dirección del usuario | Integración | Alta | BR-001 |
| TC-USER-009 | Flag isDefault se desactiva en otras direcciones al crear nueva como default | Unitaria | Alta | BR-002 |
| TC-USER-010 | Validación de datos con Zod en actualización de perfil | Unitaria | Alta | RNF-001 |

### Criterios de Cobertura

- ✅ Cobertura ≥ 75% en `src/modules/users`
- ✅ Tests unitarios para servicios, repositorios y validadores
- ✅ Tests de integración para todos los endpoints API
- ✅ Tests de seguridad (autorización, input sanitization)

### Estrategia de Testing

**Archivos de test:**
- `apps/web/src/modules/users/__tests__/userService.test.ts`
- `apps/web/src/modules/users/__tests__/addressService.test.ts`
- `apps/web/src/modules/users/__tests__/userRepository.test.ts`
- `apps/web/src/modules/users/__tests__/addressRepository.test.ts`
- `tests/integration/api/users.test.ts`

**Mocks:**
- Mock de Clerk para autenticación en tests de integración
- Mock de Prisma Client para tests unitarios
- Fixtures de usuarios y direcciones de prueba

**Ambientes:**
- Tests unitarios: mocks de Prisma
- Tests de integración: PostgreSQL de test (Supabase test o Docker)

---

## Implementation Notes

### Estructura del Módulo

```
apps/web/src/modules/users/
├── services/
│   ├── userService.ts          # CRUD de perfiles
│   └── addressService.ts       # Gestión de direcciones
├── repositories/
│   ├── userRepository.ts       # Acceso a datos de User
│   └── addressRepository.ts    # Acceso a datos de Address
├── types/
│   └── index.ts                # DTOs y tipos
├── validators/
│   └── index.ts                # Schemas Zod
├── errors/
│   └── index.ts                # Errores custom
└── __tests__/
    ├── userService.test.ts
    ├── addressService.test.ts
    ├── userRepository.test.ts
    └── addressRepository.test.ts
```

### Endpoints API

```
apps/web/app/api/users/
├── me/
│   ├── route.ts                # GET, PATCH /api/users/me
│   └── addresses/
│       ├── route.ts            # POST /api/users/me/addresses
│       └── [id]/
│           └── route.ts        # PATCH, DELETE /api/users/me/addresses/:id
└── [id]/
    └── public/
        └── route.ts            # GET /api/users/:id/public
```

### Dependencias

- `@clerk/nextjs`: Autenticación (ya instalado en change anterior)
- `zod`: Validación de schemas (ya instalado)
- `@prisma/client`: ORM (ya instalado)

### Variables de Entorno

No se requieren nuevas variables de entorno para este change.

---

## Handoff Notes

### Para módulos downstream (booking, messaging, ratings)

**Garantías de este módulo:**

1. Todos los clientes tienen perfil básico con datos de Clerk (`firstName`, `lastName`, `email`)
2. Campo `phone` es opcional (validar con `user.phone ?? 'N/A'`)
3. Endpoint `GET /api/users/:id/public` disponible para mostrar nombres/avatares
4. Cada cliente que completó onboarding tiene al menos 1 dirección

**Campos mínimos esperados en User:**
- `id` (UUID) - Usar como FK en relaciones
- `firstName`, `lastName` - Siempre presentes
- `phone` - Opcional (nullable)
- `avatarUrl` - Opcional (nullable, usar placeholder si null)

**Ejemplo de uso en booking:**
```typescript
import { userService } from '@/modules/users/services/userService';

const profile = await userService.getProfile(clientId);
const defaultAddress = profile.addresses.find(addr => addr.isDefault);
if (!defaultAddress) {
  throw new Error('Cliente no tiene dirección configurada');
}
```

### Para el change de contratistas (futuro)

El onboarding de contratistas NO está incluido en este change. Quedará para un change futuro que incluirá:
- Creación de `ContractorProfile`
- Upload de documentos de verificación a S3
- Integración con Stripe Connect
- Flujo de verificación KYC por admins

---

## Open Questions

_(Ninguna pregunta abierta. Todos los requisitos están claros.)_

---

**Estado del spec delta:** COMPLETO
**Listo para validación:** Sí
**Comando de validación:** `openspec validate 2025-11-17-client-profile-onboarding --strict`
