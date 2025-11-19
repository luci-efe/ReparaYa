# Tasks: Client Profile Onboarding

**Change ID:** `2025-11-17-client-profile-onboarding`

Este documento describe las tareas técnicas necesarias para implementar el módulo de perfiles de usuario (clientes). Las tareas están ordenadas por dependencias y priorizadas para entregar valor incremental.

## Fase 1: Fundamentos del Módulo (Día 1)

### 1.1. Crear estructura de carpetas del módulo users

**Prioridad:** Alta
**Estimación:** 30 min
**Dependencias:** Ninguna

```bash
mkdir -p apps/web/src/modules/users/{services,repositories,types,validators,errors,__tests__}
```

**Entregables:**
- Estructura de carpetas creada
- README.md actualizado con descripción del módulo

### 1.2. Definir tipos y DTOs

**Prioridad:** Alta
**Estimación:** 1 hora
**Dependencias:** 1.1

**Archivos a crear:**

`apps/web/src/modules/users/types/index.ts`:
```typescript
export interface UserProfile {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  addresses: Address[];
}

export interface Address {
  id: string;
  userId: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat: Decimal | null;
  lng: Decimal | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs para request/response
export interface UpdateUserProfileDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface CreateAddressDTO {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}

export interface UpdateAddressDTO {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isDefault?: boolean;
}

export interface PublicUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}
```

**Criterios de validación:**
- Tipos exportados correctamente
- DTOs separados para request/response
- Tipos alineados con schema Prisma

### 1.3. Crear validadores Zod

**Prioridad:** Alta
**Estimación:** 1.5 horas
**Dependencias:** 1.2

**Archivos a crear:**

`apps/web/src/modules/users/validators/index.ts`:
```typescript
import { z } from 'zod';

export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().regex(/^\d{10}$/, 'Teléfono debe tener 10 dígitos').optional(),
  avatarUrl: z.string().url().optional(),
});

export const createAddressSchema = z.object({
  addressLine1: z.string().min(5).max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  postalCode: z.string().regex(/^\d{5}$/, 'Código postal debe tener 5 dígitos'),
  isDefault: z.boolean().optional().default(false),
});

export const updateAddressSchema = z.object({
  addressLine1: z.string().min(5).max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  postalCode: z.string().regex(/^\d{5}$/, 'Código postal debe tener 5 dígitos').optional(),
  isDefault: z.boolean().optional(),
});
```

**Validaciones implementadas:**
- firstName/lastName: entre 1-100 caracteres
- phone: regex para 10 dígitos (formato mexicano)
- postalCode: regex para 5 dígitos
- addressLine1: mínimo 5 caracteres

**Criterios de validación:**
- Schemas Zod exportados
- Validaciones cubren casos edge (strings vacíos, formatos inválidos)
- Mensajes de error descriptivos en español

### 1.4. Crear errores custom

**Prioridad:** Media
**Estimación:** 30 min
**Dependencias:** Ninguna

**Archivos a crear:**

`apps/web/src/modules/users/errors/index.ts`:
```typescript
export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`Usuario con ID ${userId} no encontrado`);
    this.name = 'UserNotFoundError';
  }
}

export class AddressNotFoundError extends Error {
  constructor(addressId: string) {
    super(`Dirección con ID ${addressId} no encontrada`);
    this.name = 'AddressNotFoundError';
  }
}

export class ForbiddenActionError extends Error {
  constructor(action: string) {
    super(`Acción no permitida: ${action}`);
    this.name = 'ForbiddenActionError';
  }
}

export class CannotDeleteLastAddressError extends Error {
  constructor() {
    super('No puedes eliminar la única dirección de tu perfil');
    this.name = 'CannotDeleteLastAddressError';
  }
}
```

**Criterios de validación:**
- Errores extienden `Error`
- Nombres descriptivos para debugging
- Mensajes de error en español

---

## Fase 2: Capa de Datos (Día 1-2)

### 2.1. Crear userRepository

**Prioridad:** Alta
**Estimación:** 2 horas
**Dependencias:** 1.2, 1.4

**Archivo a crear:**

