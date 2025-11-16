# OpenSpec - ReparaYa

## Estructura

```
openspec/
├── project.md          # Contexto global del proyecto (stack, arquitectura, convenciones)
├── specs/              # Especificaciones base por módulo
│   ├── auth/
│   ├── users/
│   ├── catalog-search/
│   ├── services-publishing/
│   ├── booking-checkout/
│   ├── payments-webhooks/
│   ├── reservation-lifecycle-messaging/
│   ├── ratings-reviews/
│   ├── admin-moderation/
│   └── testing-qa/
├── changes/            # Propuestas de cambios (creadas con /openspec:proposal)
└── AGENTS.md           # Instrucciones para agentes IA

```

## Especificaciones Base

Las specs en `openspec/specs/` representan la **especificación inicial** del proyecto ReparaYa, definidas antes del inicio del desarrollo. Estas sirven como:

- Documentación de diseño de alto nivel
- Contratos de interfaces entre módulos
- Referencia para requisitos del SRS
- Base para casos de prueba del STP

## Flujo de Trabajo con OpenSpec

A partir del commit inicial, **todos los cambios** a las especificaciones deben seguir el flujo de OpenSpec:

### 1. Crear Propuesta

Cuando necesites agregar, modificar o eliminar funcionalidad:

```bash
/openspec:proposal
```

Esto crea una propuesta en `openspec/changes/NNN-nombre-cambio/` con:
- `proposal.md` - Descripción del cambio
- `tasks.md` - Tareas de implementación
- Specs actualizadas/nuevas si aplica

**🔴 CRÍTICO:** El proposal debe incluir:
- ✅ Plan de implementación técnico
- ✅ **Plan de testing (OBLIGATORIO - SIN EXCEPCIONES)**
  - Casos de prueba a agregar al STP (IDs: `TC-RF-XXX-YY`, `TC-RNF-XXX-YY`, `TC-BR-XXX-YY`)
  - Tipo de pruebas (unitarias, integración, E2E, performance, seguridad)
  - Criterios de aceptación (cobertura ≥ 70%, performance, seguridad)
  - Estrategia de implementación (archivos de test, mocks, fixtures)

**ESTO APLICA A TODO:** features, cambios de DB, Terraform, DevOps, configuraciones

### 2. Documentar Testing en STP

**ANTES de implementar**, actualizar `docs/md/STP-ReparaYa.md`:

```markdown
# En el proposal.md debe especificarse:

## Testing Plan

### Casos de prueba a agregar al STP:

| ID | Descripción | Tipo | Prioridad |
|----|-------------|------|-----------|
| TC-RF-XXX-YY | ... | Unit | Alta |

### Criterios de aceptación:
- Cobertura ≥ 70% en el módulo
- Todos los casos de prueba pasan
- Performance cumple objetivos (si aplica)
```

Luego actualizar el STP antes de codificar.

### 3. Aplicar Propuesta

Una vez aprobada la propuesta y documentado el testing:

```bash
/openspec:apply
```

Esto:
- Actualiza las specs base en `openspec/specs/`
- Marca tareas como implementadas
- Mantiene trazabilidad del cambio

**Implementación DEBE incluir:**
- ✅ Código funcional
- ✅ Tests según el plan documentado
- ✅ Cobertura ≥ 70%

### 4. Archivar

Cuando el cambio está completamente implementado y **todos los tests pasan**:

```bash
/openspec:archive
```

Esto archiva el cambio y actualiza `openspec/project.md` si es necesario.

**🔴 Criterios OBLIGATORIOS para archivar (Definition of Done):**
- ✅ Código implementado completamente
- ✅ Tests escritos y **TODOS pasando** (0 failures)
- ✅ Cobertura de código ≥ 70% en módulos core
- ✅ STP actualizado con:
  - Todos los casos de prueba documentados
  - Resultados de ejecución registrados
  - Issues encontrados resueltos
- ✅ PR mergeado a dev
- ✅ CI/CD **completamente en verde** (build, linter, tests)
- ✅ Performance cumple objetivos (si aplica: P95/P99)
- ✅ Pruebas de seguridad pasadas (autenticación, autorización, sanitización)

**NO SE PUEDE ARCHIVAR SI ALGUNO DE ESTOS CRITERIOS NO SE CUMPLE**

## Qué Se Debe Testear

**TODO requiere pruebas. Sin excepciones.**

