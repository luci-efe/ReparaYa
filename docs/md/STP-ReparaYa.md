# Plan de Pruebas del Sistema (STP) - ReparaYa

**Producto:** ReparaYa (marketplace cliente-contratista)
**Versión:** 1.0
**Fecha:** Noviembre 2025
**Estado:** Borrador

## 1. Introducción

### 1.1 Propósito

Este documento define el plan de pruebas para la plataforma ReparaYa, especificando
los objetivos, alcance, estrategia, recursos y casos de prueba necesarios para
validar que el sistema cumple con los requisitos funcionales y no funcionales
definidos en el SRS.

### 1.2 Alcance

El plan cubre:
- Pruebas unitarias de servicios y utilidades
- Pruebas de integración de API y webhooks
- Pruebas end-to-end de flujos críticos
- Pruebas de performance (latencia, throughput)
- Pruebas de seguridad básicas (OWASP Top 10)

### 1.3 Referencias

- `1. Especificación de Requerimientos de Software (SRS).md`
- `3. Software Development Design (SDD).md`
- `/openspec/project.md`
- `/openspec/specs/*/spec.md`

## 2. Objetivos de las pruebas

1. Verificar que todos los RF de prioridad alta están implementados correctamente
2. Validar cumplimiento de requisitos de performance (P95/P99)
3. Asegurar cobertura de código ≥ 70% en módulos core
4. Identificar vulnerabilidades de seguridad críticas
5. Validar integraciones con servicios externos (Clerk, Stripe, AWS)

## 3. Estrategia de pruebas

### 3.1 Tipos de pruebas

#### 3.1.1 Unitarias

- **Framework**: Jest + ts-jest
- **Cobertura objetivo**: ≥ 70%
- **Áreas**:
  - Servicios de dominio (auth, users, services, booking, payments, messaging, ratings, admin)
  - Utilidades (validaciones, cálculos)
  - Lógica de negocio (comisiones, estados, políticas)

#### 3.1.2 Integración

- **Framework**: Jest + Supertest
- **Áreas**:
  - Endpoints HTTP con autenticación
  - Webhooks (Clerk, Stripe)
  - Integración con Stripe Test Mode
  - Integración con AWS (mocks o recursos dev)

#### 3.1.3 End-to-End

- **Framework**: Playwright (a confirmar)
- **Flujos críticos**:
  - Cliente: búsqueda → detalle → reserva → pago → calificación
  - Contratista: publicar servicio → gestionar reserva → recibir pago
  - Admin: moderar contenido → resolver disputa

#### 3.1.4 Performance

- **Framework**: k6
- **Métricas objetivo**:
  - Búsqueda: P95 ≤ 1.2s, P99 ≤ 2.0s
  - Checkout: P95 ≤ 1.5s, P99 ≤ 2.5s
  - Webhooks: P95 ≤ 0.8s, P99 ≤ 1.2s
- **Dataset**: 300+ servicios, 200+ usuarios, 200+ reservas
- **Carga**: 10 RPS sostenidos, ráfagas de 30 RPS

#### 3.1.5 Seguridad

- Validación de autorización por rol
- Sanitización de inputs (XSS, SQL injection)
- Rate limiting
- Verificación de firmas de webhooks

### 3.2 Ambientes de prueba

| Ambiente | Descripción | Servicios |
|----------|-------------|-----------|
| Local | Desarrollo individual | Docker Compose (Postgres, Localstack) |
| Dev | Integración continua | Vercel Preview + Neon DB + AWS dev |
| Staging | Pre-producción | Vercel + Neon DB + AWS staging |

### 3.3 Datos de prueba

- Scripts de seed en `/prisma/seeds/`
- 300 servicios con 1-3 fotos
- 200 usuarios (mix clientes/contratistas/admins)
- 200 reservas históricas en diversos estados

## 4. Especificación de casos de prueba

### Formato de ID de caso de prueba

`TC-[RF|RNF|BR]-XXX-YY`

