# Tasks: Clerk Authentication Integration

**Change ID:** `2025-11-16-auth-clerk-integration`

## ⚠️ IMPORTANTE: Implementación en 2 Fases

Este módulo se implementa en **2 fases separadas** según las mejores prácticas de Clerk:

### **FASE 1: Autenticación Visual (UI/UX)**
Implementar sign-in/sign-up, middleware y helpers para que usuarios puedan autenticarse visualmente. **NO incluye sincronización con DB todavía**.

**Duración estimada:** 2-3 días
**Tasks:** 1, 2, 3, 4, 6, 7, 10, 11

### **FASE 2: Sincronización con DB (Webhook)**
Una vez que auth visual funciona, implementar webhook para sincronizar usuarios de Clerk con PostgreSQL. **Requiere que Fase 1 esté completamente funcional**.

**Duración estimada:** 1-2 días
**Tasks:** 5, 8, 9, 12

**Justificación técnica:**
- No puedes obtener `CLERK_WEBHOOK_SECRET` sin crear el webhook en Dashboard
- No puedes crear el webhook sin una URL activa
- No tiene sentido tener URL activa sin código que funcione
- El webhook depende de que auth básica esté operativa

---

## Task Breakdown - FASE 1 (Autenticación Visual)

### 1. Setup y Configuración Inicial

**Estimated effort:** 2 horas

- [ ] **1.1** Crear cuenta en Clerk.com y configurar aplicación para desarrollo
  - Crear organization en Clerk
  - Crear aplicación "ReparaYa Development"
  - Obtener Publishable Key y Secret Key
  - Documentar en notion/docs de equipo

- [ ] **1.2** Instalar dependencias de Clerk
  ```bash
  cd apps/web
  npm install @clerk/nextjs
  ```

- [ ] **1.3** Configurar variables de entorno
  - Agregar variables a `.env.local` (local development)
  - Agregar variables a `.env.example` con placeholders
  - Documentar variables en README del módulo auth

- [ ] **1.4** Validar que variables están presentes en startup
  - Crear script de validación en `src/lib/env.ts`
  - Lanzar error claro si faltan variables críticas

**Validation:**
- `npm run dev` inicia sin errores
- Variables de entorno documentadas en `.env.example`

---

### 2. Integración de ClerkProvider

**Estimated effort:** 1 hora

- [ ] **2.1** Envolver aplicación con `ClerkProvider`
  - Modificar `apps/web/app/layout.tsx`
  - Configurar `appearance` básico (colores de ReparaYa)

- [ ] **2.2** Crear layout wrapper para evitar repetición
  - Si es necesario, crear `providers.tsx` component

**Validation:**
- Aplicación arranca sin errores
- No hay warnings de Clerk en consola
- DevTools de Clerk funcionan (si están habilitados)

---

### 3. Implementar Rutas de Autenticación

**Estimated effort:** 2 horas

- [ ] **3.1** Crear página `/sign-in`
  - `apps/web/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
  - Usar componente `<SignIn />` de Clerk
  - Configurar redirects post sign-in

- [ ] **3.2** Crear página `/sign-up`
  - `apps/web/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
  - Usar componente `<SignUp />` de Clerk
  - Configurar redirects post sign-up

- [ ] **3.3** Crear layout para grupo `(auth)`
  - `apps/web/app/(auth)/layout.tsx`
  - Centrar componentes de auth
  - Aplicar estilos básicos consistentes con ReparaYa

**Validation:**
- Usuario puede navegar a `/sign-in` y `/sign-up`
- Componentes de Clerk se renderizan correctamente
- Estilos son consistentes con marca ReparaYa

---

### 4. Implementar Middleware de Protección

**Estimated effort:** 2 horas

- [ ] **4.1** Crear `middleware.ts` en root de `apps/web`
  - Importar `clerkMiddleware` y `createRouteMatcher` de Clerk (v5)
  - Configurar rutas públicas con matcher (landing, auth, static assets)
  - Proteger rutas que NO son públicas con `auth().protect()`

