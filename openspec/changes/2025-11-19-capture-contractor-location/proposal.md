# Proposal: Captura de Ubicación y Zona de Operación de Contratistas

**Fecha:** 2025-11-19
**Estado:** Propuesta
**Autor:** Claude Code
**Módulo:** Contractor Location & Service Zones

---

## Why

ReparaYa necesita capturar la ubicación y zona de operación de los contratistas para habilitar funcionalidades core del marketplace: búsqueda geográfica de servicios, validación de cobertura antes de reservas, y cálculo de logística. Sin esta información, los clientes no pueden encontrar contratistas cercanos ni los contratistas pueden declarar su área de servicio, limitando severamente la usabilidad de la plataforma.

---

## Contexto y Motivación

Actualmente, ReparaYa no captura información estructurada sobre la ubicación física de los contratistas ni sus zonas de operación. Esto limita severamente las funcionalidades clave del marketplace:

- **Búsqueda geográfica:** Los clientes no pueden filtrar contratistas por proximidad
- **Enrutamiento inteligente:** No se pueden calcular tiempos de desplazamiento
- **Transparencia operativa:** Los contratistas no pueden declarar dónde ofrecen servicio
- **Planificación logística:** No hay datos para optimizar asignación de servicios

Este proposal introduce la captura de ubicación del contratista (dirección base de operaciones) y configuración de zona de servicio durante el onboarding, con extensiones para actualización en settings.

---

## Objetivo

Implementar captura de ubicación geográfica y zona de operación para contratistas, con las siguientes capacidades:

1. **Captura de dirección normalizada** durante onboarding/settings (calle, número, colonia, ciudad, estado, CP, país)
2. **Geocodificación server-side** usando AWS Location Service para obtener coordenadas precisas
3. **Configuración de zona de operación** con tipo RADIUS (radio en km desde ubicación base)
4. **Extensibilidad a zonas POLYGON** para declarar polígonos de cobertura personalizados (futuro)
5. **Restricciones de edición** según estado del perfil (DRAFT permite edición, ACTIVE requiere workflow de aprobación)
6. **Control de acceso** basado en ownership y roles (CONTRACTOR owner, ADMIN)

---

## Alcance

### ✅ Incluido en este Cambio

**Backend:**
- Modelo de datos para ubicación y zona de servicio (tabla `ContractorServiceLocation`)
- Cliente AWS Location Service para geocodificación server-side
- Validadores Zod para dirección normalizada y zona
- Service layer con manejo de errores de geocodificación
- Repository layer con ownership checks
- API routes autenticadas (POST/PATCH/GET contractor location)
- Índices de BD en lat/lng/ciudad para búsquedas futuras

**Frontend:**
- Formulario de captura de dirección en onboarding (placeholder UI)
- Configurador de zona de operación (RADIUS con slider para km)
- Edición en settings con bloqueo según estado del perfil
- Mensajes de error claros para fallos de geocodificación

**Testing:**
- Tests unitarios (validadores, service layer con mocks de AWS)
- Tests de integración (API con test DB, autorización)
- Tests E2E (flujo de onboarding completo con Playwright)
- Actualización de STP con casos TC-RF-CTR-LOC-001 a TC-RF-CTR-LOC-015

**Documentación:**
- Spec completo en `openspec/specs/contractor-location/spec.md`
- Actualización de `openspec/project.md` con referencias al módulo
- Casos de prueba en `docs/md/STP-ReparaYa.md`

### Tipo de Zona de Operación - MVP

**RADIUS (Implementado en MVP):**
- Parámetro: `radiusKm` (número entero 1-100)
- Interpretación: Círculo con centro en `(baseLatitude, baseLongitude)` y radio `radiusKm`
- Validación: Radio mínimo 1 km, máximo 100 km
- Uso: Filtrado simple `distance(client, contractor) <= radiusKm`

**POLYGON (Documentado para futuro):**
- Parámetro: `polygonCoordinates` (array de `{lat, lng}`)
- Validación: Mínimo 3 puntos, máximo 50 puntos, polígono cerrado
- Uso: Algoritmo point-in-polygon para verificar cobertura
- **NO implementado en este cambio** - solo estructura extensible

### ❌ Fuera de Alcance (Futuro)