`apps/web/src/modules/users/repositories/userRepository.ts`:
```typescript
import { prisma } from '@/lib/prisma';
import { UserNotFoundError } from '../errors';
import type { UpdateUserProfileDTO, UserProfile } from '../types';

export const userRepository = {
  async findById(id: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { addresses: true },
    });
    return user;
  },

  async findByClerkUserId(clerkUserId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      include: { addresses: true },
    });
    return user;
  },

  async update(id: string, data: UpdateUserProfileDTO): Promise<UserProfile> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data,
        include: { addresses: true },
      });
      return user;
    } catch (error) {
      throw new UserNotFoundError(id);
    }
  },

  async getPublicProfile(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });
    if (!user) throw new UserNotFoundError(id);
    return user;
  },
};
```

**Criterios de validación:**
- Métodos async con manejo de errores
- Uso de Prisma Client tipado
- Include de `addresses` para perfil completo
- Select de campos públicos en `getPublicProfile`

### 2.2. Crear addressRepository

**Prioridad:** Alta
**Estimación:** 2 horas
**Dependencias:** 1.2, 1.4

**Archivo a crear:**

`apps/web/src/modules/users/repositories/addressRepository.ts`:
```typescript
import { prisma } from '@/lib/prisma';
import { AddressNotFoundError } from '../errors';
import type { CreateAddressDTO, UpdateAddressDTO } from '../types';

export const addressRepository = {
  async create(userId: string, data: CreateAddressDTO) {
    // Si isDefault: true, desactivar otras direcciones
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return await prisma.address.create({
      data: {
        ...data,
        userId,
        country: 'MX', // Hardcoded para México
      },
    });
  },

  async update(id: string, userId: string, data: UpdateAddressDTO) {
    // Verificar que la dirección pertenece al usuario
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });
    if (!address) throw new AddressNotFoundError(id);

    // Si isDefault: true, desactivar otras direcciones
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    return await prisma.address.update({
      where: { id },
      data,
    });
  },

  async delete(id: string, userId: string) {
    // Verificar que no es la única dirección
    const addressCount = await prisma.address.count({
      where: { userId },
    });
    if (addressCount <= 1) {
      throw new CannotDeleteLastAddressError();
    }

    // Verificar que pertenece al usuario
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });
    if (!address) throw new AddressNotFoundError(id);

    await prisma.address.delete({ where: { id } });
  },

  async findByUserId(userId: string) {
    return await prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  },

  async findById(id: string, userId: string) {
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });
    if (!address) throw new AddressNotFoundError(id);
    return address;
  },
};
```

**Lógica de negocio implementada:**
- BR-002: Solo una dirección `isDefault: true` por usuario
- BR-001: No permitir eliminar la única dirección

**Criterios de validación:**
- Transacciones implícitas de Prisma
- Validación de propiedad (userId) antes de update/delete
- Orden por `isDefault DESC` en listados

### 2.3. Escribir tests de repositorios

**Prioridad:** Alta
**Estimación:** 2 horas
**Dependencias:** 2.1, 2.2

**Archivos a crear:**

`apps/web/src/modules/users/__tests__/userRepository.test.ts`
`apps/web/src/modules/users/__tests__/addressRepository.test.ts`

**Casos de prueba:**

**userRepository.test.ts:**
- `findById` retorna usuario con addresses
- `findById` retorna null si no existe
- `update` actualiza campos correctamente
- `update` lanza UserNotFoundError si ID inválido
- `getPublicProfile` solo retorna campos públicos
- `getPublicProfile` lanza error si usuario no existe

**addressRepository.test.ts:**
- `create` crea dirección correctamente
- `create` con `isDefault: true` desactiva otras direcciones
- `update` actualiza campos correctamente
- `update` valida propiedad (userId)
- `delete` elimina dirección correctamente
- `delete` lanza error si es la única dirección
- `delete` valida propiedad (userId)

**Setup de tests:**
- Mock de Prisma Client con `jest.mock`
- Fixtures de usuarios y direcciones de prueba

**Criterios de validación:**
- Cobertura ≥ 90% en archivos de repository
- Tests aislados con mocks (no tocan DB real)