- [ ] **4.2** Definir constantes de rutas
  - Crear `src/lib/routes.ts` con rutas públicas y privadas
  - Usar en middleware para consistencia

- [ ] **4.3** Configurar redirects
  - Usuarios no autenticados → `/sign-in`
  - Usuarios autenticados en `/` → `/dashboard`

**Validation:**
- Acceso a `/dashboard` sin sesión redirige a `/sign-in`
- Sign-in exitoso redirige a `/dashboard`
- Rutas públicas accesibles sin sesión

---

## Task Breakdown - FASE 2 (Sincronización con DB)

### ⚠️ IMPORTANTE: Completar FASE 1 antes de empezar

**Pre-requisitos:**
- ✅ Usuarios pueden registrarse y hacer login visualmente
- ✅ Middleware protege rutas correctamente
- ✅ Helpers de auth (`getCurrentUser`, `requireRole`) funcionan
- ✅ Tests de FASE 1 pasan
- ✅ Aplicación desplegada en Vercel Preview o expuesta con ngrok

**Objetivo de FASE 2:** Sincronizar usuarios de Clerk con PostgreSQL automáticamente

---

### 5. Webhook de Sincronización

**Estimated effort:** 4 horas

- [ ] **5.1** Crear endpoint `/api/webhooks/clerk`
  - `apps/web/app/api/webhooks/clerk/route.ts`
  - Implementar handler POST

- [ ] **5.2** Verificar firma de webhook
  - Usar `svix` library para verificación
  - Validar `CLERK_WEBHOOK_SECRET`
  - Retornar 401 si firma inválida

- [ ] **5.3** Implementar handlers por tipo de evento
  - `user.created`: Crear usuario en tabla `users`
  - `user.updated`: Actualizar email, firstName, lastName
  - `user.deleted`: Soft delete o marcar como inactive (según política)

- [ ] **5.4** Asegurar idempotencia
  - Usar `clerkUserId` como constraint único
  - Manejar duplicados con `upsert` o try/catch
  - Log de eventos ya procesados

- [ ] **5.5** Manejo de errores y retry
  - Try/catch con logs detallados
  - Retornar 500 para que Clerk reintente
  - Retornar 200 si procesamiento exitoso

- [ ] **5.6** Configurar webhook en Clerk Dashboard
  - Agregar endpoint URL (usar ngrok para local testing)
  - Suscribirse a eventos: `user.created`, `user.updated`, `user.deleted`
  - Copiar webhook signing secret a variables de entorno

**Validation:**
- Webhook procesa `user.created` y crea registro en DB
- Webhook es idempotente (múltiples llamadas no duplican)
- Webhook rechaza firmas inválidas
- Logs muestran eventos procesados exitosamente

**Dependencies:**
- Requiere Prisma Client configurado
- Requiere DB accesible

---

### 6. Helpers y Utilities de Autenticación

**Estimated effort:** 3 horas

- [ ] **6.1** Crear `src/modules/auth/utils/getCurrentUser.ts`
  - Obtener `userId` de Clerk session
  - Query a Prisma para obtener `User` completo
  - Retornar `User | null`
  - Cachear resultado si es posible (dentro de request)

- [ ] **6.2** Crear `src/modules/auth/utils/requireAuth.ts`
  - Wrapper de `getCurrentUser()` que lanza error si no hay sesión
  - Error tipo `UnauthorizedError` con status 401

- [ ] **6.3** Crear `src/modules/auth/utils/requireRole.ts`
  - Obtener usuario con `requireAuth()`
  - Validar que `user.role` coincida con rol requerido
  - Lanzar `ForbiddenError` con status 403 si no coincide

- [ ] **6.4** Crear types y guards
  - `src/modules/auth/types.ts`: AuthUser, AuthSession, etc.
  - Type guards para verificar roles

- [ ] **6.5** Crear barrel export
  - `src/modules/auth/index.ts` exportando utils públicos

**Validation:**
- `getCurrentUser()` retorna usuario autenticado en server component
- `requireRole('ADMIN')` lanza error si usuario no es admin
- Types están bien definidos y TypeScript no muestra errores