- Búsqueda de contratistas por geolocalización (módulo search)
- Cálculo de rutas/tiempos de desplazamiento (módulo booking)
- Validación de zona antes de aceptar reservas (módulo booking)
- Importación de polígonos desde KML/GeoJSON
- Múltiples ubicaciones por contratista (franquicias)
- Zonas con exclusiones (donut shapes)

---

## Dependencias

### Especificaciones de OpenSpec

- **`openspec/specs/contractors/spec.md`** - Modelo de ContractorProfile, estados de perfil (DRAFT/ACTIVE/SUSPENDED)
- **`openspec/specs/auth/spec.md`** - Roles y guards de autorización
- **`openspec/project.md`** - Stack tecnológico, convenciones de BD

### Infraestructura Existente

- **AWS Location Service:**
  - Place Index: `reparaya-places` (geocoding/reverse geocoding)
  - Route Calculator: `reparaya-routes` (cálculo de distancias - futuro)
  - Variables de entorno YA configuradas:
    - `AWS_REGION`
    - `AWS_ACCESS_KEY_ID`
    - `AWS_SECRET_ACCESS_KEY`
    - `AWS_LOCATION_PLACE_INDEX`
    - `AWS_LOCATION_ROUTE_CALCULATOR`

- **Prisma Schema:**
  - Modelo `ContractorProfile` existente
  - Modelo `Address` existente (referencia para tipos de datos)
  - Pattern de coordenadas: `Decimal @db.Decimal(10,8)` para lat, `Decimal @db.Decimal(11,8)` para lng

### Dependencias de Código

- `@aws-sdk/client-location` (instalación requerida)
- `zod` (validación)
- `@prisma/client` (acceso a datos)
- `@clerk/nextjs` (autenticación)

---

## Riesgos y Mitigaciones

### R1: Fallos de Geocodificación de AWS Location Service

**Riesgo:** El servicio puede fallar (timeout, dirección ambigua, límite de cuota)

**Mitigación:**
- Timeout de 5s en llamadas a AWS SDK
- Retry con exponential backoff (3 intentos)
- Guardar dirección sin coordenadas si falla geocodificación (campo `geocodingStatus: PENDING | SUCCESS | FAILED`)
- Job asíncrono para reintentar geocodificación fallida (fuera de scope, documentar)
- Mensajes claros al usuario: "No pudimos validar la dirección, verifica los datos"

### R2: Costo y Cuotas de AWS Location Service

**Riesgo:** Exceder límites de free tier o costos inesperados

**Mitigación:**
- Geocodificación solo en creación/actualización (no en lecturas)
- Caché de resultados en BD (no re-geocodificar si dirección no cambió)
- CloudWatch alarms para monitoreo de requests (fuera de scope, recomendar)
- Free tier: 50k requests/mes de geocoding - suficiente para MVP

### R3: Precisión de Coordenadas

**Riesgo:** Geocodificación imprecisa en zonas rurales o direcciones incompletas

**Mitigación:**
- Validar que resultado de geocoding tiene `Relevance >= 0.8` (AWS Location Service score)
- Mostrar dirección normalizada devuelta por AWS y pedir confirmación al usuario
- Permitir edición manual de coordenadas por admin (future feature)
- Reverse geocoding para validar coherencia

### R4: Precisión de Timezone

**Riesgo:** Inferir timezone solo por coordenadas puede ser inexacto

**Mitigación:**
- Usar librería `geo-tz` (determinista, basada en shapefiles oficiales)
- Caché de timezone en BD (campo `timezone: String` ej. "America/Mexico_City")
- Validación: timezone debe coincidir con país de la dirección
- Fallback: Usar timezone por ciudad si geo-tz falla

### R5: Privacidad de Ubicación Exacta

**Riesgo:** Exponer dirección exacta del contratista públicamente

**Mitigación:**
- Dirección completa solo visible para: owner (CONTRACTOR), ADMIN
- Clientes ven solo: ciudad, estado, radio de cobertura
- API devuelve campos según rol del solicitante (DTO selectivo)
- No incluir coordenadas exactas en responses públicos (aproximar a 2 decimales)

### R6: Migración de Datos Existentes

**Riesgo:** Contratistas existentes no tienen ubicación