---

## Fase 3: Capa de Servicios (Día 2)

### 3.1. Crear userService

**Prioridad:** Alta
**Estimación:** 2 horas
**Dependencias:** 2.1

**Archivo a crear:**

`apps/web/src/modules/users/services/userService.ts`:
```typescript
import { userRepository } from '../repositories/userRepository';
import { updateUserProfileSchema } from '../validators';
import type { UpdateUserProfileDTO } from '../types';

export const userService = {
  async getProfile(userId: string) {
    return await userRepository.findById(userId);
  },

  async updateProfile(userId: string, data: UpdateUserProfileDTO) {
    // Validar con Zod
    const validated = updateUserProfileSchema.parse(data);
    return await userRepository.update(userId, validated);
  },

  async getPublicProfile(userId: string) {
    return await userRepository.getPublicProfile(userId);
  },
};
```

**Criterios de validación:**
- Validación Zod antes de llamar repository
- Lanzar excepciones descriptivas
- Métodos async con tipos correctos

### 3.2. Crear addressService

**Prioridad:** Alta
**Estimación:** 2 horas
**Dependencias:** 2.2

**Archivo a crear:**

`apps/web/src/modules/users/services/addressService.ts`:
```typescript
import { addressRepository } from '../repositories/addressRepository';
import { createAddressSchema, updateAddressSchema } from '../validators';
import type { CreateAddressDTO, UpdateAddressDTO } from '../types';

export const addressService = {
  async create(userId: string, data: CreateAddressDTO) {
    const validated = createAddressSchema.parse(data);
    return await addressRepository.create(userId, validated);
  },

  async update(addressId: string, userId: string, data: UpdateAddressDTO) {
    const validated = updateAddressSchema.parse(data);
    return await addressRepository.update(addressId, userId, validated);
  },

  async delete(addressId: string, userId: string) {
    return await addressRepository.delete(addressId, userId);
  },

  async getByUserId(userId: string) {
    return await addressRepository.findByUserId(userId);
  },

  async getById(addressId: string, userId: string) {
    return await addressRepository.findById(addressId, userId);
  },
};
```

**Criterios de validación:**
- Validación Zod en create/update
- Propagación de errores de repository
- Métodos documentados con JSDoc

### 3.3. Escribir tests de servicios

**Prioridad:** Alta
**Estimación:** 2.5 horas
**Dependencias:** 3.1, 3.2

**Archivos a crear:**

`apps/web/src/modules/users/__tests__/userService.test.ts`
`apps/web/src/modules/users/__tests__/addressService.test.ts`

**Casos de prueba:**

**userService.test.ts:**
- `getProfile` retorna perfil completo
- `updateProfile` valida con Zod antes de actualizar
- `updateProfile` rechaza phone con formato inválido
- `getPublicProfile` solo retorna campos públicos

**addressService.test.ts:**
- `create` valida dirección con Zod
- `create` rechaza postalCode con formato inválido
- `update` valida datos con Zod
- `delete` rechaza si es la única dirección (BR-001)
- Flag `isDefault` se desactiva en otras direcciones (BR-002)

**Setup de tests:**
- Mock de repositories
- Mock de validators Zod (opcional, mejor validar realmente)
- Fixtures de datos de prueba

**Criterios de validación:**
- Cobertura ≥ 85% en archivos de service
- Tests verifican validación Zod
- Tests verifican reglas de negocio (BR-001, BR-002)

---

## Fase 4: Endpoints API (Día 3)

### 4.1. Crear GET /api/users/me

**Prioridad:** Alta
**Estimación:** 1 hora
**Dependencias:** 3.1

**Archivo a crear:**

`apps/web/app/api/users/me/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { requireAuth } from '@/modules/auth';
import { userService } from '@/modules/users/services/userService';

export async function GET() {
  try {
    const user = await requireAuth();
    const profile = await userService.getProfile(user.id);
    return NextResponse.json(profile);
  } catch (error) {
    if (error.name === 'UnauthorizedError') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
```