---

### 7. Tests Unitarios

**Estimated effort:** 4 horas

- [ ] **7.1** Tests de webhook handler
  - `src/modules/auth/__tests__/webhookHandler.test.ts`
  - Test: crear usuario con `user.created`
  - Test: actualizar usuario con `user.updated`
  - Test: idempotencia (mismo evento múltiples veces)
  - Test: firma inválida retorna 401
  - Test: firma válida retorna 200

- [ ] **7.2** Tests de helpers de autenticación
  - `src/modules/auth/__tests__/utils.test.ts`
  - Test: `getCurrentUser()` con sesión válida
  - Test: `getCurrentUser()` sin sesión retorna null
  - Test: `requireAuth()` con sesión válida
  - Test: `requireAuth()` sin sesión lanza error
  - Test: `requireRole('CLIENT')` con usuario CLIENT
  - Test: `requireRole('ADMIN')` con usuario CLIENT lanza error

- [ ] **7.3** Setup de mocks
  - Mock de Clerk `auth()` function
  - Mock de Prisma client
  - Fixtures de usuarios de prueba

**Validation:**
- `npm run test -- src/modules/auth` pasa sin errores
- Cobertura ≥ 70% en módulo auth

**Dependencies:**
- Requiere Jest configurado
- Requiere mocks de Clerk y Prisma

---

### 8. Tests de Integración

**Estimated effort:** 3 horas

- [ ] **8.1** Test de webhook endpoint completo
  - `tests/integration/api/webhooks/clerk.test.ts`
  - Setup: DB de test, limpiar datos
  - Test: POST con firma válida crea usuario
  - Test: POST con firma inválida retorna 401
  - Test: POST duplicado es idempotente
  - Teardown: limpiar datos de test

- [ ] **8.2** Test de middleware de protección
  - `tests/integration/middleware/auth.test.ts`
  - Test: acceso a ruta protegida sin sesión redirige
  - Test: acceso a ruta protegida con sesión permite
  - Test: acceso a ruta pública sin sesión permite

**Validation:**
- `npm run test:integration` pasa sin errores
- Tests usan DB de test (no producción)

**Dependencies:**
- Requiere test database configurado
- Requiere Supertest o similar

---

### 9. Tests End-to-End

**Estimated effort:** 4 horas

- [ ] **9.1** Setup de Playwright con Clerk
  - Configurar test user en Clerk
  - Helper para login programático
  - Helper para logout

- [ ] **9.2** Test: Flujo de sign-up completo
  - `tests/e2e/auth/signup.spec.ts`
  - Navegar a `/sign-up`
  - Llenar formulario con datos de prueba
  - Verificar redirect a `/dashboard`
  - Verificar sesión presente
  - Verificar usuario creado en DB

- [ ] **9.3** Test: Flujo de sign-in completo
  - `tests/e2e/auth/signin.spec.ts`
  - Crear usuario de prueba previamente
  - Navegar a `/sign-in`
  - Llenar credenciales
  - Verificar redirect a `/dashboard`
  - Verificar sesión presente

- [ ] **9.4** Test: Protección de rutas
  - `tests/e2e/auth/protected-routes.spec.ts`
  - Sin sesión, intentar acceder a `/dashboard`
  - Verificar redirect a `/sign-in`
  - Hacer sign-in
  - Verificar acceso a `/dashboard` exitoso

**Validation:**
- `npm run test:e2e -- auth` pasa sin errores
- Tests cubren flujos críticos de autenticación

**Dependencies:**
- Requiere Playwright instalado y configurado
- Requiere ambiente de test con Clerk test environment

---

### 10. Documentación

**Estimated effort:** 2 horas

- [ ] **10.1** Actualizar README del módulo auth
  - `src/modules/auth/README.md`
  - Explicar cómo obtener usuario autenticado
  - Ejemplos de uso de helpers
  - Configuración de variables de entorno

- [ ] **10.2** Actualizar `.env.example`
  - Agregar todas las variables de Clerk con comentarios

