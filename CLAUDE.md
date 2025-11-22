<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

---

# Instrucciones para Claude Code - ReparaYa

## Contexto del Proyecto

ReparaYa es una plataforma de marketplace para servicios de reparación y mantenimiento del hogar. El proyecto utiliza:

- **Stack**: Next.js 14 + TypeScript + Prisma + PostgreSQL
- **Auth**: Clerk
- **Pagos**: Stripe (Checkout + Connect)
- **Cloud**: Vercel + AWS (S3, SES, Location Service)
- **Testing**: Jest + Playwright + k6
- **Tooling**: OpenSpec + CodeRabbit + GitHub Actions

## Documentación Clave

**🔴 IMPORTANTE - Optimización de Tokens:**

Los archivos grandes de `/docs/md/` (SRS, SPMP, SDD, modelo_datos_reparaya.md) son **documentación baseline congelada**. Su contenido YA está consolidado en `openspec/project.md` y specs de módulos. **NO los leas** durante operaciones normales.

**Archivos que DEBES leer:**

1. **`openspec/project.md`** ⭐ - Fuente única de verdad (stack, arquitectura, convenciones, dominio)
2. **`openspec/README.md`** - Flujo de OpenSpec y testing
3. **`openspec/database-schema.md`** 🗄️ - Esquema completo de la base de datos Supabase (CRÍTICO para trabajo con DB)
4. **`openspec/specs/[modulo]/spec.md`** - Especificación del módulo en el que trabajas

**Archivo que DEBES actualizar según impacto:**

5. **`docs/md/STP-ReparaYa.md`** ⚠️ - Plan de pruebas (actualizar para cambios de alto impacto con casos TC-*)

**❌ NO leas estos archivos (gastan muchos tokens innecesariamente):**

- ❌ `docs/md/1. Especificación de Requerimientos de Software (SRS).md` (17K)
- ❌ `docs/md/2. Plan de Gestión del Proyecto de Software (SPMP).md` (8.8K)
- ❌ `docs/md/3. Software Development Design (SDD).md` (68K)
- ❌ `docs/md/modelo_datos_reparaya.md` (40K)
- ❌ `docs/md/architecture-overview.md` (7.6K)

**Excepción:** Solo léelos si el usuario explícitamente te pide información específica que NO encuentres en `openspec/project.md` o specs de módulos.

## Ramas y Workflow

- **`main`**: Producción (estable para demos)
- **`dev`**: Integración de desarrollo
- **`feature/*`**: Ramas de funcionalidad

**Flujo:**
```bash
dev → feature/nombre-descriptivo → PR → dev → (cuando esté listo) → main
```

---

## Testing en OpenSpec

### Principio

**Todo proposal necesita un plan de testing proporcional al impacto del cambio.**

### Cuando uses `/openspec:proposal`

El proposal DEBE incluir una sección "Testing Plan" con:

#### 1. Casos de Prueba a Agregar al STP

```markdown
## Testing Plan

### Casos de prueba a documentar en STP:

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-RF-XXX-01 | Descripción específica del caso | Unitaria | Alta | RF-XXX |
| TC-RF-XXX-02 | ... | Integración | Alta | RF-XXX |
| TC-RF-XXX-03 | ... | E2E | Media | RF-XXX |
```

**Formato de IDs:**
- `TC-RF-XXX-YY`: Casos para requisitos funcionales
- `TC-RNF-XXX-YY`: Casos para requisitos no funcionales
- `TC-BR-XXX-YY`: Casos para reglas de negocio

#### 2. Criterios de Aceptación

```markdown
### Criterios de aceptación:

- ✅ Cobertura de código ≥ 70% en el módulo
- ✅ Todos los casos de prueba pasan
- ✅ Performance cumple objetivos (si aplica: P95 ≤ X ms)
- ✅ Pruebas de seguridad (autorización por rol, sanitización)
- ✅ CI/CD pasa sin errores
```

#### 3. Estrategia de Implementación de Tests

```markdown
### Estrategia de implementación:

**Archivos de test a crear:**
- `src/modules/XXX/__tests__/service.test.ts`
- `src/modules/XXX/__tests__/repository.test.ts`
- `tests/integration/api/XXX.test.ts`

**Mocks y fixtures:**
- Mock de Clerk para autenticación
- Mock de Stripe en modo test
- Fixtures de datos de prueba

**Integraciones externas:**
- Stripe: Usar test mode con claves de test
- AWS: Usar Localstack o mocks
- Clerk: Usar ambiente de test
```

