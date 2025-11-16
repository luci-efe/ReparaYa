## ADDED Requirements

### Requirement: Database Schema - ContractorProfile Model

The system SHALL provide a ContractorProfile model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Unique foreign key `userId` linking to User model (1:1 relationship)
- Business fields: `businessName`, `description`, `specialties` (array of category names)
- Verification fields: `verified` (boolean), `verificationDocuments` (JSON with S3 keys)
- Stripe integration: `stripeConnectAccountId` (optional, for payouts)
- Audit fields: `createdAt`, `updatedAt`

#### Scenario: Contractor profile created on role upgrade
- **WHEN** a user with role CLIENT upgrades to CONTRACTOR
- **AND** provides business information and KYC documents
- **THEN** a ContractorProfile record SHALL be created linked to the User
- **AND** the `verified` field SHALL default to false
- **AND** the `verificationDocuments` SHALL store S3 keys as JSON

#### Scenario: Contractor verification query
- **WHEN** the admin reviews pending contractor verifications
- **THEN** the system SHALL query ContractorProfile records WHERE verified = false
- **AND** the query SHALL JOIN with User to get contact information
- **AND** the query SHALL complete in <100ms

#### Scenario: Stripe Connect account linked
- **WHEN** a contractor completes Stripe Connect onboarding
- **AND** receives a Connect account ID from Stripe
- **THEN** the ContractorProfile SHALL be updated with the `stripeConnectAccountId`
- **AND** the contractor SHALL be eligible to receive payouts

### Requirement: Database Schema - Address Model

The system SHALL provide an Address model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Foreign key `userId` linking to User model (N:1 relationship)
- Address fields: `addressLine1`, `addressLine2` (optional), `city`, `state`, `postalCode`, `country`
- Geocoding fields: `lat`, `lng` as Decimal (optional, populated on-demand)
- Default flag: `isDefault` boolean
- Audit fields: `createdAt`, `updatedAt`
- Composite index on `userId + isDefault` for efficient default address lookup

#### Scenario: Client saves default address
- **WHEN** a client creates their first address
- **THEN** the `isDefault` field SHALL be set to true automatically
- **AND** subsequent address queries SHALL use the `userId + isDefault` index

#### Scenario: Multiple addresses per user
- **WHEN** a client creates a second address
- **AND** marks it as default
- **THEN** the previous default address SHALL have `isDefault` updated to false
- **AND** only one address per user SHALL have `isDefault = true` (enforced by application logic)

#### Scenario: Geocoding on demand
- **WHEN** a booking is created using an address
- **AND** the address has NULL `lat` and `lng` values
- **THEN** the system SHALL geocode the address using Amazon Location Service
- **AND** update the Address record with the coordinates
- **AND** future bookings SHALL reuse the cached coordinates

## Testing Plan

### Test Cases

Tests implemented in `apps/web/tests/database/TC-DB-002.test.ts`.

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-DB-002-01 | ContractorProfile creado con arrays (specialties) y JSON (verificationDocuments) | Unitaria | Alta | ContractorProfile Model |
| TC-DB-002-02 | Verificación de tipos TypeScript (Decimal, arrays, JSON) | Unitaria | Alta | ContractorProfile Model |
| TC-DB-002-03 | Address con isDefault garantiza solo una por usuario | Integración | Alta | Address Model |
| TC-DB-002-04 | Concurrencia: múltiples threads intentan setear isDefault simultáneamente | Concurrencia | Media | Address Model |
| TC-DB-002-05 | Geocodificación on-demand con Amazon Location Service (integración) | Integración | Media | Address Model |

### Criterios de Aceptación

- ✅ ContractorProfile almacena arrays de specialties correctamente
- ✅ verificationDocuments (JSON) almacena S3 keys de manera estructurada
- ✅ Stripe Connect accountId se vincula correctamente
- ✅ **CRÍTICO**: Índice parcial único garantiza solo un isDefault=true por userId a nivel DB
- ✅ Tests de concurrencia validan exclusividad de isDefault bajo carga
- ✅ Geocodificación con Amazon Location Service funciona (mock y live)
- ✅ Coordenadas geocodificadas se cachean en Address

### Estrategia de Implementación

**Archivos de test:**
- `apps/web/tests/database/TC-DB-002.test.ts` - Tests de tipos y ContractorProfile/Address
- Tests de integración con Amazon Location Service (pendiente)
- Tests de concurrencia para isDefault (pendiente)

**Migración DB requerida:**
- **IMPORTANTE**: Crear migración SQL custom para índice parcial único:
  ```sql
  CREATE UNIQUE INDEX idx_user_default_address
  ON "Address"("userId")
  WHERE "isDefault" = true;
  ```
- Prisma no soporta índices parciales nativamente en schema.prisma
- Migración debe ejecutarse manualmente después de `prisma migrate dev`

**Mocks y fixtures:**
- Contractor con specialties: ['plomería', 'electricidad']
- verificationDocuments con estructura: `{ ine: 's3://...', comprobante: 's3://...' }`
- Mock de Amazon Location Service SDK para geocodificación
- Fixtures de addresses con y sin coordenadas

**Integraciones externas:**
- Amazon Location Service: SDK configurado con credenciales de test
- Tests con mock para CI/CD
- Tests live opcionales con límite de rate (100 requests/día en dev)
