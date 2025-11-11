# Especificación: Autenticación (Auth)

## Propósito y alcance

Este módulo gestiona la autenticación de usuarios mediante la integración con Clerk,
sincroniza usuarios con la base de datos local, y proporciona middleware de autorización
basado en roles.

## Requisitos relacionados

- **RF-003**: Registro e inicio de sesión
- **RNF-3.5.3**: Seguridad (autenticación robusta, MFA opcional)
- **BR-007**: Verificación KYC para contratistas

## Interfaces y contratos

### Webhooks de Clerk

**Endpoint**: `POST /api/webhooks/clerk`

Procesa eventos de Clerk para sincronizar usuarios:
- `user.created`: Crear registro en tabla `users` con `clerk_user_id`
- `user.updated`: Actualizar datos del usuario
- `user.deleted`: Marcar usuario como inactivo (soft delete)

**Payload esperado** (firma verificada con secret de Clerk):
```json
{
  "type": "user.created",
  "data": {
    "id": "user_xxx",
    "email_addresses": [...],
    "first_name": "...",
    "last_name": "..."
  }
}
```

### Middleware de autorización

**Función**: `requireAuth(roles?: string[])`

Protege rutas verificando:
1. Usuario autenticado (sesión Clerk válida)
2. Rol del usuario (si se especifica)

```typescript
// Ejemplo de uso en API route
export const GET = requireAuth(['client', 'contractor'])(async (req, context) => {
  // Lógica del endpoint
});
```

## Modelo de datos

### Entidad: User

```typescript
{
  id: string (uuid)
  clerk_user_id: string (unique, not null)
  email: string (unique, not null)
  role: 'client' | 'contractor' | 'admin'
  first_name: string
  last_name: string
  status: 'active' | 'blocked' | 'pending_verification'
  created_at: timestamp
  updated_at: timestamp
}
```

**Relaciones**:
- `role = 'contractor'` → puede tener perfil extendido en tabla `contractor_profiles`

## Integraciones externas

### Clerk

- SDK: `@clerk/nextjs`
- Configuración:
  - `ClerkProvider` en layout raíz
  - Variables de entorno: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- Webhooks con verificación de firma (svix)

## Consideraciones de seguridad

- Verificar firma de webhooks de Clerk antes de procesar
- No exponer `clerk_user_id` en respuestas públicas
- Logs de auditoría para cambios de rol (solo admins)
- Rate limiting en webhook endpoint (prevenir abuse)

## Testing & QA

### Tipos de pruebas

1. **Unitarias**:
   - Verificación de firma de webhook
   - Lógica de sincronización de usuarios
   - Helpers de roles

2. **Integración**:
   - Webhook end-to-end con payload de prueba
   - Middleware de autorización en rutas protegidas
   - Clerk test mode

3. **E2E**:
   - Flujo completo: registro → verificación email → acceso a perfil

### Casos de prueba relacionados

- `TC-RF-003-01`: Registro exitoso de usuario
- `TC-RF-003-02`: Login con credenciales válidas
- `TC-RF-003-03`: Autorización por rol
- `TC-RF-003-04`: Webhook de Clerk procesa correctamente

## TODOs

- [ ] Configurar ClerkProvider en layout
- [ ] Implementar webhook handler
- [ ] Crear middleware requireAuth
- [ ] Definir esquema Prisma para User
- [ ] Tests de integración con Clerk test mode
