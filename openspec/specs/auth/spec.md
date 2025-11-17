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
- `user.created`: Crear registro en tabla `users` con `clerkUserId`, `email`, `firstName`, `lastName`, `avatarUrl`, `role=CLIENT` (default)
- `user.updated`: Actualizar `email`, `firstName`, `lastName`, `avatarUrl` si cambian en Clerk
- `user.deleted`: Marcar como `status=BLOCKED` (soft delete, no eliminar físicamente)

**Nota importante:** El campo `role` NO se sincroniza desde Clerk. Se gestiona exclusivamente en la base de datos de ReparaYa.

**Payload esperado** (firma verificada con secret de Clerk):
```json
{
  "type": "user.created",
  "data": {
    "id": "user_xxx",
    "email_addresses": [...],
    "first_name": "...",
    "last_name": "...",
    "image_url": "..."
  }
}
```

**Idempotencia:**
- Se usa `prisma.user.upsert()` con `clerkUserId` como clave única
- No se requiere tabla `ProcessedWebhookEvent` para Clerk (suficiente con constraint único)
- Evento duplicado no causa error ni duplicación de datos

### Middleware de Next.js (Clerk v5)

**Configuración en `middleware.ts`:**
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',                    // Landing page
  '/sign-in(.*)',         // Rutas de sign-in
  '/sign-up(.*)',         // Rutas de sign-up
  '/servicios(.*)',       // Catálogo público
  '/api/webhooks(.*)',    // Webhooks (verificación por firma)
]);

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});
```

**Ventajas de `clerkMiddleware` (v5):**
- API moderna y mantenida activamente
- Control fino por ruta
- Mejor performance que `authMiddleware` (deprecado)

### Helpers de autorización

**Función**: `requireRole(role: UserRole)`

Protege rutas verificando:
1. Usuario autenticado (sesión Clerk válida)
2. Rol del usuario coincide con el requerido

```typescript
// Ejemplo de uso en API route
import { requireRole } from '@/modules/auth';

export async function GET() {
  const user = await requireRole('ADMIN');
  // Lógica del endpoint (solo si es ADMIN)
}
```

**Errores lanzados:**
- `UnauthorizedError` (401): Sin sesión válida
- `ForbiddenError` (403): Sesión válida pero rol insuficiente

## Modelo de datos

### Entidad: User (Prisma schema)

```typescript
{
  id: string (uuid)
  clerkUserId: string (unique, not null)
  email: string (unique, not null)
  firstName: string
  lastName: string
  phone: string?
  avatarUrl: string?
  role: UserRole (CLIENT | CONTRACTOR | ADMIN, default: CLIENT)
  status: UserStatus (ACTIVE | BLOCKED | PENDING_VERIFICATION, default: ACTIVE)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Relaciones:**
- `role = CONTRACTOR` → puede tener perfil extendido en tabla `ContractorProfile` (1:1)
- Usuario puede tener múltiples `Address` (1:N)

**Índices:**
- `clerkUserId` (único)
- `email` (único)
- `(role, status)` (compuesto para filtros comunes)

## Integraciones externas

### Clerk

- **SDK**: `@clerk/nextjs` v5.x
- **Versión de API**: Clerk v5 (usa `clerkMiddleware`, no `authMiddleware` deprecado)

**Variables de entorno requeridas:**

Obtener de **Clerk Dashboard → API Keys**:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
```

Opcionales (solo si usas rutas custom):
```bash
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

Solo cuando implementes webhook (obtener de **Clerk Dashboard → Webhooks → Create Endpoint**):
```bash
CLERK_WEBHOOK_SECRET="whsec_..."
```

**Nota:** Valores reales en `.env.local` (gitignored). Placeholders en `.env.example` (commiteado).

**Configuración:**
- `ClerkProvider` wrapper en layout raíz de Next.js
- Webhooks con verificación de firma vía `svix` (incluido en `@clerk/nextjs`)
- Eventos suscritos: `user.created`, `user.updated`, `user.deleted`

## Consideraciones de seguridad

- **Verificación de firma de webhooks:** Validar firma `svix` de Clerk antes de procesar eventos (retornar 401 si inválida)
- **No exponer `clerkUserId`:** Solo usar en backend, nunca en respuestas públicas de API
- **Auditoría de cambios de rol:** Registrar en `AdminAuditLog` cuando admin modifica rol de usuario
- **Rate limiting:** Implementar en webhook endpoint para prevenir abuse (futuro)
- **Errores de autorización:** Loggear intentos fallidos de acceso a rutas protegidas (WARN level)
- **Secrets en variables de entorno:** `CLERK_SECRET_KEY` y `CLERK_WEBHOOK_SECRET` solo en Vercel/servidor, nunca en repo

## Logging y observabilidad

**Estrategia de logging estructurado:**

El módulo implementa logging en formato JSON para facilitar parsing y análisis:

1. **Eventos de webhook (INFO):** Registro de eventos procesados exitosamente
2. **Firma inválida (WARN):** Intentos de webhook con firma incorrecta (posible ataque)
3. **Errores de procesamiento (ERROR):** Fallos al sincronizar con base de datos
4. **Eventos duplicados (DEBUG):** Eventos ya procesados (idempotencia)

**Formato:**
```typescript
{
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
  service: 'clerk-webhook' | 'auth-middleware',
  eventType: 'user.created' | 'user.updated' | 'user.deleted',
  clerkUserId: string,
  action: string,
  timestamp: ISO8601
}
```

**MVP:** `console.log` con structured logging
**Futuro:** Integración con Sentry/Datadog

## Testing & QA

### Tipos de pruebas

1. **Unitarias:**
   - Verificación de firma de webhook
   - Lógica de sincronización de usuarios (upsert)
   - Helpers de roles (`requireRole`, `getCurrentUser`)
   - Errores personalizados (`UnauthorizedError`, `ForbiddenError`)

2. **Integración:**
   - Webhook end-to-end con payload de prueba firmado
   - Middleware de autorización en rutas protegidas
   - Clerk test mode con usuarios de prueba

3. **E2E:**
   - Flujo completo: registro → redirect → sesión presente
   - Login → acceso a perfil
   - Intento de acceso a ruta protegida sin sesión → redirect a sign-in

### Casos de prueba relacionados (STP)

- `TC-AUTH-001` a `TC-AUTH-017`: Cobertura completa de autenticación, autorización, webhooks y helpers
- Referencia: `/docs/md/STP-ReparaYa.md` sección 4.1.1

### Criterios de aceptación

- ✅ Cobertura de código ≥ 70% en módulo `src/modules/auth`
- ✅ Todos los casos TC-AUTH-* pasan
- ✅ Webhook verifica firma antes de procesar
- ✅ Middleware no causa overhead > 50ms en P95
- ✅ No hay secrets en código ni commits
