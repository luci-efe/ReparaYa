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

4. **Webhook de sincronización**
   - Endpoint `/api/webhooks/clerk`
   - Sincronizar eventos: `user.created`, `user.updated`, `user.deleted`
   - Crear/actualizar/eliminar usuarios en tabla `users` de Prisma
   - Idempotencia mediante validación de `clerkUserId` único

5. **Utilities de autenticación**
   - Helper para obtener `userId` autenticado en server components
   - Helper para obtener `userId` autenticado en server actions
   - Helper para verificar roles (requireRole)
   - Type guards para sesiones

6. **Documentación**
   - Variables de entorno requeridas
   - Guía de obtención de userId en diferentes contextos
   - Contrato de roles para módulos dependientes

### Out of Scope

- Implementación de UI/UX custom para sign-in/sign-up (se usarán componentes de Clerk)
- Lógica de perfiles (cliente/contratista) - esto pertenece al módulo `users`
- Recuperación de contraseña (manejado por Clerk)
- Autenticación multifactor (feature futura)
- OAuth providers (feature futura)
- Customización avanzada de emails de Clerk

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

- [ ] Tests unitarios de webhook handler (idempotencia, creación, actualización)
- [ ] Tests de integración del endpoint webhook con firma válida/inválida
- [ ] Tests de middleware protegiendo rutas
- [ ] Tests de helpers de autenticación (`getCurrentUser`, `requireRole`)
- [ ] E2E: flujo completo de sign-up → redirect → sesión presente
- [ ] E2E: flujo completo de sign-in → redirect → sesión presente
- [ ] E2E: intento de acceso a ruta protegida sin sesión → redirect a sign-in

## Success Metrics

- **Tasa de registro exitoso**: > 95% de intentos completan el flujo
- **Latencia de verificación de sesión**: P95 < 100ms, P99 < 200ms
- **Sincronización webhook**: 100% de eventos procesados sin duplicados
- **Uptime de autenticación**: 99.9% (dependiente de Clerk SLA)
- **Cobertura de tests**: ≥ 70% en `src/modules/auth`

## Rollout Plan

### Phase 1: Setup y configuración (Día 1)
- Crear cuenta en Clerk
- Configurar aplicación en Clerk dashboard
- Instalar `@clerk/nextjs`
- Configurar variables de entorno

### Phase 2: UI de autenticación (Día 1-2)
- Implementar `/sign-in` y `/sign-up` con componentes de Clerk
- Configurar redirects
- Implementar middleware de protección

### Phase 3: Webhook y sincronización (Día 2-3)
- Implementar endpoint `/api/webhooks/clerk`
- Configurar webhook en Clerk dashboard
- Implementar lógica de sincronización con Prisma
- Tests de idempotencia

### Phase 4: Helpers y utilities (Día 3)
- Implementar `getCurrentUser()`
- Implementar `requireRole()`
- Type guards y validaciones
- Documentación

### Phase 5: Testing completo (Día 4)
- Tests unitarios e integración
- Tests E2E
- Actualizar STP con resultados
- Validación de cobertura

### Phase 6: Deployment y validación (Día 5)
- Deploy a Vercel preview
- Configurar webhooks en ambiente de desarrollo
- Validar flujo completo en ambiente real
- Documentar hallazgos

## Open Questions

1. **¿Queremos permitir OAuth providers (Google, GitHub)?**
   - Recomendación: No en MVP, agregar como feature futura
   - Decisión pendiente del equipo

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

5. **Variables de entorno requeridas antes de implementación**:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
   CLERK_SECRET_KEY=sk_test_xxx
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
   CLERK_WEBHOOK_SECRET=whsec_xxx
   ```

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