**Mitigación:**
- Campo `ContractorServiceLocation` nullable en fase de transición
- Flujo de "completar perfil" para contratistas sin ubicación
- Block de publicación de servicios si no hay ubicación configurada (future - módulo services)
- Dashboard de admin para identificar perfiles incompletos

---

## Entregables

### 1. Spec de Módulo

**Archivo:** `openspec/specs/contractor-location/spec.md`

**Contenido:**
- Requisitos funcionales (RF-CTR-LOC-001 a RF-CTR-LOC-005)
- Requisitos no funcionales (RNF-CTR-LOC-001 a RNF-CTR-LOC-003)
- Modelo de datos (schema Prisma)
- Reglas de validación (esquemas Zod)
- Consideraciones de seguridad
- Plan de testing completo

### 2. Migración de Base de Datos

**Archivo:** `prisma/migrations/YYYYMMDDHHMMSS_add_contractor_service_location/migration.sql`

**Contenido:**
- Tabla `ContractorServiceLocation` con relación 1:1 a `ContractorProfile`
- Índices en `(baseLatitude, baseLongitude)`, `city`, `state`
- Constraints: `radiusKm` CHECK >= 1 AND <= 100

### 3. Implementación Backend

**Archivos:**
- `src/lib/aws/locationService.ts` - Cliente AWS Location Service (geocoding, reverse geocoding)
- `src/modules/contractors/types/location.ts` - DTOs y tipos
- `src/modules/contractors/validators/location.ts` - Esquemas Zod
- `src/modules/contractors/services/locationService.ts` - Lógica de negocio
- `src/modules/contractors/repositories/locationRepository.ts` - Acceso a datos
- `src/app/api/contractors/[id]/location/route.ts` - API handler

### 4. Implementación Frontend (Placeholder UI)

**Archivos:**
- `src/components/contractors/AddressForm.tsx` - Formulario de dirección
- `src/components/contractors/ServiceZoneConfigurator.tsx` - Configurador de zona
- `src/app/contractors/onboarding/location/page.tsx` - Step de onboarding
- `src/app/contractors/settings/location/page.tsx` - Edición en settings

### 5. Tests

**Archivos:**
- `src/lib/aws/__tests__/locationService.test.ts` - Unit (mocks de AWS SDK)
- `src/modules/contractors/services/__tests__/locationService.test.ts` - Unit
- `src/modules/contractors/validators/__tests__/location.test.ts` - Unit
- `tests/integration/api/contractors/location.test.ts` - Integration (Supertest)
- `tests/e2e/contractors/onboarding-location.spec.ts` - E2E (Playwright)

### 6. Documentación de Testing

**Archivo:** `docs/md/STP-ReparaYa.md`

**Contenido:**
- Sección 4.1.X con casos TC-RF-CTR-LOC-001 a TC-RF-CTR-LOC-015
- Matriz de trazabilidad requisito ↔ caso de prueba
- Escenarios de error (geocoding timeout, dirección ambigua)
- Validaciones de autorización

### 7. Actualización de Project Spec

**Archivo:** `openspec/project.md`

**Contenido:**
- Agregar referencia a módulo contractor-location
- Actualizar diagrama de dependencias de módulos
- Documentar integración con AWS Location Service

---

## Plan de Testing (Resumen)

**Cobertura mínima:** ≥70% en todo el módulo

### Tipos de Pruebas

| Tipo | Herramienta | Objetivo | Criterio de Éxito |
|------|-------------|----------|-------------------|
| Unit | Jest | Validadores, service layer, AWS client wrapper | Cobertura ≥80%, todos los edge cases |
| Integration | Jest + Supertest | API routes, autorización, persistencia | Todos los escenarios de RF pasan |
| E2E | Playwright | Onboarding flow completo | Flujo crítico sin errores |
| Performance | k6 (basic) | Latencia de geocoding | P95 ≤ 1.5s |
| A11y | axe-core | Formulario de dirección WCAG 2.1 AA | 0 violations críticas |

### Test Cases (15 casos documentados en spec)

