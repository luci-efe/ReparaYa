# Tasks: Implementación de Ubicación y Zona de Operación de Contratistas

**Change ID:** 2025-11-19-capture-contractor-location
**Spec:** `openspec/specs/contractor-location/spec.md`

---

## Secuencia de Implementación

**Principio:** Database → Validation → Service → Repository → API → UI → Tests

---

## Fase 1: Schema y Migración de Base de Datos

### Task 1.1: Crear modelo Prisma para ContractorServiceLocation

**Archivo:** `prisma/schema.prisma`

- [ ] Definir modelo `ContractorServiceLocation`
  - Relación 1:1 con `ContractorProfile` (campo `contractorProfileId` único)
  - Campos de dirección: `street`, `exteriorNumber`, `interiorNumber`, `neighborhood`, `city`, `state`, `postalCode`, `country`
  - Campos geocodificados: `baseLatitude` (Decimal 10,8), `baseLongitude` (Decimal 11,8), `timezone` (String)
  - Estado de geocoding: `geocodingStatus` (enum: PENDING, SUCCESS, FAILED)
  - Normalización: `normalizedAddress` (String, devuelto por AWS)
  - Zona de operación: `zoneType` (enum: RADIUS, POLYGON), `radiusKm` (Int, nullable), `polygonCoordinates` (Json, nullable)
  - Timestamps: `createdAt`, `updatedAt`

- [ ] Agregar enum `GeocodingStatus` (PENDING, SUCCESS, FAILED)
- [ ] Agregar enum `ServiceZoneType` (RADIUS, POLYGON)
- [ ] Agregar índices:
  - `@@index([baseLatitude, baseLongitude])` para búsquedas geográficas
  - `@@index([city, state])` para filtros administrativos
  - `@@unique([contractorProfileId])` para garantizar 1:1

**Validación:**
```bash
npx prisma format
npx prisma validate
```

### Task 1.2: Generar y aplicar migración

- [ ] Generar migración: `npx prisma migrate dev --name add_contractor_service_location`
- [ ] Revisar SQL generado en `prisma/migrations/`
- [ ] Verificar constraints:
  - CHECK `radiusKm >= 1 AND radiusKm <= 100` (si DB soporta)
  - CHECK `zoneType = 'RADIUS' AND radiusKm IS NOT NULL OR zoneType = 'POLYGON' AND polygonCoordinates IS NOT NULL`
- [ ] Aplicar migración en DB de desarrollo
- [ ] Aplicar migración en DB de test
- [ ] Probar rollback (down migration)

**Validación:**
```bash
npx prisma migrate status
npx prisma db push --accept-data-loss # solo en test DB
```

---

## Fase 2: Cliente AWS Location Service

### Task 2.1: Instalar dependencia AWS SDK

**Comando:**
```bash
npm install @aws-sdk/client-location
npm install -D @types/node
```

- [ ] Actualizar `package.json`
- [ ] Verificar que versión es compatible con Node 18+

### Task 2.2: Implementar wrapper de AWS Location Service

**Archivo:** `src/lib/aws/locationService.ts`

