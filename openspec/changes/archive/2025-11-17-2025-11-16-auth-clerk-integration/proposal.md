# Proposal: Clerk Authentication Integration

**Change ID:** `2025-11-16-auth-clerk-integration`
**Status:** Proposed
**Created:** 2025-11-16
**Owner:** Architecture Team

## Why

ReparaYa requires a robust authentication system to enable user registration, login, and role-based access control across the platform. Without authentication, we cannot implement any user-facing features (booking, payments, messaging, ratings) or differentiate between clients, contractors, and admins.

Clerk provides a production-ready authentication solution that integrates seamlessly with Next.js 14 App Router, eliminating the need to build custom auth infrastructure while maintaining security best practices.

## What Changes

- Install and configure `@clerk/nextjs` SDK in the Next.js application
- Create `/sign-in` and `/sign-up` routes using Clerk's pre-built components
- Implement Next.js middleware to protect private routes and redirect unauthenticated users
- Build `/api/webhooks/clerk` endpoint to synchronize users between Clerk and PostgreSQL database
- Create utility functions (`getCurrentUser`, `requireAuth`, `requireRole`) for server components and actions
- Write comprehensive unit, integration, and E2E tests for all authentication flows
- Update STP with 17 test cases (TC-AUTH-001 through TC-AUTH-017)
- Document environment variables and integration patterns for other modules

## Context

ReparaYa es una plataforma de marketplace que conecta clientes con contratistas de servicios de reparación del hogar. El sistema requiere un flujo de autenticación robusto, seguro y fácil de usar que permita:

1. Registro e inicio de sesión de usuarios (clientes, contratistas y administradores)
2. Gestión de sesiones segura en Next.js App Router
3. Control de acceso por rol (CLIENT, CONTRACTOR, ADMIN)
4. Sincronización entre el sistema de autenticación (Clerk) y la base de datos de aplicación (PostgreSQL vía Prisma)

### Current State

- Aplicación Next.js 14 con App Router en `apps/web`
- Prisma schema con modelo `User` que incluye `clerkUserId` como campo único
- Estructura modular en `apps/web/src/modules/auth` (actualmente vacía)
- Base de datos PostgreSQL en Supabase conectada vía `DATABASE_URL` (pgBouncer)
- Sin sistema de autenticación implementado

### Problem Statement

La plataforma necesita un sistema de autenticación que:

- Sea compatible con Next.js App Router (server components, server actions, middleware)
- Maneje sesiones de forma segura sin exponer tokens en el cliente
- Sincronice automáticamente usuarios de Clerk con la tabla `users` de Prisma
- Permita control de acceso granular por rol en rutas y API endpoints
- Sea fácil de implementar y mantener con mínima configuración custom

### Why Clerk?

Clerk es la solución elegida porque:

1. **Integración nativa con Next.js**: SDK oficial con soporte completo para App Router
2. **UI/UX moderna**: Componentes pre-construidos y personalizables para sign-in/sign-up
3. **Seguridad**: Manejo de sesiones, tokens y renovación automática
4. **Webhooks**: Sincronización bidireccional entre Clerk y nuestra DB
5. **Deployment en Vercel**: Optimizado para el stack de la aplicación
6. **Roles y metadata**: Permite almacenar información custom del usuario

## Scope

### In Scope

1. **Configuración de Clerk SDK en Next.js**
   - Instalación de dependencias (`@clerk/nextjs`)
   - Configuración de `ClerkProvider` en layout root
   - Variables de entorno para API keys

2. **Rutas de autenticación**
   - `/sign-in`: Página de inicio de sesión
   - `/sign-up`: Página de registro
   - Redirects post-autenticación configurables

3. **Middleware de protección**
   - Proteger rutas privadas (dashboard, perfil, reservas, etc.)
   - Excluir rutas públicas (landing, auth routes, estáticos)
   - Redirigir usuarios no autenticados a `/sign-in`

   **Rutas públicas (sin autenticación requerida):**
   - `/` - Landing page pública
   - `/sign-in`, `/sign-up` - Rutas de autenticación
   - `/servicios`, `/servicios/[id]` - Catálogo público (browsing)
   - `/api/webhooks/*` - Webhooks (verificación por firma, no por sesión)
   - `/_next/*`, `/favicon.ico`, `/images/*` - Assets estáticos de Next.js

   **Rutas privadas (requieren autenticación):**
   - `/dashboard` - Dashboard del usuario (redirect por defecto post-auth)
   - `/perfil` - Perfil del usuario
   - `/reservas` - Gestión de reservas
   - `/mensajes` - Mensajería
   - `/calificaciones` - Historial de calificaciones
   - `/admin/*` - Panel administrativo (requiere role ADMIN)
   - `/api/*` - Todas las APIs salvo `/api/webhooks/*`