**Funcionales:**
- TC-RF-CTR-LOC-001: Crear ubicación con dirección válida (geocoding exitoso)
- TC-RF-CTR-LOC-002: Crear ubicación con dirección ambigua (múltiples resultados)
- TC-RF-CTR-LOC-003: Fallo de geocoding (timeout AWS)
- TC-RF-CTR-LOC-004: Actualizar ubicación en estado DRAFT
- TC-RF-CTR-LOC-005: Bloqueo de edición en estado ACTIVE
- TC-RF-CTR-LOC-006: Configurar zona RADIUS válida (10 km)
- TC-RF-CTR-LOC-007: Validación de radio fuera de rango (0 km, 150 km)
- TC-RF-CTR-LOC-008: Autorización - solo owner puede editar
- TC-RF-CTR-LOC-009: Autorización - admin puede ver cualquier ubicación
- TC-RF-CTR-LOC-010: Autorización - cliente no puede ver dirección exacta

**No Funcionales:**
- TC-RNF-CTR-LOC-001: Performance geocoding P95 ≤ 1.5s
- TC-RNF-CTR-LOC-002: Privacy - DTO selectivo según rol
- TC-RNF-CTR-LOC-003: A11y - navegación por teclado en formulario
- TC-RNF-CTR-LOC-004: A11y - labels y ARIA correctos
- TC-RNF-CTR-LOC-005: Resiliencia - retry en fallo de AWS

---

## Criterios de Aceptación (Definition of DONE)

### Código

- ✅ Migración de Prisma aplicada exitosamente en dev y test DBs
- ✅ Cliente AWS Location Service implementado con retry y timeout
- ✅ Service layer con manejo completo de errores
- ✅ API routes con autorización verificada
- ✅ Validadores Zod cubren todos los edge cases
- ✅ UI funcional (aunque sea placeholder) para onboarding y settings

### Testing

- ✅ **Cobertura ≥70%** en módulo `src/modules/contractors/` (location-related files)
- ✅ **15 test cases ejecutados** (TC-RF-CTR-LOC-001 a TC-RF-CTR-LOC-015)
- ✅ **Todos los tests pasan** en CI/CD (GitHub Actions)
- ✅ **Integration tests** validan autorización y persistencia
- ✅ **E2E test** de onboarding completo pasa sin flakiness
- ✅ **A11y tests** sin violations críticas (axe-core)

### Documentación

- ✅ **Spec completo** en `openspec/specs/contractor-location/spec.md`
- ✅ **STP actualizado** con los 15 casos de prueba documentados
- ✅ **openspec/project.md** referencia el nuevo módulo
- ✅ **Comentarios en código** explican decisiones de diseño (especialmente manejo de errores de AWS)

### Infraestructura

- ✅ **Sin nuevas variables de entorno** (usa las existentes de AWS)
- ✅ **Migration reversible** (down migration probada)
- ✅ **Índices de BD** optimizados para queries geográficos futuros
- ✅ **Logs estructurados** para debugging de geocoding

### Seguridad y Privacidad

- ✅ **Ownership checks** en repository layer
- ✅ **DTOs selectivos** según rol (dirección exacta solo para owner/admin)
- ✅ **Validación de input** server-side con Zod
- ✅ **No exposición de credenciales AWS** al cliente

### CI/CD

- ✅ **Pipeline pasa** sin errores
- ✅ **CodeRabbit review** sin blockers críticos
- ✅ **Terraform plan** (si aplica) sin cambios inesperados en infra AWS

---

## Fuera de Scope (Documentar para Futuro)

1. **Búsqueda geográfica de contratistas** - Módulo search independiente
2. **Cálculo de rutas y ETAs** - Integración con AWS Location Service Route Calculator
3. **Zonas tipo POLYGON** - Extensión del modelo, UI de mapa interactivo
4. **Múltiples ubicaciones** - Contratistas con franquicias/sucursales
5. **Job de re-geocoding** - Worker asíncrono para reintentar fallos
6. **Admin dashboard** - Visualización de cobertura en mapa
7. **Validación automática de zona** - Bloquear reservas fuera de cobertura (módulo booking)

---

## Aprobación Requerida

- [ ] Tech Lead: Arquitectura de datos y AWS client
- [ ] Product Owner: Scope de MVP (RADIUS only)
- [ ] QA Lead: Plan de testing suficiente
- [ ] Security: Privacy controls adecuados

---

**Siguiente Paso:** Ejecutar `/openspec:apply` para iniciar implementación según `tasks.md`.
