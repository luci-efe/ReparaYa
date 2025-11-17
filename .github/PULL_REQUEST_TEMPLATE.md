## 📋 Descripción

<!-- Describe brevemente qué cambios incluye este PR y por qué son necesarios -->

## 🔗 Relación con OpenSpec

<!-- Marca la opción que aplique -->

- [ ] Este PR implementa una propuesta OpenSpec: `openspec/changes/[ID]/`
- [ ] Este PR es un fix menor (no requiere OpenSpec)
- [ ] Este PR actualiza documentación solamente

**OpenSpec Change ID (si aplica):**

## 🎯 Tipo de Cambio

<!-- Marca todas las opciones que apliquen -->

- [ ] Nueva funcionalidad (feature)
- [ ] Corrección de bug (fix)
- [ ] Cambio de breaking (breaking change)
- [ ] Cambio de schema de base de datos
- [ ] Cambio de infraestructura (Terraform, AWS)
- [ ] Cambio de CI/CD o DevOps
- [ ] Documentación
- [ ] Refactorización (sin cambios funcionales)
- [ ] Optimización de performance
- [ ] Cambio de seguridad

## 🧪 Testing (OBLIGATORIO)

### Tests Escritos

<!-- Marca todos los tipos de tests que escribiste -->

- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Tests E2E
- [ ] Tests de performance (k6)
- [ ] Tests de seguridad
- [ ] Tests de migración de DB (si aplica)
- [ ] Tests de infraestructura (terraform validate/plan, si aplica)

### Verificación de Tests

- [ ] ✅ Todos los tests pasan (`npm run test`)
- [ ] ✅ Cobertura de código ≥ 70% (`npm run test:coverage`)
- [ ] ✅ Linter sin errores (`npm run lint`)
- [ ] ✅ Type-check sin errores (`npm run type-check`)
- [ ] ✅ Build exitoso (`npm run build`)
- [ ] ✅ CI/CD pasando (todas las checks en verde)

### Casos de Prueba del STP

<!-- Lista los IDs de casos de prueba agregados/actualizados en /docs/md/STP-ReparaYa.md -->

**Casos agregados/actualizados:**
- TC-XXX-YY: [Descripción breve]

- [ ] ✅ STP actualizado con nuevos casos de prueba
- [ ] ✅ STP actualizado con resultados de ejecución

## 📊 Cobertura de Código

<!-- Pega aquí el output de `npm run test:coverage` para los módulos afectados -->

```
Statements   : XX% ( XXX/XXX )
Branches     : XX% ( XXX/XXX )
Functions    : XX% ( XXX/XXX )
Lines        : XX% ( XXX/XXX )
```

## 🔍 Checklist de Calidad

### Código

- [ ] El código sigue las convenciones del proyecto (ver `CONTRIBUTING.md`)
- [ ] Las funciones y variables tienen nombres descriptivos
- [ ] El código está correctamente comentado donde es necesario
- [ ] No hay código comentado sin uso
- [ ] No hay `console.log` o `debugger` olvidados
- [ ] No se usa `any` en TypeScript (usar `unknown` si es necesario)
- [ ] Imports están ordenados correctamente

### Seguridad

- [ ] No hay credenciales hardcodeadas
- [ ] Inputs del usuario están sanitizados
- [ ] Autenticación/autorización implementada correctamente
- [ ] No hay vulnerabilidades de seguridad conocidas (XSS, SQL injection, etc.)
- [ ] Datos sensibles no se logean

### Performance

- [ ] No hay consultas N+1 a la base de datos
- [ ] Las queries están optimizadas
- [ ] Se usan índices apropiados en DB (si aplica)
- [ ] Performance cumple requisitos (P95/P99, si aplica)

### Base de Datos (si aplica)

- [ ] Migración de Prisma creada y testeada
- [ ] Migración incluye rollback (down migration)
- [ ] Seed actualizado si es necesario
- [ ] No hay pérdida de datos

### Infraestructura (si aplica)

- [ ] `terraform validate` pasa
- [ ] `terraform plan` revisado
- [ ] Cambios de infra documentados
- [ ] Smoke tests ejecutados

## 📝 Documentación

- [ ] `openspec/specs/` actualizado (si hay cambios de spec)
- [ ] `/docs/md/STP-ReparaYa.md` actualizado con casos de prueba
- [ ] Comentarios JSDoc agregados a funciones públicas
- [ ] README actualizado (si aplica)
- [ ] CHANGELOG actualizado (si existe)

## 🔄 Compatibilidad

- [ ] Los cambios son backwards compatible
- [ ] Si hay breaking changes, están documentados en el PR
- [ ] Migration path documentado (si aplica)

## 📸 Screenshots (si aplica)

<!-- Si hay cambios visuales, agrega screenshots o GIFs -->

## 🚀 Cómo Probar

<!-- Instrucciones paso a paso para que los reviewers prueben los cambios -->

1.
2.
3.

## 🔗 Issues Relacionados

<!-- Vincula issues de GitHub que este PR cierra o está relacionado -->

Closes #
Related to #

## 📌 Notas Adicionales para Reviewers

<!-- Cualquier contexto adicional que los reviewers deban saber -->

---

## ✅ Pre-Merge Checklist (para reviewer)

- [ ] Code review completo
- [ ] Todos los tests pasan
- [ ] Cobertura ≥ 70%
- [ ] CI/CD en verde
- [ ] STP actualizado
- [ ] No hay conflictos con `dev`
- [ ] Aprobación de al menos 1 revisor humano
- [ ] CodeRabbit aprobó (o issues resueltos)

---

<!--
Para más información sobre el flujo de trabajo, consulta:
- CONTRIBUTING.md
- openspec/README.md
- openspec/AGENTS.md
-->