**Criterios de validación:**
- Middleware `requireAuth` protege endpoint
- Retorna perfil con addresses incluidas
- Manejo de errores con códigos HTTP correctos

### 4.2. Crear PATCH /api/users/me

**Prioridad:** Alta
**Estimación:** 1.5 horas
**Dependencias:** 3.1

**Archivo a crear:**

`apps/web/app/api/users/me/route.ts` (extender con método PATCH):
```typescript
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const updated = await userService.updateProfile(user.id, body);
    return NextResponse.json(updated);
  } catch (error) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    // ... otros errores
  }
}
```

**Criterios de validación:**
- Validación Zod rechaza inputs inválidos con 400
- Solo el dueño puede actualizar su perfil (verificado por `requireAuth`)
- Respuesta incluye perfil actualizado

### 4.3. Crear GET /api/users/:id/public

**Prioridad:** Alta
**Estimación:** 1 hora
**Dependencias:** 3.1

**Archivo a crear:**

`apps/web/app/api/users/[id]/public/route.ts`:
```typescript
import { NextResponse } from 'next/server';
import { userService } from '@/modules/users/services/userService';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const profile = await userService.getPublicProfile(params.id);
    return NextResponse.json(profile);
  } catch (error) {
    if (error.name === 'UserNotFoundError') {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
```

**Criterios de validación:**
- Sin autenticación requerida (endpoint público)
- Solo retorna `firstName`, `lastName`, `avatarUrl`
- No expone datos sensibles (email, phone)

### 4.4. Crear endpoints de direcciones

**Prioridad:** Alta
**Estimación:** 2 horas
**Dependencias:** 3.2

**Archivos a crear:**

`apps/web/app/api/users/me/addresses/route.ts`:
```typescript
// POST /api/users/me/addresses
export async function POST(request: Request) {
  const user = await requireAuth();
  const body = await request.json();
  const address = await addressService.create(user.id, body);
  return NextResponse.json(address, { status: 201 });
}
```

`apps/web/app/api/users/me/addresses/[id]/route.ts`:
```typescript
// PATCH /api/users/me/addresses/:id
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  const body = await request.json();
  const address = await addressService.update(params.id, user.id, body);
  return NextResponse.json(address);
}

// DELETE /api/users/me/addresses/:id
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();
  await addressService.delete(params.id, user.id);
  return NextResponse.json({ success: true }, { status: 204 });
}
```

**Criterios de validación:**
- Todos protegidos con `requireAuth`
- Validación de propiedad (userId)
- DELETE retorna 204 No Content
- Errores con códigos HTTP apropiados

---

## Fase 5: Tests de Integración (Día 3-4)

### 5.1. Escribir tests de integración de endpoints

**Prioridad:** Alta
**Estimación:** 3 horas
**Dependencias:** 4.1, 4.2, 4.3, 4.4

**Archivo a crear:**

`tests/integration/api/users.test.ts`:

**Setup:**
- Mock de Clerk auth
- Base de datos de test (PostgreSQL test o Supabase test)
- Fixtures de usuarios de prueba

**Casos de prueba (alineados con STP):**

| Test Case | Endpoint | Escenario |
|-----------|----------|-----------|
| TC-USER-001 | GET /api/users/me | Usuario autenticado obtiene su perfil |
| TC-USER-002 | PATCH /api/users/me | Usuario actualiza su perfil correctamente |
| TC-USER-003 | PATCH /api/users/me | Usuario no puede editar perfil de otro (403) |
| TC-USER-004 | GET /api/users/:id/public | Cualquiera obtiene perfil público |
| TC-USER-005 | POST /api/users/me/addresses | Usuario crea dirección |
| TC-USER-006 | PATCH /api/users/me/addresses/:id | Usuario actualiza su dirección |
| TC-USER-007 | DELETE /api/users/me/addresses/:id | Usuario elimina dirección |
| TC-USER-008 | DELETE /api/users/me/addresses/:id | No permitir eliminar única dirección (400) |

**Criterios de validación:**
- Tests usan supertest o fetch de Next.js
- Cada test limpia DB antes de ejecutar (setup/teardown)
- Cobertura de casos felices y casos de error
- Verificación de códigos HTTP correctos