4. **Webhook de sincronización**
   - Endpoint `/api/webhooks/clerk`
   - Sincronizar eventos: `user.created`, `user.updated`, `user.deleted`
   - Crear/actualizar/eliminar usuarios en tabla `users` de Prisma
   - Idempotencia mediante validación de `clerkUserId` único

   **Campos sincronizados desde Clerk:**
   - `user.created`: Crear usuario con `clerkUserId`, `email`, `firstName`, `lastName`, `avatarUrl`, `role=CLIENT` (default)
   - `user.updated`: Actualizar `email`, `firstName`, `lastName`, `avatarUrl` si cambian en Clerk
   - `user.deleted`: Marcar como `status=BLOCKED` (soft delete, no eliminar registro físicamente)

   **Nota:** El campo `role` NO se sincroniza desde Clerk. Se gestiona exclusivamente en la base de datos de ReparaYa.

5. **Utilities de autenticación**
   - Helper para obtener `userId` autenticado en server components
   - Helper para obtener `userId` autenticado en server actions
   - Helper para verificar roles (requireRole)
   - Type guards para sesiones

6. **Documentación**
   - Variables de entorno requeridas
   - Guía de obtención de userId en diferentes contextos
   - Contrato de roles para módulos dependientes

### Technical Details

#### Middleware Configuration (Clerk v5)

El proyecto usa `clerkMiddleware` (Clerk v5) en lugar de `authMiddleware` (deprecado).

**Configuración esperada en `middleware.ts`:**
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Definir rutas públicas (no requieren autenticación)
const isPublicRoute = createRouteMatcher([
  '/',                          // Landing page
  '/sign-in(.*)',               // Rutas de sign-in
  '/sign-up(.*)',               // Rutas de sign-up
  '/servicios(.*)',             // Catálogo público
  '/api/webhooks(.*)',          // Webhooks (verificación por firma)
]);