### Flujo de Testing

```
┌─────────────────────────────────────────────────────┐
│ 1. /openspec:proposal                               │
│    → Incluir "Testing Plan" proporcional           │
│    → Ver niveles de impacto abajo                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. Actualizar /docs/md/STP-ReparaYa.md (si aplica) │
│    → Cambios de alto impacto: Agregar casos TC-*  │
│    → Cambios menores: Documentar solo en proposal │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. Implementación (código + tests necesarios)      │
│    → Escribir código funcional                     │
│    → Escribir tests que den confianza real         │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 4. Verificación                                     │
│    → npm run test (áreas afectadas)               │
│    → CI/CD debe pasar                              │
│    → Cobertura 70%+ en módulos core                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 5. /openspec:apply                                  │
│    → Cuando tests pasen y cambio esté completo     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 6. PR, Revisión y Merge a dev                       │
│    → CodeRabbit revisa                             │
│    → CI/CD debe pasar                              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 7. /openspec:archive                                │
│    → Tests pasen, CI verde, PR mergeado           │
└─────────────────────────────────────────────────────┘
```

### Niveles de Testing por Impacto del Cambio

**Ajusta el nivel de testing al riesgo y complejidad:**

#### 🔴 Alto Impacto (Testing Exhaustivo)
- **Features core** (auth, pagos, reservas)
- **Cambios de schema** que afectan múltiples tablas
- **Cambios críticos de seguridad** (autenticación, autorización, procesamiento de pagos)
- **Breaking changes en APIs**

**Tests Requeridos:**
- Tests unitarios de lógica de negocio
- Tests de integración de APIs
- Tests E2E de flujos críticos
- Tests de migración (up/down) para schema
- Cobertura objetivo: 70%+ en módulos afectados
- **DEBE actualizar STP con casos de prueba formales**

#### 🟡 Impacto Medio (Testing Focalizado)
- **Features no críticos**
- **Adiciones de tabla única** en DB
- **Nuevos endpoints API** (no breaking)
- **Refactorización significativa**

**Tests Requeridos:**
- Tests unitarios de lógica nueva
- Tests de integración de endpoints nuevos
- Tests de regresión para asegurar que nada se rompió
- Cobertura objetivo: 60%+ en áreas afectadas
- **Documentar tests en proposal** (STP opcional)

#### 🟢 Bajo Impacto (Testing Básico)
- **Cambios de configuración** (variables de entorno, constantes)
- **Actualizaciones de documentación**
- **Ajustes de UI** (estilos, textos)
- **Bug fixes menores** (alcance de una función)
- **Validación de infraestructura** (Terraform plan, linting)

**Tests Requeridos:**
- Smoke tests de que el cambio funciona
- Tests existentes deben pasar (sin regresiones)
- Para infra: comandos de validación (terraform validate, terraform plan)
- No requiere actualización formal del STP

### Guía de Testing por Tipo de Cambio

| Tipo de Cambio | Enfoque de Testing |
|----------------|-------------------|
| **Feature core** (auth, payments) | 🔴 Exhaustivo: Unit + Integration + E2E |
| **Feature regular** | 🟡 Focalizado: Unit + Integration |
| **Schema DB** | 🔴 Exhaustivo: Tests de migración + integridad |
| **API endpoint** | 🟡 Focalizado: Integration + auth tests |
| **Infraestructura** (Terraform) | 🟢 Básico: `terraform validate` + `terraform plan` |
| **Cambio de seguridad** | 🔴 Exhaustivo: Security tests + auth tests |
| **Optimización performance** | 🟡 Focalizado: Benchmarks antes/después (k6 si es significativo) |
| **Bug fix** | 🟢-🟡 Básico a Focalizado: Test de regresión del bug |
| **Configuración/docs** | 🟢 Básico: Smoke test, tests existentes pasan |

### ✅ Buenas Prácticas

- **Escribe tests que den confianza real**, no solo números de cobertura
- **Testea happy paths y caminos de error críticos**, omite edge cases exhaustivos salvo que sean críticos
- **Usa patrones de test existentes** del codebase
- **Mockea servicios externos** (Stripe, AWS, Clerk) apropiadamente
- **Mantén tests rápidos** - test suites lentos no se ejecutan

### ❌ NO Hagas Esto

- ❌ Saltar testing en "quick fixes" de módulos core (auth, payments, bookings)
- ❌ Escribir docenas de tests redundantes solo para alcanzar cobertura
- ❌ Archivar cambios con tests fallando
- ❌ Saltar validación de CI/CD
- ❌ Ignorar actualizaciones del STP para cambios de alto impacto