Donde:
- `RF`: Requisito Funcional
- `RNF`: Requisito No Funcional
- `BR`: Business Rule (Regla de Negocio)
- `XXX`: Número del requisito (ej: 001 para RF-001)
- `YY`: Número secuencial del caso (01, 02, ...)

### 4.1 Casos de prueba por módulo

#### 4.1.1 Autenticación (Auth)

| ID | Descripción | Requisito | Prioridad | Estado |
|----|-------------|-----------|-----------|--------|
| TC-RF-003-01 | Registro exitoso de usuario | RF-003 | Alta | Pendiente |
| TC-RF-003-02 | Login con credenciales válidas | RF-003 | Alta | Pendiente |
| TC-RF-003-03 | Autorización por rol (cliente accede a ruta de cliente) | RF-003 | Alta | Pendiente |
| TC-RF-003-04 | Webhook de Clerk procesa correctamente user.created | RF-003 | Alta | Pendiente |

#### 4.1.2 Búsqueda de servicios (Catalog)

| ID | Descripción | Requisito | Prioridad | Estado |
|----|-------------|-----------|-----------|--------|
| TC-RF-001-01 | Búsqueda por ubicación retorna resultados relevantes | RF-001 | Alta | Pendiente |
| TC-RF-001-02 | Filtrado por categoría funciona correctamente | RF-001 | Alta | Pendiente |
| TC-RF-001-03 | Performance: P95 ≤ 1.2s con 10 RPS | RNF-3.5.1 | Alta | Pendiente |
| TC-RF-002-01 | Visualización de detalle de servicio | RF-002 | Media | Pendiente |

#### 4.1.3 Reservas y Checkout (Booking)

| ID | Descripción | Requisito | Prioridad | Estado |
|----|-------------|-----------|-----------|--------|
| TC-RF-005-01 | Creación de reserva y redirección a checkout | RF-005 | Alta | Pendiente |
| TC-RF-005-02 | Validación de disponibilidad (no duplicar reserva) | RF-005 | Alta | Pendiente |
| TC-RF-006-01 | Transiciones válidas de estado | RF-006 | Alta | Pendiente |
| TC-RF-006-02 | Rechazo de transiciones inválidas | RF-006 | Alta | Pendiente |

#### 4.1.4 Pagos y Webhooks (Payments)

| ID | Descripción | Requisito | Prioridad | Estado |
|----|-------------|-----------|-----------|--------|
| TC-RF-007-01 | Webhook payment_intent.succeeded actualiza reserva | RF-007 | Alta | Pendiente |
| TC-RF-007-02 | Idempotencia en webhooks (mismo evento 2 veces) | RF-007 | Alta | Pendiente |
| TC-RF-010-01 | Liquidación correcta según comisiones (BR-002) | RF-010 | Alta | Pendiente |
| TC-BR-002-01 | Cálculo de comisiones (Ic = B - C%) | BR-002 | Alta | Pendiente |

#### 4.1.5 Mensajería (Messaging)

| ID | Descripción | Requisito | Prioridad | Estado |
|----|-------------|-----------|-----------|--------|
| TC-RF-008-01 | Envío de mensaje exitoso | RF-008 | Media | Pendiente |
| TC-RF-008-02 | Sanitización anti-XSS en mensajes | RF-008 | Alta | Pendiente |
| TC-RF-008-03 | Retención de mensajes (7 días post-cierre) | RF-008 | Media | Pendiente |

#### 4.1.6 Calificaciones (Ratings)

| ID | Descripción | Requisito | Prioridad | Estado |
|----|-------------|-----------|-----------|--------|
| TC-RF-009-01 | Creación de calificación válida | RF-009 | Media | Pendiente |
| TC-RF-009-02 | Rechazo de calificación duplicada | RF-009 | Media | Pendiente |
| TC-RF-009-03 | Cálculo correcto de promedio | RF-009 | Media | Pendiente |

#### 4.1.7 Administración (Admin)

| ID | Descripción | Requisito | Prioridad | Estado |
|----|-------------|-----------|-----------|--------|
| TC-RF-011-01 | Aprobación de servicio por admin | RF-011 | Media | Pendiente |
| TC-RF-011-02 | Bloqueo de usuario | RF-011 | Media | Pendiente |
| TC-BR-005-01 | Resolución de disputa | BR-005 | Media | Pendiente |

