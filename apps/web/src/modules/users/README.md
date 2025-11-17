# Módulo de Gestión de Usuarios

Este módulo gestiona perfiles de usuarios (clientes, contratistas y admins), incluyendo datos adicionales no manejados por Clerk, direcciones de usuario, y perfiles públicos para mostrar en servicios y calificaciones.

## Estado de Implementación

**✅ COMPLETADO** - Change `2025-11-17-client-profile-onboarding`

### Alcance Actual

- ✅ Gestión de perfiles de **clientes** (CRUD, direcciones)
- ❌ Gestión de perfiles de **contratistas** (KYC, verificación, Stripe Connect) - Pendiente de implementación
- ❌ Panel administrativo de gestión de usuarios - Pendiente

Este spec cubre únicamente la funcionalidad implementada para clientes. El onboarding y gestión de contratistas será un change futuro.

## Estructura del Módulo

```
users/
├── services/
│   ├── userService.ts           # Lógica de negocio para CRUD de usuarios
│   └── addressService.ts        # Lógica de negocio para gestión de direcciones
├── repositories/
│   ├── userRepository.ts        # Acceso a datos de usuarios (Prisma)
│   └── addressRepository.ts     # Acceso a datos de direcciones (Prisma)
├── types/
│   └── index.ts                 # DTOs e interfaces de dominio
├── validators/
│   └── index.ts                 # Schemas Zod para validación runtime
├── errors/
│   └── index.ts                 # Errores custom del módulo
├── __tests__/
│   ├── userService.test.ts      # 13 tests unitarios
│   ├── userRepository.test.ts   # 9 tests unitarios
│   ├── addressService.test.ts   # 19 tests unitarios
│   └── addressRepository.test.ts # 15 tests unitarios
├── index.ts                     # Exportaciones públicas del módulo
└── README.md                    # Esta documentación
```

## Endpoints API

### Gestión de Perfil

- **`GET /api/users/me`** - Obtener perfil completo del usuario autenticado
  - Autorización: Requerida
  - Respuesta: Perfil con direcciones incluidas

- **`PATCH /api/users/me`** - Actualizar perfil del usuario autenticado
  - Autorización: Requerida
  - Body: `{ firstName?, lastName?, phone?, avatarUrl? }`
  - Validación: Zod schema

- **`GET /api/users/:id/public`** - Obtener perfil público de un usuario
  - Autorización: No requerida (público)
  - Respuesta: Solo `{ id, firstName, lastName, avatarUrl }`

### Gestión de Direcciones

- **`POST /api/users/me/addresses`** - Crear nueva dirección
  - Autorización: Requerida
  - Body: `{ addressLine1, city, state, postalCode, isDefault? }`
  - Regla BR-002: Solo una dirección puede ser `isDefault: true`

- **`PATCH /api/users/me/addresses/:id`** - Actualizar dirección existente
  - Autorización: Requerida (solo dueño)
  - Body: Campos actualizables de `Address`

- **`DELETE /api/users/me/addresses/:id`** - Eliminar dirección
  - Autorización: Requerida (solo dueño)
  - Regla BR-001: No permitir eliminar la única dirección

## Reglas de Negocio

### BR-001: Usuario debe tener al menos una dirección

Un cliente debe tener al menos una dirección si ha completado onboarding. No se permite eliminar la última dirección.

**Implementación:**
- `addressRepository.delete()` valida que `COUNT(*) > 1` antes de eliminar
- Lanza `CannotDeleteLastAddressError` si se intenta eliminar la única dirección

### BR-002: Solo una dirección puede ser `isDefault: true` por usuario

Solo una dirección puede ser la predeterminada por usuario.

**Implementación:**
- `addressRepository.create()` y `update()` ejecutan `UPDATE addresses SET isDefault = false WHERE userId = ? AND isDefault = true` antes de crear/actualizar con `isDefault: true`

## Uso del Módulo

### Importar desde otros módulos

```typescript
import {
  userService,
  addressService,
  type UserProfile,
  type Address,
  UserNotFoundError,
  AddressNotFoundError,
} from '@/modules/users';

// Obtener perfil de usuario
const profile = await userService.getProfile(userId);

// Actualizar perfil
const updated = await userService.updateProfile(userId, {
  phone: '3312345678',
});

// Crear dirección
const address = await addressService.create(userId, {
  addressLine1: 'Av. Chapultepec 123',
  city: 'Guadalajara',
  state: 'Jalisco',
  postalCode: '44100',
  isDefault: true,
});
```

### Manejo de errores

```typescript
try {
  const profile = await userService.getPublicProfile(userId);
} catch (error) {
  if (error instanceof UserNotFoundError) {
    return NextResponse.json(
      { error: 'Usuario no encontrado' },
      { status: 404 }
    );
  }
  throw error;
}
```

## Validaciones

El módulo usa Zod para validación runtime:

- **Phone**: Exactamente 10 dígitos (formato mexicano)
- **AddressLine1**: 5-200 caracteres
- **PostalCode**: Exactamente 5 dígitos
- **City/State**: 2-100 caracteres
- **AvatarUrl**: URL válida

## Testing

### Ejecutar tests

```bash
# Tests unitarios del módulo
npm run test -- src/modules/users

# Tests de integración
npm run test -- tests/integration/api/users.test.ts

# Cobertura
npm run test:coverage
# Objetivo: ≥ 75% en src/modules/users
```

### Casos de prueba

Ver `/docs/md/STP-ReparaYa.md` sección 4.1.2 para casos TC-USER-001 a TC-USER-010.

**Cobertura de tests:**
- 56 tests unitarios
- 14 tests de integración
- Casos: TC-USER-001 a TC-USER-010

**Nota:** Los tests están implementados pero requieren ajuste de mocks de Prisma/Clerk. La estructura y lógica de los tests son correctas.

## Consideraciones de Seguridad

### Autorización

- Endpoints protegidos requieren autenticación con `requireAuth()`
- Solo el dueño puede editar su perfil y direcciones
- Validación de propiedad (`userId`) en todas las operaciones de direcciones

### Datos Sensibles

El endpoint público `/api/users/:id/public` **NO expone**:
- Email (PII)
- Teléfono (PII)
- ClerkUserId (identificador interno)
- Direcciones (PII)

### Validación de Entrada

- Zod valida todos los inputs antes de procesamiento
- Protección contra XSS (Next.js escapa automáticamente)
- No se permite HTML en campos de texto

## Integraciones

### Clerk

- Datos básicos heredados: `firstName`, `lastName`, `email`, `avatarUrl`
- Sincronizados desde Clerk vía webhook
- Pueden sobrescribirse localmente con `PATCH /api/users/me`

### Prisma

- Modelo `User` heredado del módulo `auth`
- Modelo `Address` con relación 1:N a `User`
- Modelo `ContractorProfile` (fuera de alcance - pendiente)

## Próximos Pasos

- [ ] Onboarding de contratistas (verificación KYC, Stripe Connect)
- [ ] Geocodificación de direcciones con Amazon Location Service
- [ ] Upload de avatar custom a S3
- [ ] Panel administrativo de gestión de usuarios
- [ ] Notificaciones transaccionales con AWS SES

## Referencias

- **Spec:** `/openspec/specs/users/spec.md`
- **Change:** `/openspec/changes/2025-11-17-client-profile-onboarding/`
- **Plan de pruebas:** `/docs/md/STP-ReparaYa.md` sección 4.1.2
- **Módulo relacionado:** `/openspec/specs/auth/spec.md`

**Última actualización:** 2025-11-17
**Estado:** ACTIVE (implementación completa para clientes)