### ✅ Ejemplo de Proposal Correcto

```markdown
# Proposal: Implementar módulo de autenticación

## Objetivo
Implementar el módulo de autenticación según openspec/specs/auth/spec.md

## Tareas
- [ ] Configurar Clerk Provider
- [ ] Implementar webhook handler
- [ ] Crear middleware requireAuth
- [ ] Escribir tests

## Testing Plan

### Casos de prueba a agregar al STP:

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-RF-003-01 | Registro exitoso de usuario | E2E | Alta | RF-003 |
| TC-RF-003-02 | Login con credenciales válidas | E2E | Alta | RF-003 |
| TC-RF-003-03 | Autorización por rol | Integración | Alta | RF-003 |
| TC-RF-003-04 | Webhook procesa user.created | Integración | Alta | RF-003 |

### Criterios de aceptación:
- ✅ Cobertura ≥ 75% en src/modules/auth
- ✅ Todos los casos TC-RF-003-* pasan
- ✅ Middleware bloquea acceso no autorizado
- ✅ Webhook es idempotente

### Estrategia de implementación:

**Archivos de test:**
- `src/modules/auth/__tests__/authService.test.ts`
- `src/modules/auth/__tests__/requireAuth.test.ts`
- `tests/integration/api/webhooks/clerk.test.ts`

**Mocks:**
- Mock de Clerk SDK para verificación de sesiones
- Fixtures de usuarios de prueba

**Ambiente:**
- Clerk test environment con usuarios de prueba
```

---

## Arquitectura y Organización

### Módulos de Dominio

```
src/modules/
├── auth/           # Autenticación (Clerk + roles)
├── users/          # Perfiles de usuarios
├── services/       # Catálogo y búsqueda
├── booking/        # Reservas y estados
├── payments/       # Stripe (anticipos, liquidaciones)
├── messaging/      # Chat en contexto de reserva
├── ratings/        # Calificaciones
└── admin/          # Moderación
```

Cada módulo tiene:
```
module/
├── services/       # Lógica de negocio
├── repositories/   # Acceso a datos (Prisma)
├── types/          # DTOs y tipos
├── validators/     # Validaciones (Zod)
└── __tests__/      # Tests unitarios
```

### Specs de OpenSpec

Cada módulo tiene su spec en `openspec/specs/[modulo]/spec.md` que define:
- Propósito y alcance
- Interfaces y contratos
- Modelo de datos
- Consideraciones de seguridad
- Plan de testing

**Estas specs son contratos.** No las modifiques sin `/openspec:proposal`.

---

## Convenciones de Código

### Naming
- Variables/funciones: `camelCase`
- Componentes/clases: `PascalCase`
- Constantes: `SCREAMING_SNAKE_CASE`
- Archivos de componentes: `PascalCase.tsx`
- Archivos de utilidades: `camelCase.ts`

### TypeScript
- **Strict mode** habilitado
- **NO usar `any`** (usar `unknown` si es necesario)
- Preferir `interface` sobre `type` para objetos
- DTOs con Zod para validación runtime

### Tests
- Archivos: `*.test.ts` o `*.test.tsx`
- Describe blocks descriptivos
- Tests unitarios: mock de dependencias externas
- Tests de integración: uso de test DB y servicios en modo test

### Commits
Conventional Commits:
- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `docs:` documentación
- `test:` agregar/actualizar tests
- `refactor:` refactorización
- `chore:` tareas de mantenimiento

---

## Recordatorios Finales

1. ⭐ **SIEMPRE lee `openspec/project.md` al inicio** - Es tu fuente única de verdad
2. ❌ **NUNCA leas archivos grandes de `/docs/md/`** salvo que el usuario lo pida explícitamente
3. ⚠️ **SIEMPRE actualiza `STP-ReparaYa.md`** antes de implementar cualquier funcionalidad
4. ✅ **SIEMPRE incluye plan de testing completo** en proposals de OpenSpec
5. 🧪 **NUNCA archiva sin tests completos** - Cobertura ≥ 70% es obligatoria
6. 🌿 **Trabaja en rama `dev`**, crea feature branches para cambios
7. 🤖 **CodeRabbit revisará** todos los PRs automáticamente

---

**Este proyecto tiene un enfoque fuerte en calidad, testing y trazabilidad. No tomes atajos con las pruebas ni desperdicies tokens leyendo documentación consolidada.**