export default clerkMiddleware((auth, req) => {
  // Si la ruta NO es pública, protegerla
  if (!isPublicRoute(req)) {
    auth().protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
```

**Ventajas de `clerkMiddleware` sobre `authMiddleware`:**
- ✅ Más flexible (control fino por ruta)
- ✅ Mejor performance (solo protege rutas necesarias)
- ✅ API moderna y más fácil de mantener
- ✅ No deprecado (mantenido activamente por Clerk)

#### Error Handling

El módulo define dos tipos de errores personalizados para escenarios de autorización:

**Tipos de errores:**
- `UnauthorizedError` (HTTP 401): Usuario no tiene sesión válida
- `ForbiddenError` (HTTP 403): Usuario autenticado pero sin permisos suficientes (rol inadecuado)

**Manejo en API Routes:**
```typescript
import { NextResponse } from 'next/server';
import { getCurrentUser, requireRole, UnauthorizedError, ForbiddenError } from '@/modules/auth';

export async function GET() {
  try {
    const user = await requireRole('ADMIN');
    // ... lógica del endpoint
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: 'Insufficient permissions', required: 'ADMIN' },
        { status: 403 }
      );
    }
    // Otros errores
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Auditoría:**
- Intentos fallidos de autorización en endpoints `/admin/*` se registran en tabla `AdminAuditLog`
- Logs de seguridad (WARN level) para análisis de intentos de acceso no autorizado

#### Webhook Logging Strategy

El endpoint de webhook implementa logging estructurado para trazabilidad y debugging:

**Casos a loggear:**

1. **Evento recibido exitosamente:**
   - Level: `INFO`
   - Payload: `{ eventType, clerkUserId, action: 'created|updated|deleted', timestamp }`

2. **Firma inválida (posible ataque):**
   - Level: `WARN`
   - Payload: `{ error: 'Invalid signature', ip, userAgent, timestamp }`
   - Acción: Retornar 401 inmediatamente

3. **Error de procesamiento:**
   - Level: `ERROR`
   - Payload: `{ eventType, clerkUserId, error: error.message, stack: error.stack }`
   - Acción: Retornar 500 para que Clerk reintente

4. **Evento duplicado (idempotencia):**
   - Level: `DEBUG`
   - Payload: `{ eventType, clerkUserId, action: 'skipped_duplicate' }`
   - Acción: Retornar 200 (ya procesado)

**Formato de logs:**
- Structured logging en formato JSON para facilitar parsing
- MVP: `console.log` con objeto JSON estructurado
- Futuro: Integración con servicio de observabilidad (Sentry, Datadog, etc.)

**Ejemplo de log estructurado:**
```typescript
console.log(JSON.stringify({
  level: 'INFO',
  service: 'clerk-webhook',
  eventType: 'user.created',
  clerkUserId: 'user_2xxx',
  action: 'created',
  userId: 'uuid-xxx',
  timestamp: new Date().toISOString(),
}));
```

#### Webhook Idempotency Strategy

Para el MVP, la idempotencia se garantiza mediante:

1. **Constraint único en DB:** `clerkUserId` es `@unique` en modelo `User`
2. **Operación upsert:** Usar `prisma.user.upsert()` para crear o actualizar según `clerkUserId`
3. **No usar tabla `ProcessedWebhookEvent`** para Clerk (suficiente con constraint único)

**Justificación:** A diferencia de Stripe (donde un evento puede tener múltiples acciones), los eventos de Clerk son idempotentes por naturaleza si se usa `upsert` con `clerkUserId` como clave.

**Implementación esperada:**
```typescript
await prisma.user.upsert({
  where: { clerkUserId: clerkUser.id },
  update: {
    email: primaryEmail,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    avatarUrl: clerkUser.imageUrl,
  },
  create: {
    clerkUserId: clerkUser.id,
    email: primaryEmail,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    avatarUrl: clerkUser.imageUrl,
    role: 'CLIENT', // Default
  },
});
```

### Out of Scope

- Implementación de UI/UX custom para sign-in/sign-up (se usarán componentes de Clerk)
- Lógica de perfiles (cliente/contratista) - esto pertenece al módulo `users`
- Recuperación de contraseña (manejado por Clerk)
- Autenticación multifactor (feature futura)
- OAuth providers adicionales (Google/Facebook están habilitados pero testing es manual)
- Customización avanzada de emails de Clerk
- **Tests E2E automatizados con Playwright** (decisión: testing manual es suficiente dado coverage 78.57%)

## Dependencies

### External Services

- **Clerk**: Requiere cuenta en Clerk.com y configuración de aplicación
  - Environment: Development (para pruebas locales y dev)
  - Publishable Key y Secret Key
  - Webhook signing secret

- **Supabase PostgreSQL**: Base de datos ya configurada
  - Tabla `users` ya definida en schema Prisma
  - `DATABASE_URL` y `DIRECT_URL` ya configurados

### Internal Modules

Este módulo será base para:
- `users` (perfiles de cliente y contratista)
- `booking` (autorización para crear/ver reservas)
- `payments` (autorización para pagos)
- `messaging` (autorización para chat)
- `ratings` (autorización para calificar)
- `admin` (control de acceso administrativo)

## Risks and Mitigations

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Rate limiting en webhooks de Clerk | Media | Medio | Implementar idempotencia con tabla `ProcessedWebhookEvent` tipo |
| Desincronización entre Clerk y DB | Baja | Alto | Webhook con retry automático + logs detallados |
| Exposición de secret keys | Baja | Crítico | Variables de entorno en Vercel (no en repo) + validación en startup |
| Cold start delays en verificación de sesión | Media | Bajo | Middleware optimizado + caché de sesión en edge runtime |
| Costos inesperados de Clerk | Baja | Medio | Plan Free (10,000 MAU) suficiente para MVP académico |

## Acceptance Criteria

### Funcionales

- [ ] Usuario puede registrarse con email y contraseña en `/sign-up`
- [ ] Usuario puede iniciar sesión en `/sign-in`
- [ ] Usuario es redirigido a `/dashboard` tras autenticación exitosa
- [ ] Middleware bloquea acceso a rutas protegidas si no hay sesión
- [ ] Webhook `/api/webhooks/clerk` crea registro en `users` cuando usuario se registra
- [ ] Webhook actualiza `email`, `firstName`, `lastName` si usuario modifica su perfil en Clerk
- [ ] Webhook es idempotente (múltiples llamadas del mismo evento no duplican usuarios)
- [ ] Helper `getCurrentUser()` retorna `User` con rol en server components
- [ ] Helper `requireRole(role)` lanza error si usuario no tiene el rol requerido

### No Funcionales

- [ ] Cobertura de tests ≥ 70% en módulo `auth`
- [ ] Todos los casos de prueba TC-AUTH-* pasan (ver STP)
- [ ] Webhook verifica firma de Clerk antes de procesar
- [ ] Variables de entorno documentadas en `.env.example`
- [ ] No hay secrets en código ni en commits
- [ ] Middleware no causa overhead > 50ms en P95
- [ ] Documentación en `/openspec/specs/auth/auth-clerk-integration.md`

### Testing

**Tests Automatizados (Jest):**
- [x] Tests unitarios de helpers (`getCurrentUser`, `requireAuth`, `requireRole`) - 24 tests ✅
- [x] Tests de integración del endpoint webhook con firma válida/inválida - 9 tests ✅
- [x] Cobertura de código 78.57% (supera objetivo de 70%) ✅

**Tests Manuales (Ejecutados antes de merge a dev):**
- [x] E2E: flujo completo de sign-up → redirect → sesión presente (TC-AUTH-001) ✅
- [x] E2E: flujo completo de sign-in → redirect → sesión presente (TC-AUTH-004) ✅
- [x] E2E: intento de acceso a ruta protegida sin sesión → redirect a sign-in (TC-AUTH-008) ✅
- [x] E2E: OAuth flows (Google, Facebook) (TC-AUTH-002, 003, 005, 006) ✅

**Nota:** Tests E2E NO se automatizaron con Playwright. Testing manual es suficiente dado el robusto coverage de tests unitarios/integración (33 tests automatizados, 78.57% coverage).

## Success Metrics

- **Tasa de registro exitoso**: > 95% de intentos completan el flujo
- **Latencia de verificación de sesión**: P95 < 100ms, P99 < 200ms
- **Sincronización webhook**: 100% de eventos procesados sin duplicados
- **Uptime de autenticación**: 99.9% (dependiente de Clerk SLA)
- **Cobertura de tests**: ≥ 70% en `src/modules/auth`

## Rollout Plan

### ⚠️ IMPORTANTE: Implementación en 2 Fases

Según las **mejores prácticas oficiales de Clerk**, este módulo se implementa en 2 fases separadas:

---

### **FASE 1: Autenticación Visual (UI/UX)** - Sprint 1

**Objetivo:** Usuarios pueden registrarse, hacer login y acceder a rutas protegidas visualmente.

**Duración:** 2-3 días

**Pasos:**

#### Day 1: Setup Básico
- Crear cuenta en Clerk y aplicación "ReparaYa Development"
- Obtener **solo 2 API keys**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` y `CLERK_SECRET_KEY`
- Instalar `@clerk/nextjs`
- Configurar variables en `.env.local` (NO configurar `CLERK_WEBHOOK_SECRET` todavía)

#### Day 2: UI y Middleware
- Implementar `ClerkProvider` en `layout.tsx`
- Crear páginas `/sign-in` y `/sign-up` con componentes de Clerk
- Implementar `middleware.ts` con `clerkMiddleware` (v5)
- Configurar rutas públicas/privadas

#### Day 3: Helpers y Testing Inicial
- Implementar `getCurrentUser()` y `requireRole()` helpers
- Tests unitarios de helpers
- Tests E2E de flujos de auth visual
- **Validación:** Usuarios pueden registrarse y acceder a `/dashboard`

**Entregable FASE 1:** Auth funciona visualmente, pero usuarios **NO se guardan en PostgreSQL todavía**.

---

### **FASE 2: Sincronización con DB (Webhook)** - Sprint 2

**Objetivo:** Sincronizar automáticamente usuarios de Clerk con PostgreSQL.

**Pre-requisitos obligatorios:**
- ✅ FASE 1 completamente funcional
- ✅ Tests de FASE 1 pasan
- ✅ App desplegada en Vercel Preview o expuesta con ngrok

**Duración:** 1-2 días

**Pasos:**

#### Day 1: Implementar Webhook
- Crear endpoint `/api/webhooks/clerk` con verificación de firma
- Implementar handlers: `user.created`, `user.updated`, `user.deleted`
- Implementar lógica de `upsert` con Prisma
- Tests unitarios del webhook handler

#### Day 2: Configurar en Clerk y Validar
- Deployar a Vercel Preview (o exponer con ngrok)
- **AHORA SÍ:** Crear webhook en Clerk Dashboard con URL activa
- Obtener `CLERK_WEBHOOK_SECRET` generado por Clerk
- Agregar secret a `.env.local` y Vercel
- Tests de integración del webhook
- **Validación:** Usuarios se sincronizan correctamente con PostgreSQL

**Entregable FASE 2:** Sincronización completa Clerk ↔ PostgreSQL.

---

### Post-Implementation (Día final)
- Actualizar STP con resultados de tests
- Documentar hallazgos y lecciones aprendidas
- Code review y merge a `dev`

## Open Questions

1. **¿Queremos permitir OAuth providers (Google, GitHub)?**
   - **Implementado:** Sí, Google y Facebook OAuth habilitados (TC-AUTH-002, 003, 005, 006 PASS)
   - Los tests manuales confirmaron que ambos providers funcionan correctamente

2. **¿Cómo manejamos el rol inicial del usuario?**
   - Opción A: Usuario elige rol en sign-up (requiere custom sign-up form)
   - Opción B: Todos inician como CLIENT, pueden elevar a CONTRACTOR desde perfil
   - Recomendación: Opción B (más simple para MVP)

3. **¿Necesitamos sincronización bidireccional completa?**
   - Clerk → DB: ✅ Sí (webhook)
   - DB → Clerk: ❓ ¿Necesitamos actualizar metadata en Clerk cuando cambia rol?
   - Recomendación: Solo Clerk → DB en MVP, agregar DB → Clerk si se necesita

## Related Documents

- `/openspec/project.md` - Contexto general del proyecto
- `/openspec/specs/auth/auth-clerk-integration.md` - Especificación técnica detallada
- `/docs/md/STP-ReparaYa.md` - Plan de pruebas (casos TC-AUTH-*)
- `/apps/web/prisma/schema.prisma` - Modelo de datos User
- Clerk Documentation: https://clerk.com/docs/quickstarts/nextjs

## Handoff Notes

### Para implementadores

1. **Obtener userId autenticado**:
   ```typescript
   // En server components
   import { auth } from '@clerk/nextjs';
   const { userId } = auth();

   // En API routes
   import { auth } from '@clerk/nextjs';
   export async function GET(req: Request) {
     const { userId } = auth();
   }
   ```

2. **Obtener usuario completo con rol**:
   ```typescript
   import { getCurrentUser } from '@/modules/auth/utils';
   const user = await getCurrentUser(); // { id, email, role, ... }
   ```

3. **Proteger rutas por rol**:
   ```typescript
   import { requireRole } from '@/modules/auth/utils';
   await requireRole('CONTRACTOR'); // Lanza error si no es contratista
   ```

4. **Contrato de roles**:
   - `CLIENT`: Usuario cliente (default)
   - `CONTRACTOR`: Usuario contratista (puede ofrecer servicios)
   - `ADMIN`: Administrador de plataforma

5. **Variables de entorno requeridas:**

   **Fase 1 - Setup inicial (obtener de Clerk Dashboard → API Keys):**
   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   ```

   **Fase 2 - Rutas custom (opcionales, si no usas /sign-in y /sign-up default):**
   ```bash
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
   ```

   **Fase 3 - Webhook (obtener SOLO cuando crees el webhook en Clerk Dashboard → Webhooks):**
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_xxx
   ```

   **Nota:** Agregar valores reales a `apps/web/.env.local` (NO commitear). El archivo `.env.example` solo tiene placeholders.

6. **Configuración de Clerk Dashboard**:
   - Crear aplicación para "Development"
   - Habilitar email/password authentication
   - Configurar webhook endpoint: `https://<vercel-url>/api/webhooks/clerk`
   - Suscribirse a eventos: `user.created`, `user.updated`, `user.deleted`
   - Copiar webhook signing secret

### Para módulos dependientes

Los módulos `users`, `booking`, `payments`, `messaging`, `ratings` y `admin` deberán:

1. Importar helpers de `@/modules/auth/utils`
2. Usar `getCurrentUser()` en lugar de acceder directamente a sesión
3. Usar `requireRole(role)` para control de acceso
4. Referenciar `users.id` (UUID de Prisma) en sus relaciones, no `clerkUserId`

### Consideraciones de UI/UX

Aunque este proposal no implementa UI custom, el equipo de frontend deberá:

1. Personalizar los componentes de Clerk con colores/tipografía de ReparaYa
2. Agregar selector de rol en flujo de registro (o post-registro)
3. Mantener consistencia visual con el resto de la plataforma
4. Asegurar que la experiencia sea "limpia, elegante y moderna" como se requiere

**Next Step**: Los estilos y customización de Clerk se manejarán vía:
- Variables CSS en `app/globals.css`
- Configuración de appearance en `ClerkProvider`
- Posiblemente componentes wrapper para consistencia