- [ ] Crear cliente LocationClient con configuración desde env vars
  - `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- [ ] Implementar función `geocodeAddress(address: AddressInput): Promise<GeocodingResult>`
  - Usa comando `SearchPlaceIndexForTextCommand`
  - Place Index: `process.env.AWS_LOCATION_PLACE_INDEX`
  - Timeout: 5 segundos
  - Retry: exponential backoff, 3 intentos
  - Validar `Relevance >= 0.8` en resultado
  - Devolver: `{latitude, longitude, normalizedAddress, timezone, relevance}`
- [ ] Implementar función `reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult>`
  - Usa comando `SearchPlaceIndexForPositionCommand`
  - Devolver dirección normalizada
- [ ] Manejo de errores:
  - `ThrottlingException` → retry
  - `ValidationException` → throw custom error "Invalid address format"
  - `TimeoutError` → throw custom error "Geocoding service unavailable"
- [ ] Logging estructurado (Winston/Pino) para debugging

**Tipos:**
```typescript
interface AddressInput {
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  normalizedAddress: string;
  timezone: string;
  relevance: number;
}
```

### Task 2.3: Tests unitarios de AWS client

**Archivo:** `src/lib/aws/__tests__/locationService.test.ts`

- [ ] Mock de `LocationClient` usando `aws-sdk-client-mock`
- [ ] Test: Geocoding exitoso con relevance alta
- [ ] Test: Geocoding con múltiples resultados (elegir el de mayor relevance)
- [ ] Test: Geocoding falla por timeout (mock delay)
- [ ] Test: Retry en ThrottlingException
- [ ] Test: Error en dirección inválida
- [ ] Test: Reverse geocoding exitoso

**Comando:**
```bash
npm run test -- src/lib/aws/__tests__/locationService.test.ts
```

---

## Fase 3: Validación y Tipos

### Task 3.1: Definir tipos TypeScript

**Archivo:** `src/modules/contractors/types/location.ts`

- [ ] DTO `CreateLocationDTO`
- [ ] DTO `UpdateLocationDTO`
- [ ] DTO `LocationResponseDTO` (con campos selectivos según rol)
- [ ] Type `ServiceZoneConfig` (discriminated union por `type: 'RADIUS' | 'POLYGON'`)
- [ ] Enum `GeocodingStatus`, `ServiceZoneType`

### Task 3.2: Implementar validadores Zod

**Archivo:** `src/modules/contractors/validators/location.ts`

- [ ] Schema `addressSchema`:
  - `street`: string min 3, max 200
  - `exteriorNumber`: string min 1, max 20
  - `interiorNumber`: optional string max 20
  - `neighborhood`: optional string max 100
  - `city`: string min 2, max 100
  - `state`: string min 2, max 100
  - `postalCode`: string regex `/^\d{5}$/` (México) o ajustar por país
  - `country`: string enum ['MX', 'US', 'CO', 'PE', 'AR'] (países soportados)
- [ ] Schema `serviceZoneSchema`:
  - Discriminated union por `zoneType`
  - Para RADIUS: `radiusKm` int min 1, max 100
  - Para POLYGON: `polygonCoordinates` array min 3, max 50 puntos, validar cerrado
- [ ] Schema `createLocationSchema` (combina address + serviceZone)
- [ ] Schema `updateLocationSchema` (campos parciales)

**Validación de edge cases:**
- Código postal inválido
- Radio negativo o cero
- Polígono abierto (first point != last point)
- País no soportado

### Task 3.3: Tests de validadores

**Archivo:** `src/modules/contractors/validators/__tests__/location.test.ts`

- [ ] Test: Dirección válida completa pasa
- [ ] Test: Dirección sin interiorNumber pasa
- [ ] Test: Código postal inválido falla
- [ ] Test: Ciudad vacía falla
- [ ] Test: Zona RADIUS con 10km válida
- [ ] Test: Zona RADIUS con 0km inválida
- [ ] Test: Zona RADIUS con 150km inválida
- [ ] Test: Zona POLYGON con 3 puntos válida (futuro)
- [ ] Test: Zona POLYGON abierta inválida (futuro)

---

## Fase 4: Service Layer

### Task 4.1: Implementar LocationService

**Archivo:** `src/modules/contractors/services/locationService.ts`

**Dependencias:** `geocodeAddress` de AWS client, `locationRepository`

- [ ] Función `createLocation(contractorProfileId: string, data: CreateLocationDTO, userId: string)`
  - Validar ownership del perfil (userId debe coincidir con perfil)
  - Validar que perfil existe y está en estado DRAFT
  - Validar que no exista ubicación previa (relación 1:1)
  - Validar input con `createLocationSchema`
  - Llamar a `geocodeAddress()`:
    - Si éxito: guardar con `geocodingStatus: SUCCESS`, lat/lng, timezone
    - Si fallo: guardar con `geocodingStatus: FAILED`, lat/lng = null
  - Guardar zona de operación
  - Devolver LocationResponseDTO

- [ ] Función `updateLocation(contractorProfileId: string, data: UpdateLocationDTO, userId: string)`
  - Validar ownership
  - Validar que perfil está en estado DRAFT (si ACTIVE, solo admin puede editar)
  - Si cambió dirección, re-geocodificar
  - Si cambió zona, validar nuevo schema
  - Actualizar campos

- [ ] Función `getLocation(contractorProfileId: string, requestorUserId: string, requestorRole: Role)`
  - Obtener ubicación de BD
  - Aplicar filtro de privacidad:
    - Si requestor es owner o ADMIN: devolver todo
    - Si requestor es CLIENT: devolver solo ciudad, estado, zona (sin dirección exacta, lat/lng aproximados a 2 decimales)
  - Devolver DTO selectivo

- [ ] Función `retryGeocodingForFailed()` (documentar para job futuro)

**Manejo de errores:**
- `LocationAlreadyExistsError`
- `ProfileNotInDraftStateError`
- `GeocodingFailedError`
- `UnauthorizedError`

### Task 4.2: Tests de LocationService

**Archivo:** `src/modules/contractors/services/__tests__/locationService.test.ts`

- [ ] Mock de `geocodeAddress` (success/failure)
- [ ] Mock de `locationRepository`
- [ ] Test: Crear ubicación exitosa con geocoding
- [ ] Test: Crear ubicación con fallo de geocoding (guarda FAILED)
- [ ] Test: Crear ubicación rechazada si perfil no es DRAFT
- [ ] Test: Crear ubicación rechazada si ya existe
- [ ] Test: Actualizar ubicación en DRAFT exitoso
- [ ] Test: Actualizar ubicación en ACTIVE rechazado (no admin)
- [ ] Test: GetLocation con rol owner devuelve dirección completa
- [ ] Test: GetLocation con rol CLIENT devuelve ciudad/estado solamente
- [ ] Test: Re-geocodificación solo si dirección cambió

**Cobertura esperada:** ≥85%

---

## Fase 5: Repository Layer

### Task 5.1: Implementar LocationRepository

**Archivo:** `src/modules/contractors/repositories/locationRepository.ts`

**Dependencias:** Prisma client

- [ ] Función `create(data: LocationCreateInput): Promise<ContractorServiceLocation>`
  - Insert en tabla con transaction
- [ ] Función `findByContractorProfileId(id: string): Promise<ContractorServiceLocation | null>`
- [ ] Función `update(contractorProfileId: string, data: LocationUpdateInput)`
  - WHERE contractorProfileId = id
- [ ] Función `delete(contractorProfileId: string)` (soft delete o hard)
- [ ] Función `findWithinRadius(centerLat: number, centerLng: number, radiusKm: number)` (futuro - módulo search)
  - Query con Haversine formula o PostGIS extension
  - Devolver contratistas con zona que cubre el punto

**Ownership checks:**
- Todas las mutaciones deben verificar que `userId` coincide con `ContractorProfile.userId`
- Usar Prisma where clauses: `where: { contractorProfileId: id, contractorProfile: { userId } }`

### Task 5.2: Tests de repository (integration)

**Archivo:** `src/modules/contractors/repositories/__tests__/locationRepository.test.ts`

**Setup:** Test database con Prisma, seed de ContractorProfile de prueba

- [ ] Test: Create inserta correctamente
- [ ] Test: FindByContractorProfileId devuelve ubicación
- [ ] Test: Update modifica campos
- [ ] Test: Delete elimina registro
- [ ] Test: Constraint de unique contractorProfileId (debe fallar en duplicate)
- [ ] Test: Index de lat/lng existe (verificar explain query - performance)

**Cleanup:** Rollback de transacciones después de cada test

---

## Fase 6: API Routes

### Task 6.1: Implementar POST /api/contractors/[id]/location

**Archivo:** `src/app/api/contractors/[id]/location/route.ts`

**Handler:** `POST`

- [ ] Extraer `userId` y `role` de Clerk session
- [ ] Verificar autenticación (`requireAuth()`)
- [ ] Parsear body con `createLocationSchema`
- [ ] Llamar a `locationService.createLocation(id, data, userId)`
- [ ] Manejar errores:
  - 400: Validation error (Zod)
  - 403: Unauthorized (not owner)
  - 409: Location already exists
  - 500: Geocoding failed (devolver partial success con mensaje)
- [ ] Response 201 con `LocationResponseDTO`

**Ejemplo de response parcial (geocoding failed):**
```json
{
  "id": "...",
  "address": {...},
  "geocodingStatus": "FAILED",
  "message": "No pudimos validar la dirección automáticamente. Verifica los datos.",
  "coordinates": null
}
```

### Task 6.2: Implementar PATCH /api/contractors/[id]/location

**Handler:** `PATCH`

- [ ] Lógica similar a POST
- [ ] Validar con `updateLocationSchema` (partial)
- [ ] Verificar estado del perfil (DRAFT permite, ACTIVE requiere admin)
- [ ] Response 200 con DTO actualizado

### Task 6.3: Implementar GET /api/contractors/[id]/location

**Handler:** `GET`

- [ ] Extraer `userId` y `role`
- [ ] Permitir acceso:
  - Owner (CONTRACTOR con userId == profile.userId)
  - Admin (role == ADMIN)
  - Clientes (role == CLIENT) - vista limitada
- [ ] Llamar a `locationService.getLocation(id, userId, role)`
- [ ] Response 200 con DTO selectivo según rol

**DTO selectivo:**
```typescript
// Owner/Admin
{
  "address": { "street": "Av. Insurgentes", "exteriorNumber": "123", ... },
  "coordinates": { "latitude": 19.432608, "longitude": -99.133209 },
  "timezone": "America/Mexico_City",
  "serviceZone": { "type": "RADIUS", "radiusKm": 10 }
}

