# Especificación: Gestión de Usuarios (Users)

## Propósito y alcance

Gestiona perfiles de usuarios (clientes, contratistas y admins), incluyendo
datos adicionales no manejados por Clerk, verificación de contratistas y
gestión de roles.

## Requisitos relacionados

- **RF-003**: Registro y gestión de perfiles
- **BR-007**: Verificación KYC para contratistas

## Interfaces y contratos

### Endpoints

**GET `/api/users/me`**
- Descripción: Obtener perfil del usuario autenticado
- Autorización: Usuario autenticado
- Respuesta: Perfil completo del usuario

**PATCH `/api/users/me`**
- Descripción: Actualizar perfil del usuario autenticado
- Autorización: Usuario autenticado
- Body: Campos actualizables (nombre, teléfono, etc.)

**POST `/api/users/contractor-profile`**
- Descripción: Crear/actualizar perfil de contratista
- Autorización: Usuario con rol 'contractor'
- Body: Datos profesionales, documentos de verificación

**GET `/api/users/:id/public`**
- Descripción: Obtener perfil público de un usuario (para mostrar en servicios)
- Autorización: Público
- Respuesta: Datos públicos (nombre, rating promedio, foto)

## Modelo de datos

### Entidad: User (heredada de auth)

```typescript
{
  id: string
  clerk_user_id: string
  email: string
  role: 'client' | 'contractor' | 'admin'
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
  status: 'active' | 'blocked' | 'pending_verification'
  created_at: timestamp
  updated_at: timestamp
}
```

### Entidad: ContractorProfile

```typescript
{
  id: string
  user_id: string (FK User)
  business_name?: string
  description?: string
  specialties: string[] // Categorías de servicios
  verified: boolean
  verification_documents: json // S3 keys de documentos
  stripe_connect_account_id?: string
  created_at: timestamp
  updated_at: timestamp
}
```

## Integraciones externas

- **Clerk**: Datos básicos de identidad
- **AWS S3**: Almacenamiento de documentos de verificación
- **Stripe Connect**: Vinculación de cuenta para payouts

## Consideraciones de seguridad

- Validar que solo el propietario puede editar su perfil
- Admins pueden ver/editar cualquier perfil
- Documentos de verificación solo accesibles por admin
- No exponer información sensible en endpoints públicos

## Testing & QA

### Tipos de pruebas

1. **Unitarias**:
   - Servicios de perfil (CRUD)
   - Validaciones de datos

2. **Integración**:
   - Endpoints de perfil con autorización
   - Upload de documentos a S3

3. **E2E**:
   - Flujo completo de registro como contratista

### Casos de prueba relacionados

- `TC-RF-003-05`: Creación de perfil de contratista
- `TC-RF-003-06`: Actualización de perfil
- `TC-RF-003-07`: Verificación KYC

## TODOs

- [ ] Definir esquema Prisma para ContractorProfile
- [ ] Implementar servicios CRUD
- [ ] Crear endpoints API
- [ ] Lógica de verificación KYC
- [ ] Tests