| Tipo de Cambio | Pruebas Requeridas |
|----------------|-------------------|
| Nueva feature | Unit + Integration + E2E |
| Cambio de schema DB | Tests de migración + integridad de datos |
| API endpoint | Integration tests + tests de autenticación |
| Infraestructura (Terraform) | `terraform validate` + `terraform plan` + smoke tests |
| Cambio DevOps (CI/CD) | Validación del pipeline en PR |
| Cambio de seguridad | Security tests + penetration tests |
| Optimización de performance | k6 load tests + benchmarks (P95/P99) |
| Bug fix | Regression test que reproduzca el bug |
| Configuración | Tests de que la config funciona correctamente |

**Ejemplos concretos:**
- **Feature nueva**: auth module → tests unitarios de servicios + integration tests de API + E2E de login flow
- **Schema DB**: nueva tabla `bookings` → tests de migración up/down + tests de constraints + tests de datos
- **Terraform**: nuevo bucket S3 → `terraform validate` + `terraform plan` en CI + smoke test de subir archivo
- **CI/CD**: nuevo step de linting → PR debe ejecutar el nuevo step exitosamente
- **Performance**: optimizar búsqueda → k6 test que valide P95 ≤ 1.2s

## Ejemplos de Uso

### Ejemplo 1: Agregar funcionalidad

```
Usuario: "Necesitamos agregar autenticación de dos factores (2FA)"

/openspec:proposal
→ Crea openspec/changes/002-add-2fa/
→ proposal.md incluye plan de testing
→ Propone cambios a openspec/specs/auth/spec.md

Usuario actualiza STP con casos de prueba:
→ TC-RF-003-05: Activar 2FA
→ TC-RF-003-06: Login con 2FA
→ TC-RF-003-07: Recuperación sin 2FA

Usuario aprueba y comienza implementación...

/openspec:apply
→ Actualiza openspec/specs/auth/spec.md
→ Implementa código + tests

Verifica: Tests pasan, cobertura ≥ 70%

/openspec:archive
→ Archiva el cambio
→ Actualiza STP con resultados
```

### Ejemplo 2: Implementar módulo desde baseline

```
Usuario: "Voy a implementar el módulo de autenticación"

# Crear rama
git checkout -b feature/auth-implementation

/openspec:proposal
→ "Implementar módulo auth según openspec/specs/auth/spec.md"
→ Crea openspec/changes/001-implement-auth/
→ proposal.md con plan de implementación + plan de testing

Usuario actualiza STP con casos TC-RF-003-*

/openspec:apply
→ No actualiza spec (ya existe), solo marca tareas
→ Implementa servicios, repositorios, middlewares
→ Escribe tests según plan

Verifica: npm run test -- src/modules/auth
Cobertura: 75% ✅

/openspec:archive
→ Archiva implementación
→ PR hacia dev
```

## Principios

1. **Las specs son contratos**: Cambios significativos requieren propuesta
2. **Testing primero**: Documentar plan de testing ANTES de implementar
3. **Trazabilidad**: Cada cambio se documenta en `openspec/changes/` y vincula con STP
4. **Incremental**: Cambios pequeños y frecuentes > cambios grandes
5. **Sincronización**: Specs, código y tests deben mantenerse alineados
6. **Definition of Done**: No se archiva hasta que tests pasen y estén documentados

## Relación con Documentación Formal

Las specs de OpenSpec son **documentación técnica viva** que complementa:
- **SRS** (docs/md) - Requisitos de negocio y funcionales (baseline congelada, NO leer)
- **SDD** (docs/md) - Diseño arquitectónico detallado (baseline congelada, NO leer)
- **STP** (`docs/md/STP-ReparaYa.md`) - Plan de pruebas (**DEBE actualizarse**)

**🔴 IMPORTANTE:**
- La información del SRS y SDD ya está consolidada en `openspec/project.md` y specs de módulos
- Los agentes NO deben leer archivos grandes de `/docs/md/` (excepto el STP)
- El STP es el ÚNICO archivo de `/docs/md/` que se actualiza regularmente

**Flujo:**
```
[SRS baseline] → openspec/project.md + specs/* (fuente de verdad) → Código → STP (validación)
```

## Comandos Disponibles

| Comando | Propósito | Cuándo usar |
|---------|-----------|-------------|
| `/openspec:proposal` | Crear propuesta de cambio | Antes de implementar nueva funcionalidad o cambio significativo |
| `/openspec:apply` | Aplicar propuesta aprobada | Después de aprobar propuesta, antes/durante implementación |
| `/openspec:archive` | Archivar cambio completado | Después de implementar, probar y mergear |

## Estado Actual

- **Specs base**: ✅ Completas (10 módulos)
- **Changes**: 🆕 Vacío (próximos cambios irán aquí)
- **project.md**: ✅ Contexto completo del proyecto

---

**Próximo paso**: Comenzar implementación siguiendo las specs. Cualquier cambio a las specs debe hacerse vía `/openspec:proposal`.
