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

**Lee SIEMPRE estos archivos antes de cualquier tarea significativa:**

1. **`openspec/project.md`** - Contexto completo del proyecto (stack, arquitectura, convenciones)
2. **`openspec/README.md`** - Flujo de OpenSpec y testing obligatorio
3. **`docs/md/SRS.md`** - Requisitos funcionales y no funcionales
4. **`docs/md/STP-ReparaYa.md`** - Plan de pruebas y casos de prueba
5. **`docs/md/architecture-overview.md`** - Arquitectura del sistema

## Ramas y Workflow

- **`main`**: Producción (estable para demos)
- **`dev`**: Integración de desarrollo
- **`feature/*`**: Ramas de funcionalidad

**Flujo:**
```bash
dev → feature/nombre-descriptivo → PR → dev → (cuando esté listo) → main
```

---

## 🔴 CRÍTICO: Testing Obligatorio en OpenSpec

### Regla de Oro

**NINGÚN proposal de OpenSpec es válido sin un plan de testing completo.**

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

### Flujo Completo OBLIGATORIO

```
┌─────────────────────────────────────────────────────┐
│ 1. /openspec:proposal                               │
│    → DEBE incluir "Testing Plan" completo          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. Actualizar /docs/md/STP-ReparaYa.md             │
│    → Agregar casos TC-* ANTES de codificar         │
│    → Documentar en sección 4.1.X del STP          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. Implementación (código + tests en paralelo)     │
│    → Escribir código funcional                     │
│    → Escribir tests según plan                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 4. Verificación                                     │
│    → npm run test -- src/modules/XXX               │
│    → npm run test:coverage                         │
│    → Verificar cobertura ≥ 70%                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 5. /openspec:apply                                  │
│    → Solo cuando tests pasen                       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 6. PR y Merge a dev                                 │
│    → CodeRabbit revisa                             │
│    → CI/CD debe pasar                              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 7. /openspec:archive                                │
│    SOLO SI:                                         │
│    ✅ Todos los tests pasan                        │
│    ✅ Cobertura ≥ 70%                              │
│    ✅ STP actualizado con resultados               │
│    ✅ CI/CD en verde                               │
│    ✅ PR mergeado                                  │
└─────────────────────────────────────────────────────┘
```

### ❌ NO Permitido

**NUNCA hagas esto:**

- ❌ Crear proposal sin sección "Testing Plan"
- ❌ Implementar código sin tests
- ❌ Archivar cambio sin que tests pasen
- ❌ Ignorar actualización del STP
- ❌ Aceptar cobertura < 70% en módulos core

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

1. **SIEMPRE lee `openspec/project.md` antes de empezar**
2. **SIEMPRE incluye plan de testing en proposals**
3. **SIEMPRE actualiza STP antes de implementar**
4. **NUNCA archiva sin tests completos**
5. **Cobertura ≥ 70%** es obligatoria en módulos core
6. **Trabaja en rama `dev`**, crea feature branches para cambios
7. **CodeRabbit revisará** todos los PRs automáticamente

---

**Este proyecto tiene un enfoque fuerte en calidad, testing y trazabilidad. No tomes atajos con las pruebas.**
