# Spec Delta: Users Module - Client Profile Onboarding

**Change ID:** `2025-11-17-client-profile-onboarding`
**Created:** 2025-11-17

## Purpose

Este spec delta documenta las adiciones al módulo `users` para implementar el flujo de onboarding y gestión de perfiles de clientes. Habilita a usuarios autenticados a completar su perfil con información adicional (teléfono, direcciones) y gestionar sus datos personales mediante endpoints REST API con validación Zod y autorización por rol.

---

## ADDED

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

## MODIFIED

_(No hay requisitos modificados en este change)_

---

## REMOVED

_(No hay requisitos removidos en este change)_

