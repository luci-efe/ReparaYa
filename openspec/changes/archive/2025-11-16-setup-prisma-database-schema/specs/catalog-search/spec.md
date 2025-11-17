## ADDED Requirements

### Requirement: Database Schema - Category Model

The system SHALL provide a Category model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Unique `slug` field for URL-friendly identification
- Display fields: `name`, `description`, `iconUrl` (optional)
- Self-referential foreign key `parentId` (optional, for hierarchical categories)
- Audit fields: `createdAt`, `updatedAt`
- Relations: `parent` (self-reference), `children` (inverse), `services` (1:N to Service)

#### Scenario: Category hierarchy query
- **WHEN** the frontend requests all service categories
- **THEN** the system SHALL query top-level categories WHERE parentId IS NULL
- **AND** optionally include child categories using Prisma's nested includes
- **AND** the query SHALL complete in <50ms

#### Scenario: Category slug uniqueness
- **WHEN** an admin attempts to create a category with a duplicate slug
- **THEN** Prisma SHALL reject the operation with a unique constraint violation
- **AND** the error SHALL be handled gracefully by the API

#### Scenario: Service count per category
- **WHEN** displaying category list with service counts
- **THEN** the system SHALL use Prisma's `_count` aggregation on the services relation
- **AND** the query SHALL filter by active services only (status = 'ACTIVE')

### Requirement: Database Schema - Service Model

The system SHALL provide a Service model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Foreign keys: `contractorId` (to User), `categoryId` (to Category)
- Display fields: `title`, `description`, `basePrice` (Decimal), `images` (array of S3 URLs)
- Geospatial fields: `locationLat`, `locationLng` (Decimal), `locationAddress` (String), `coverageRadiusKm` (Int)
- Status enum: `status` (ACTIVE, INACTIVE, UNDER_REVIEW)
- Audit fields: `createdAt`, `updatedAt`
- Relations: `contractor` (User), `category`, `availabilities`, `bookings`, `ratings`
- Indexes: `contractorId`, composite `categoryId + status`, composite `locationLat + locationLng`

#### Scenario: Geospatial search by bounding box
- **WHEN** a client searches for services near a location (e.g., "CDMX")
- **AND** the system calculates a bounding box (minLat, maxLat, minLng, maxLng)
- **THEN** the query SHALL filter WHERE locationLat BETWEEN minLat AND maxLat
- **AND** locationLng BETWEEN minLng AND maxLng
- **AND** status = 'ACTIVE'
- **AND** the query SHALL use the composite `locationLat + locationLng` index
- **AND** the query SHALL complete in <500ms for datasets up to 1000 services

#### Scenario: Services by contractor query
- **WHEN** a contractor views their published services
- **THEN** the system SHALL query services WHERE contractorId = userId
- **AND** use the `contractorId` index for performance
- **AND** the query SHALL complete in <50ms

#### Scenario: Services by category and status
- **WHEN** browsing services in a specific category
- **THEN** the system SHALL filter WHERE categoryId = X AND status = 'ACTIVE'
- **AND** use the composite `categoryId + status` index
- **AND** the query SHALL support pagination efficiently

### Requirement: Database Schema - ServiceStatus Enum

The system SHALL define a ServiceStatus enum in Prisma with the following values:
- ACTIVE
- INACTIVE
- UNDER_REVIEW

#### Scenario: New service pending moderation
- **WHEN** a contractor creates a new service
- **THEN** the status SHALL default to UNDER_REVIEW
- **AND** the service SHALL NOT appear in public search results
- **AND** admin SHALL be able to query services WHERE status = 'UNDER_REVIEW'

#### Scenario: Service activation after approval
- **WHEN** an admin approves a service
- **THEN** the status SHALL be updated to ACTIVE
- **AND** the service SHALL immediately become visible in search results

## Testing Plan

### Test Cases

Tests implemented in `apps/web/tests/database/TC-DB-001.test.ts`.

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-DB-001-CategoryHierarchy | Creación y query de categorías jerárquicas con self-reference | Unitaria | Alta | Category Model |
| TC-DB-001-ServiceGeospatial | Búsqueda geoespacial por bounding box usando índices separados | Performance | Alta | Service Model |
| TC-DB-001-ServiceByContractor | Query de servicios por contractor usando índice contractorId | Performance | Alta | Service Model |
| TC-DB-001-ServiceByCategory | Filtrado por categoryId + status usando índice compuesto | Performance | Alta | Service Model |
| TC-DB-001-ServiceStatus | Validación de enum ServiceStatus y visibilidad en búsquedas | Unitaria | Alta | ServiceStatus Enum |

### Criterios de Aceptación

- ✅ Categorías jerárquicas (parentId self-reference) funcionan correctamente
- ✅ Búsqueda geoespacial por bounding box completa en <500ms para 1000+ servicios
- ✅ Índices separados en locationLat y locationLng mejoran performance de BETWEEN queries
- ✅ Servicios UNDER_REVIEW no aparecen en búsquedas públicas
- ✅ Queries usan índices apropiados (verificado con EXPLAIN)
- ✅ Precisión de Decimal para coordenadas (10,8) y precios (12,2)

### Estrategia de Implementación

**Archivos de test:**
- `apps/web/tests/database/TC-DB-001.test.ts` - Tests de infraestructura y schema
- Tests futuros de integración para búsqueda geoespacial

**Optimizaciones de índices:**
- **NOTA**: Reemplazar índice compuesto `@@index([locationLat, locationLng])` con índices separados:
  - `@@index([locationLat])`
  - `@@index([locationLng])`
- Los índices B-tree separados son más eficientes para queries BETWEEN de bounding box
- Considerar PostGIS con índice GiST para escalabilidad futura (>10K servicios)

**Mocks y fixtures:**
- Categorías de prueba con jerarquía (ej: "Reparaciones" > "Plomería")
- Servicios con coordenadas dentro y fuera de bounding box
- Usuarios contractor con diferentes estados de verificación

**Performance:**
- Benchmark de búsqueda geoespacial con 1000 servicios
- Validación de que queries usan índices esperados (EXPLAIN ANALYZE)