### 4.2 Casos de prueba End-to-End

| ID | Descripción | Flujo | Prioridad | Estado |
|----|-------------|-------|-----------|--------|
| TC-E2E-01 | Flujo completo cliente: búsqueda → reserva → pago → calificación | Happy path cliente | Alta | Pendiente |
| TC-E2E-02 | Flujo completo contratista: publicar servicio → recibir reserva → completar → recibir pago | Happy path contratista | Alta | Pendiente |
| TC-E2E-03 | Flujo de cancelación con reembolso | Cancelación | Media | Pendiente |
| TC-E2E-04 | Flujo de disputa y resolución admin | Disputa | Media | Pendiente |

## 5. Procedimientos de prueba

### 5.1 Preparación

1. Verificar que el ambiente de pruebas esté disponible
2. Ejecutar scripts de seed para poblar datos de prueba
3. Verificar conectividad con servicios externos (Clerk test, Stripe test, AWS dev)

### 5.2 Ejecución

#### Unitarias e integración
```bash
cd apps/web
npm run test              # Todas las pruebas
npm run test:coverage     # Con reporte de cobertura
```

#### E2E
```bash
cd apps/web
npx playwright test
```

#### Performance
```bash
k6 run tests/performance/search.js
```

### 5.3 Registro

- Logs en `/test-results/`
- Cobertura en `/coverage/`
- Reportes de Playwright en `/playwright-report/`
- Resultados k6 exportados a JSON

## 6. Criterios de entrada y salida

### 6.1 Criterios de entrada

- Código implementado y en rama `dev`
- Pull request creado
- Build exitoso en CI/CD
- Linter sin errores

### 6.2 Criterios de salida (Definition of Done)

- Cobertura ≥ 70% en módulos core
- Todos los tests pasan
- Performance cumple objetivos P95/P99
- Sin vulnerabilidades críticas detectadas
- PR aprobado por CodeRabbit y al menos un revisor humano

## 7. Recursos

### 7.1 Herramientas

- Jest (unitarias e integración)
- Playwright (E2E)
- k6 (performance)
- Docker Compose (ambiente local)
- GitHub Actions (CI/CD)

### 7.2 Equipo

- Desarrolladores: escriben tests unitarios e integración
- QA: diseña y ejecuta tests E2E y performance
- DevOps: configura CI/CD y ambientes de prueba

## 8. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Servicios externos no disponibles en test | Media | Alto | Usar mocks y test mode |
| Dataset de prueba insuficiente | Baja | Medio | Scripts de seed automatizados |
| Tests E2E frágiles | Alta | Medio | Usar selectores estables, retry logic |
| Performance degradada en CI | Media | Alto | Ejecutar tests de performance en ambiente dedicado |

## 9. Registro de pruebas

### 9.1 Template de registro

```markdown
## Ejecución de pruebas - [Fecha]

**Build**: [ID de build/commit]
**Ambiente**: [Local/Dev/Staging]
**Ejecutado por**: [Nombre]

### Resultados

- Tests unitarios: X/Y passed
- Tests integración: X/Y passed
- Tests E2E: X/Y passed
- Cobertura: X%

### Issues encontrados

- [Issue ID] - [Descripción]

### Notas adicionales

...
```

## 10. Informe de pruebas

(Se completará al finalizar cada ciclo de testing)

---

## Apéndices

### A. Referencias a especificaciones

- `/openspec/specs/auth/spec.md`
- `/openspec/specs/catalog-search/spec.md`
- `/openspec/specs/booking-checkout/spec.md`
- `/openspec/specs/payments-webhooks/spec.md`
- Y demás specs por módulo

### B. Scripts de utilidad

```bash
# Seed de datos de prueba
npm run prisma:seed

# Ejecutar solo tests de un módulo
npm run test -- src/modules/auth

# Ejecutar tests con watch mode
npm run test:watch
```