- [ ] **10.3** Crear guía de setup en docs
  - `docs/md/guias/setup-clerk.md` (si es necesario)
  - Paso a paso para configurar Clerk en desarrollo
  - Troubleshooting común

**Validation:**
- Nuevo desarrollador puede seguir README y configurar auth
- Variables de entorno están todas documentadas

---

### 11. Actualizar STP con Casos de Prueba

**Estimated effort:** 1 hora

- [ ] **11.1** Agregar sección 4.1.1 en STP: "Autenticación y Autorización"
  - Casos TC-AUTH-001 a TC-AUTH-015 (ver spec para lista completa)
  - Documentar procedimiento de prueba
  - Documentar datos de prueba (usuarios de test)

- [ ] **11.2** Ejecutar casos de prueba y documentar resultados
  - Actualizar columna "Estado" con resultado (PASS/FAIL)
  - Agregar notas si algún caso falla

**Validation:**
- STP incluye todos los casos TC-AUTH-*
- Casos tienen procedimiento claro y reproducible

---

### 12. Deployment y Validación

**Estimated effort:** 2 horas

- [ ] **12.1** Configurar variables de entorno en Vercel
  - Preview environment
  - Production environment (cuando esté listo)

- [ ] **12.2** Deploy a preview
  - Push branch a GitHub
  - Esperar build de Vercel
  - Validar que no hay errores en build

- [ ] **12.3** Configurar webhook en Clerk para ambiente preview
  - Usar URL de Vercel preview
  - Validar que webhook está funcionando

- [ ] **12.4** Smoke test en preview
  - Hacer sign-up de usuario de prueba
  - Verificar usuario creado en DB
  - Hacer sign-in
  - Verificar acceso a rutas protegidas

**Validation:**
- Preview deployment funcional en Vercel
- Webhook procesa eventos correctamente
- Flujo de autenticación funciona end-to-end en ambiente real

---

## Parallelization Opportunities

Las siguientes tareas pueden ejecutarse en paralelo:

- **Stream 1 (Frontend)**: Tasks 2, 3 (UI de auth)
- **Stream 2 (Backend)**: Tasks 4, 5, 6 (middleware, webhook, helpers)
- **Stream 3 (Testing)**: Tasks 7, 8, 9 (pueden iniciarse cuando hay código a testear)
- **Stream 4 (Docs)**: Task 10, 11 (pueden iniciarse cuando funcionalidad está clara)

## Critical Path

1. Setup (Task 1) → **BLOCKER para todo**
2. ClerkProvider (Task 2) → **BLOCKER para rutas de auth**
3. Helpers (Task 6) → **BLOCKER para tests y otros módulos**
4. Webhook (Task 5) → **BLOCKER para sincronización de usuarios**
5. Tests (Tasks 7-9) → **BLOCKER para archive de change**

## Estimated Total Effort

- **Development**: 18 horas
- **Testing**: 11 horas
- **Documentation**: 3 horas
- **Deployment**: 2 horas

**Total**: ~34 horas (aprox. 4-5 días de trabajo para 1 desarrollador)

## Dependencies Between Tasks

```
[1] Setup
 ├─→ [2] ClerkProvider
 │    └─→ [3] Auth Routes
 ├─→ [4] Middleware
 ├─→ [5] Webhook
 │    └─→ [7] Unit Tests
 │         └─→ [8] Integration Tests
 │              └─→ [9] E2E Tests
 └─→ [6] Helpers
      └─→ [7] Unit Tests
           └─→ [10] Documentation
                └─→ [11] STP Update
                     └─→ [12] Deployment
```

## Notes for Implementers

1. **Prioridad**: Implementar en orden para evitar bloqueos
2. **Testing**: No avanzar a siguiente tarea sin tests de la actual
3. **Commits**: Hacer commits granulares por tarea (facilita code review)
4. **Code Review**: Solicitar review temprano en Tasks 3-6 (core logic)
5. **Documentation**: Actualizar inline mientras se codifica (no dejar para el final)