### 5.2. Tests de seguridad y autorización

**Prioridad:** Alta
**Estimación:** 1.5 horas
**Dependencias:** 5.1

**Casos de prueba adicionales:**

| Test | Escenario | Resultado Esperado |
|------|-----------|-------------------|
| TC-USER-003 | Usuario A intenta PATCH /api/users/me (autenticado como B) | 403 Forbidden |
| Sin auth | GET /api/users/me sin header de autenticación | 401 Unauthorized |
| Endpoint público | GET /api/users/:id/public sin auth | 200 OK (solo campos públicos) |
| Input sanitization | PATCH /api/users/me con HTML en firstName | 400 Bad Request (Zod rechaza) |

**Criterios de validación:**
- Tests verifican que solo el dueño edita su perfil
- Tests verifican que endpoint público no requiere auth
- Tests verifican que datos sensibles no se exponen

---

## Fase 6: Documentación y Testing Final (Día 4-5)

### 6.1. Actualizar STP con casos de prueba

**Prioridad:** Alta
**Estimación:** 2 horas
**Dependencias:** 5.1, 5.2

**Archivo a actualizar:**

`docs/md/STP-ReparaYa.md`

**Acciones:**

1. Agregar sección **4.1.2 Gestión de Usuarios (Users)**
2. Documentar casos TC-USER-001 a TC-USER-010 con formato del STP:

```markdown
### 4.1.2. Gestión de Usuarios (Users)

#### TC-USER-001: Obtener perfil de usuario autenticado

**Objetivo:** Verificar que un usuario autenticado puede obtener su perfil completo.

**Precondiciones:**
- Usuario registrado en Clerk
- Usuario autenticado con token válido

**Pasos:**
1. Autenticarse como usuario de prueba
2. Ejecutar GET /api/users/me con header de autenticación
3. Verificar respuesta

**Resultado Esperado:**
- Status: 200 OK
- Body contiene: id, email, firstName, lastName, phone, addresses[]

**Resultado Real:** PASS

**Fecha de ejecución:** 2025-11-XX
```

3. Agregar registro de ejecución en sección 11 (Resultados de pruebas)

**Criterios de validación:**
- Todos los casos TC-USER-001 a TC-USER-010 documentados
- Formato consistente con casos TC-AUTH-*
- Resultados de ejecución incluidos

### 6.2. Reescribir spec de users

**Prioridad:** Alta
**Estimación:** 2 horas
**Dependencias:** Ninguna (puede hacerse en paralelo)

**Archivo a actualizar:**

`openspec/specs/users/spec.md`

**Acciones:**

1. Convertir TODOs en requisitos formales
2. Agregar secciones obligatorias de OpenSpec:
   - Requirements (ADDED/MODIFIED)
   - Scenarios (casos de uso concretos)
   - Interfaces (endpoints documentados)
   - Security (autorización, validación)
   - Testing Plan (referencia a STP)

**Formato de requisitos:**

```markdown
## Requirements

### ADDED Requirements

#### Requirement: Obtener perfil de usuario autenticado
**ID:** RF-003-01
**Priority:** High
**Type:** Functional

Un usuario autenticado puede obtener su perfil completo, incluyendo direcciones.

##### Scenario: Usuario autenticado obtiene su perfil

**Given:** Usuario está autenticado con Clerk
**When:** Ejecuta GET /api/users/me
**Then:**
- Respuesta 200 OK
- Body contiene perfil completo con addresses[]
- Campos incluyen: id, email, firstName, lastName, phone, avatarUrl
```

**Criterios de validación:**
- Spec sigue formato OpenSpec estándar
- Todos los endpoints documentados con ejemplos
- Plan de testing referencia casos TC-USER-*
- Validación con `openspec validate --strict`

### 6.3. Crear carpeta specs del change

**Prioridad:** Media
**Estimación:** 1 hora
**Dependencias:** 6.2

**Estructura a crear:**

```
openspec/changes/2025-11-17-client-profile-onboarding/specs/users/
└── spec.md  # Delta del spec (solo cambios ADDED/MODIFIED)
```