// Client
{
  "city": "Ciudad de México",
  "state": "CDMX",
  "coordinates": { "latitude": 19.43, "longitude": -99.13 }, // aproximado
  "serviceZone": { "type": "RADIUS", "radiusKm": 10 }
}
```

### Task 6.4: Tests de integración de API

**Archivo:** `tests/integration/api/contractors/location.test.ts`

**Setup:** Supertest + test DB + mock de Clerk auth

- [ ] Test: POST crea ubicación exitosa (CONTRACTOR owner)
- [ ] Test: POST rechazado si no es owner (403)
- [ ] Test: POST rechazado si perfil no es DRAFT (400)
- [ ] Test: POST con dirección inválida (400 Zod error)
- [ ] Test: POST con fallo de geocoding (201 con status FAILED)
- [ ] Test: PATCH actualiza zona exitosa
- [ ] Test: PATCH rechazado en perfil ACTIVE (403)
- [ ] Test: GET devuelve dirección completa para owner
- [ ] Test: GET devuelve vista limitada para CLIENT
- [ ] Test: GET rechazado sin autenticación (401)

**Mocks:**
- Clerk: Mock session con roles CONTRACTOR/CLIENT/ADMIN
- AWS Location Service: Mock exitoso y fallido

**Comando:**
```bash
npm run test:integration -- tests/integration/api/contractors/location.test.ts
```

---

## Fase 7: Frontend (Placeholder UI)

### Task 7.1: Componente AddressForm

**Archivo:** `src/components/contractors/AddressForm.tsx`

- [ ] Form con campos controlados (React Hook Form + Zod resolver)
- [ ] Campos: calle, número exterior, número interior, colonia, ciudad, estado, CP, país
- [ ] Validación client-side con `addressSchema`
- [ ] Mensajes de error claros en español
- [ ] Indicador de geocoding en progreso
- [ ] Manejo de error de geocoding: "No pudimos validar la dirección. Verifica los datos."
- [ ] Accesibilidad:
  - Labels asociados con inputs (htmlFor)
  - ARIA labels descriptivos
  - Focus states visibles
  - Navegación por teclado

**Estado:**
```typescript
const [isGeocoding, setIsGeocoding] = useState(false);
const [geocodingError, setGeocodingError] = useState<string | null>(null);
```

### Task 7.2: Componente ServiceZoneConfigurator

**Archivo:** `src/components/contractors/ServiceZoneConfigurator.tsx`

- [ ] Selector de tipo de zona: Radio buttons (RADIUS / POLYGON disabled)
- [ ] Para tipo RADIUS:
  - Slider de 1 a 100 km
  - Input numérico sincronizado
  - Visualización: "Tu zona de servicio cubre un radio de {X} km"
- [ ] Para tipo POLYGON (disabled en MVP):
  - Mensaje: "Disponible próximamente"
- [ ] Validación con `serviceZoneSchema`

### Task 7.3: Página de Onboarding - Step Location

**Archivo:** `src/app/contractors/onboarding/location/page.tsx`

- [ ] Proteger con `requireRole(['CONTRACTOR'])`
- [ ] Layout de step wizard (indicador de progreso)
- [ ] Renderizar `<AddressForm>` y `<ServiceZoneConfigurator>`
- [ ] Submit handler:
  - POST a `/api/contractors/[id]/location`
  - Mostrar loading state
  - Redirect a siguiente step si éxito
  - Mostrar error toast si falla
- [ ] Botón "Guardar y continuar"

### Task 7.4: Página de Settings - Edit Location

**Archivo:** `src/app/contractors/settings/location/page.tsx`

- [ ] Proteger con `requireRole(['CONTRACTOR'])`
- [ ] Fetch ubicación actual: GET `/api/contractors/[id]/location`
- [ ] Pre-populate form con datos existentes
- [ ] Submit handler: PATCH a API
- [ ] Mostrar advertencia si perfil está ACTIVE:
  - "Tu perfil está activo. Los cambios de ubicación requieren revisión de un administrador."
  - Deshabilitar submit si no es admin
- [ ] Botón "Guardar cambios"

### Task 7.5: Tests E2E de onboarding

**Archivo:** `tests/e2e/contractors/onboarding-location.spec.ts`

**Setup:** Playwright con DB de prueba

- [ ] Test: Flujo completo de onboarding - llenar dirección, configurar zona, submit exitoso
- [ ] Test: Error de validación muestra mensaje claro
- [ ] Test: Geocoding fallido muestra advertencia pero permite continuar
- [ ] Test: Navegación por teclado funciona (Tab, Enter)
- [ ] Test: Usuario no autenticado redirige a login

**Comando:**
```bash
npx playwright test tests/e2e/contractors/onboarding-location.spec.ts
```

---

## Fase 8: Testing de Calidad

### Task 8.1: Test de performance de geocoding

**Archivo:** `tests/performance/geocoding.k6.js`

- [ ] Script k6 que llama a POST `/api/contractors/[id]/location` con 10 VUs
- [ ] Métrica: P95 latency
- [ ] Threshold: P95 ≤ 1.5 segundos
- [ ] Incluir casos:
  - Dirección válida (95%)
  - Dirección inválida (5%)

**Comando:**
```bash
k6 run tests/performance/geocoding.k6.js
```

### Task 8.2: Test de accesibilidad

**Archivo:** `tests/a11y/address-form.spec.ts`

- [ ] Usar @axe-core/playwright
- [ ] Escanear página de onboarding location
- [ ] Verificar:
  - Labels correctos
  - Contrast ratios WCAG AA
  - Focus states
  - ARIA attributes
- [ ] Criterio: 0 violations críticas

**Comando:**
```bash
npm run test:a11y -- tests/a11y/address-form.spec.ts
```

### Task 8.3: Reporte de cobertura

- [ ] Ejecutar `npm run test:coverage`
- [ ] Verificar cobertura ≥70% en:
  - `src/lib/aws/locationService.ts`
  - `src/modules/contractors/services/locationService.ts`
  - `src/modules/contractors/validators/location.ts`
  - `src/modules/contractors/repositories/locationRepository.ts`
- [ ] Generar reporte HTML
- [ ] Identificar gaps y agregar tests

---

## Fase 9: Documentación de Testing

### Task 9.1: Actualizar STP-ReparaYa.md

**Archivo:** `docs/md/STP-ReparaYa.md`

- [ ] Agregar nueva sección **4.1.X: Módulo de Ubicación de Contratistas**
- [ ] Documentar casos TC-RF-CTR-LOC-001 a TC-RF-CTR-LOC-015 (ver spec)
- [ ] Tabla con columnas:
  - ID
  - Descripción
  - Tipo (Unitaria/Integración/E2E)
  - Prioridad (Alta/Media/Baja)
  - Requisito relacionado (RF-CTR-LOC-XXX)
  - Estado (Pendiente/Aprobado/Ejecutado)
  - Resultado esperado
  - Resultado obtenido
- [ ] Agregar matriz de trazabilidad Requisito ↔ Caso de Prueba
- [ ] Documentar escenarios de error (geocoding timeout, dirección ambigua)
- [ ] Documentar configuración de mocks (AWS SDK, Clerk)

**Formato de caso de prueba:**
```markdown
#### TC-RF-CTR-LOC-001: Crear ubicación con dirección válida