**Contenido del delta:**

```markdown
# Spec Delta: Users Module (Client Profile Onboarding)

## ADDED Requirements

### Requirement: Gestión de perfiles de cliente
[Mismo contenido que en openspec/specs/users/spec.md]

## MODIFIED Requirements

[Si se modifica algún requisito existente]

## Testing Plan

- TC-USER-001 a TC-USER-010 (ver STP sección 4.1.2)
```

**Criterios de validación:**
- Delta solo incluye cambios de este change
- Formato OpenSpec correcto
- Referencias a STP actualizadas

### 6.4. Ejecutar tests y verificar cobertura

**Prioridad:** Alta
**Estimación:** 1 hora
**Dependencias:** 5.1, 5.2

**Comandos a ejecutar:**

```bash
# Tests unitarios
npm run test -- src/modules/users

# Tests de integración
npm run test -- tests/integration/api/users.test.ts

# Verificación de cobertura
npm run test:coverage
# Verificar que src/modules/users tenga ≥ 75%

# Build
npm run build
# Debe compilar sin errores

# Linter
npm run lint
# Debe pasar sin errores
```

**Criterios de validación:**
- ✅ Cobertura ≥ 75% en src/modules/users
- ✅ Todos los tests pasan (0 failures)
- ✅ Build exitoso
- ✅ Linter sin errores

### 6.5. Actualizar openspec/project.md

**Prioridad:** Media
**Estimación:** 15 min
**Dependencias:** 6.2

**Archivo a actualizar:**

`openspec/project.md`

**Cambio a realizar:**

```diff
### Active Specifications

- **auth** (`/openspec/specs/auth/`):
  - `auth-clerk-integration` - Integración de Clerk para autenticación, sesiones, roles y sincronización de usuarios

-- **users** (`/openspec/specs/users/`) - _Pendiente de definición_
++ **users** (`/openspec/specs/users/`) - Gestión de perfiles de usuario (clientes), direcciones y datos públicos
```

**Criterios de validación:**
- Link a spec actualizado
- Descripción concisa del módulo
- Formato consistente con otras especificaciones

---

## Fase 7: Validación y PR (Día 5)

### 7.1. Validar con openspec

**Prioridad:** Alta
**Estimación:** 30 min
**Dependencias:** 6.2, 6.3

**Comandos a ejecutar:**

```bash
# Validar change completo
openspec validate 2025-11-17-client-profile-onboarding --strict

# Validar spec de users
openspec show users --type spec
```

**Criterios de validación:**
- Sin errores de validación
- Spec delta alineado con spec base
- Referencias correctas en proposal.md y tasks.md

### 7.2. Ejecutar tests E2E manuales

**Prioridad:** Alta
**Estimación:** 1 hora
**Dependencias:** 4.4

**Procedimientos de prueba (manual):**

1. **Registro de nuevo usuario:**
   - Ir a `/sign-up`
   - Registrarse con email/password
   - Verificar que webhook crea registro en BD

2. **Actualización de perfil:**
   - Autenticarse
   - Ir a `/dashboard` o `/perfil`
   - Editar teléfono y nombre
   - Verificar que cambios se guardan

3. **Gestión de direcciones:**
   - Crear nueva dirección
   - Marcar como predeterminada
   - Verificar que otras direcciones se desactivan
   - Intentar eliminar única dirección (debe fallar)

4. **Perfil público:**
   - Abrir `/api/users/:id/public` en navegador
   - Verificar que solo muestra firstName, lastName, avatarUrl
   - Verificar que no muestra email ni phone

**Criterios de validación:**
- Todos los flujos manuales exitosos
- Resultados documentados en STP sección 11

### 7.3. Crear PR hacia dev

**Prioridad:** Alta
**Estimación:** 30 min
**Dependencias:** 7.1, 7.2

**Comandos a ejecutar:**