**Tipo:** Integración
**Prioridad:** Alta
**Requisito:** RF-CTR-LOC-001

**Precondiciones:**
- Usuario autenticado con rol CONTRACTOR
- Perfil de contratista en estado DRAFT
- No existe ubicación previa

**Pasos:**
1. POST /api/contractors/{id}/location con dirección completa
2. AWS Location Service devuelve coordenadas exitosas
3. Guardar ubicación con geocodingStatus=SUCCESS

**Resultado esperado:**
- Response 201
- Ubicación guardada en BD con lat/lng
- Timezone inferido correctamente

**Resultado obtenido:** [Pendiente]
```

### Task 9.2: Actualizar openspec/project.md

**Archivo:** `openspec/project.md`

- [ ] Agregar referencia al módulo `contractor-location`
- [ ] Actualizar sección "Integraciones Externas" con AWS Location Service
- [ ] Documentar env vars requeridas (aunque ya existen)
- [ ] Agregar a diagrama de dependencias de módulos

---

## Fase 10: Code Review y CI/CD

### Task 10.1: Verificar linting y formato

- [ ] `npm run lint` sin errores
- [ ] `npm run format:check` (Prettier)
- [ ] Corregir warnings de ESLint

### Task 10.2: Ejecutar suite completa de tests

- [ ] `npm run test` (unit tests)
- [ ] `npm run test:integration`
- [ ] `npm run test:e2e`
- [ ] `npm run test:coverage` ≥70%
- [ ] Todos los tests pasan sin flakiness

### Task 10.3: Commit y push

- [ ] Crear feature branch: `git checkout -b feature/contractor-location`
- [ ] Commit por fase con mensajes descriptivos:
  - `feat(db): add ContractorServiceLocation schema and migration`
  - `feat(aws): implement Location Service client with retry`
  - `feat(contractors): add location service layer and validators`
  - `feat(api): add contractor location endpoints`
  - `feat(ui): add address form and zone configurator`
  - `test: add comprehensive tests for contractor location`
  - `docs: update STP with contractor location test cases`
- [ ] Push a remote: `git push origin feature/contractor-location`

### Task 10.4: Crear Pull Request

- [ ] Título: `feat: Implement contractor location capture and service zones`
- [ ] Descripción con:
  - Link al proposal y spec
  - Resumen de cambios
  - Screenshots de UI (onboarding, settings)
  - Checklist de testing completado
- [ ] Asignar reviewers
- [ ] Esperar CodeRabbit review
- [ ] Resolver comentarios

### Task 10.5: Verificar CI/CD

- [ ] GitHub Actions pipeline pasa:
  - ✅ Linting
  - ✅ Unit tests
  - ✅ Integration tests
  - ✅ E2E tests
  - ✅ Coverage report
  - ✅ Build sin errores
- [ ] Corregir fallos si los hay

---

## Fase 11: Deployment y Archive

### Task 11.1: Merge a dev

- [ ] Aprobar PR
- [ ] Merge a rama `dev`
- [ ] Verificar deployment a ambiente de desarrollo (Vercel preview)
- [ ] Smoke test manual: crear ubicación de contratista en dev

### Task 11.2: Ejecutar /openspec:archive

**Criterios ANTES de archivar:**
- ✅ Todos los tests pasan
- ✅ Cobertura ≥70%
- ✅ STP actualizado con resultados
- ✅ CI/CD en verde
- ✅ PR mergeado a dev

**Comando:**
```bash
/openspec:archive 2025-11-19-capture-contractor-location
```

- [ ] Mover propuesta a `openspec/changes/archived/`
- [ ] Actualizar specs en `openspec/specs/contractor-location/`
- [ ] Commit de archivo: `chore: archive contractor-location change`

---

## Checklist Final

Antes de considerar el cambio completo:

### Código
- [ ] Migración aplicada en dev y test DBs
- [ ] Cliente AWS con retry implementado
- [ ] Service layer con manejo de errores completo
- [ ] Repository con ownership checks
- [ ] API routes con autorización
- [ ] UI funcional en onboarding y settings

### Testing
- [ ] ≥70% cobertura en módulo
- [ ] 15 test cases ejecutados exitosamente
- [ ] Integration tests pasan
- [ ] E2E test de onboarding pasa
- [ ] A11y test sin violations críticas
- [ ] Performance test P95 ≤ 1.5s

### Documentación
- [ ] Spec completo en `openspec/specs/contractor-location/spec.md`
- [ ] STP actualizado con 15 casos
- [ ] `openspec/project.md` actualizado
- [ ] Comentarios en código explicando decisiones

### DevOps
- [ ] Sin nuevas env vars
- [ ] Migration reversible probada
- [ ] Índices de BD optimizados
- [ ] Logs estructurados
- [ ] CI/CD pasa sin errores

### Seguridad
- [ ] Ownership checks en repository
- [ ] DTOs selectivos por rol
- [ ] Validación server-side con Zod
- [ ] Credenciales AWS no expuestas

---

**Total de subtasks:** ~65 tareas discretas
**Duración estimada:** 2-3 sprints (dependiendo de disponibilidad del equipo)