```bash
# Commit de cambios
git add .
git commit -m "feat: implementar módulo de perfiles de usuario (clientes)

- Servicios CRUD de usuarios y direcciones
- Endpoints API /api/users/* con validación Zod
- Reglas de negocio: única dirección default, no eliminar última dirección
- Tests unitarios e integración (75% cobertura)
- Actualización de STP con casos TC-USER-001 a TC-USER-010
- Spec users reescrito con formato OpenSpec

Implementa change 2025-11-17-client-profile-onboarding

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"

# Push a rama feature
git push -u origin feature/creacion-de-clientes

# Crear PR con gh CLI
gh pr create \
  --base dev \
  --title "feat: Módulo de perfiles de usuario (clientes)" \
  --body "$(cat <<'EOF'
## Summary

Implementación completa del módulo de gestión de perfiles de usuario para clientes, incluyendo:

- ✅ Servicios de dominio para CRUD de usuarios y direcciones
- ✅ Endpoints API REST con validación Zod
- ✅ Reglas de negocio: única dirección default (BR-002), no eliminar última dirección (BR-001)
- ✅ Tests unitarios e integración con 75% de cobertura
- ✅ Actualización del STP con casos TC-USER-001 a TC-USER-010
- ✅ Spec `/openspec/specs/users/spec.md` reescrito

## Cambios Principales

### Módulo users implementado
- `userService.ts`: CRUD de perfiles
- `addressService.ts`: Gestión de direcciones
- Repositorios con Prisma
- Validadores Zod
- Errores custom

### Endpoints API
- `GET /api/users/me` - Obtener perfil autenticado
- `PATCH /api/users/me` - Actualizar perfil
- `POST /api/users/me/addresses` - Crear dirección
- `PATCH /api/users/me/addresses/:id` - Actualizar dirección
- `DELETE /api/users/me/addresses/:id` - Eliminar dirección
- `GET /api/users/:id/public` - Perfil público

### Testing
- Cobertura: 75% en src/modules/users
- Tests unitarios: 18 tests
- Tests de integración: 10 tests
- Casos STP: TC-USER-001 a TC-USER-010

## Test Plan

Ver `/docs/md/STP-ReparaYa.md` sección 4.1.2

## Checklist

- [x] Tests pasan localmente
- [x] Cobertura ≥ 75%
- [x] Build exitoso
- [x] Linter sin errores
- [x] STP actualizado
- [x] Spec validado con openspec
- [x] E2E manual ejecutado

## Relacionado

Change: `2025-11-17-client-profile-onboarding`
Desbloquea: booking-checkout, messaging, ratings

🤖 Generated with Claude Code
EOF
)"
```

**Criterios de validación:**
- PR creado hacia `dev`
- Título y descripción claros
- CodeRabbit revisa automáticamente
- CI/CD ejecuta tests en PR

---

## Dependencias Entre Tareas

```
1.1 → 1.2 → 1.3
         ↓
    1.4  2.1 → 3.1 → 4.1 → 5.1 → 7.1
         ↓      ↓      ↓      ↓      ↓
    1.4  2.2 → 3.2 → 4.2 → 5.2 → 7.2
                    ↓              ↓
                   4.3           7.3
                    ↓
                   4.4 → 6.1
                         ↓
                   6.2 → 6.3 → 6.4 → 6.5
```

**Tareas paralelizables:**
- 1.2, 1.3, 1.4 (pueden hacerse en paralelo después de 1.1)
- 6.1, 6.2 (pueden hacerse en paralelo)
- 2.1, 2.2 (pueden hacerse en paralelo)
- 3.1, 3.2 (pueden hacerse en paralelo después de 2.*)

**Ruta crítica:**
1.1 → 1.2 → 2.1 → 3.1 → 4.1 → 5.1 → 6.1 → 7.1 → 7.2 → 7.3

**Estimación total:** 5 días (considerando paralelización de tareas)

---

## Verificación Final

Antes de ejecutar `/openspec:apply`, verificar:

- [x] proposal.md completo y aprobado
- [x] tasks.md con todas las tareas detalladas
- [x] Estimaciones de tiempo realistas
- [x] Dependencias claras
- [x] Criterios de validación específicos
- [x] Plan de testing completo
- [x] Actualización de STP planificada

**Siguiente paso:** Obtener aprobación y ejecutar `/openspec:apply` para iniciar implementación.
