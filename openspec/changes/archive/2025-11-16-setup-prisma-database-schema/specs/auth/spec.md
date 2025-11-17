## ADDED Requirements

### Requirement: Database Schema - User Model

The system SHALL provide a User model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Unique `clerkUserId` field for Clerk integration
- Unique `email` field for user identification
- `role` enum field (CLIENT, CONTRACTOR, ADMIN)
- `status` enum field (ACTIVE, BLOCKED, PENDING_VERIFICATION)
- Profile fields: `firstName`, `lastName`, `phone`, `avatarUrl`
- Audit fields: `createdAt`, `updatedAt`
- Indexes on `clerkUserId`, `email`, and composite `role + status`

#### Scenario: User record created from Clerk webhook
- **WHEN** a `user.created` webhook is received from Clerk
- **AND** the webhook signature is verified
- **THEN** a User record SHALL be created in the database with the Clerk user ID
- **AND** the User role SHALL default to CLIENT
- **AND** the User status SHALL default to ACTIVE

#### Scenario: User lookup by Clerk ID
- **WHEN** an authenticated request is received
- **AND** the Clerk user ID is extracted from the session
- **THEN** the system SHALL retrieve the User record using the `clerkUserId` index
- **AND** the query SHALL complete in <50ms (index performance)

#### Scenario: Role-based authorization query
- **WHEN** an endpoint requires a specific role (e.g., CONTRACTOR)
- **THEN** the system SHALL filter Users by role using the `role + status` composite index
- **AND** the query SHALL only return ACTIVE users by default

### Requirement: Database Schema - UserRole Enum

The system SHALL define a UserRole enum in Prisma with the following values:
- CLIENT
- CONTRACTOR
- ADMIN

#### Scenario: Enum validation on User creation
- **WHEN** a User record is created or updated
- **AND** an invalid role value is provided (e.g., "SUPER_USER")
- **THEN** Prisma SHALL reject the operation with a validation error
- **AND** the error message SHALL indicate the allowed enum values

### Requirement: Database Schema - UserStatus Enum

The system SHALL define a UserStatus enum in Prisma with the following values:
- ACTIVE
- BLOCKED
- PENDING_VERIFICATION

#### Scenario: Admin blocks user
- **WHEN** an admin changes a User status to BLOCKED
- **THEN** the database SHALL accept the value
- **AND** subsequent queries SHALL be able to filter by status using the index

#### Scenario: Contractor pending verification
- **WHEN** a contractor signs up and uploads KYC documents
- **THEN** their status SHALL be set to PENDING_VERIFICATION
- **AND** they SHALL NOT be able to publish services until status becomes ACTIVE

## Testing Plan

### Test Cases

Tests implemented in `apps/web/tests/database/TC-DB-001.test.ts` and `apps/web/tests/database/TC-DB-002.test.ts`.

| ID | Descripción | Tipo | Prioridad | Requisito |
|----|-------------|------|-----------|-----------|
| TC-DB-001-CreateFromClerk | User record creado desde webhook de Clerk con clerkUserId válido | Integración | Alta | User Model |
| TC-DB-001-LookupByClerkId | Búsqueda de User usando índice clerkUserId completa en <50ms | Performance | Alta | User Model |
| TC-DB-001-RoleFilterWithStatus | Filtrado de users por rol + status usando índice compuesto | Unitaria | Alta | User Model |
| TC-DB-001-EnumValidation | Validación de enums UserRole y UserStatus rechaza valores inválidos | Unitaria | Alta | Enums |
| TC-DB-001-IndexPerformance | Verificación de índices únicos (clerkUserId, email) y compuestos (role+status) | Unitaria | Alta | User Model |

### Criterios de Aceptación

- ✅ Todos los enums (UserRole, UserStatus) validados en DB
- ✅ Índices únicos en clerkUserId y email funcionan correctamente
- ✅ Índice compuesto role+status mejora performance de queries
- ✅ Queries con índices completan en <50ms
- ✅ Validación de Prisma rechaza valores inválidos de enums
- ✅ Tests de infraestructura incluyen safety checks contra ejecución en producción

### Estrategia de Implementación

**Archivos de test:**
- `apps/web/tests/database/TC-DB-001.test.ts` - Tests de infraestructura y schema
- `apps/web/tests/database/TC-DB-002.test.ts` - Tests de cliente Prisma y tipos TypeScript

**Mocks y fixtures:**
- Clerk webhook payload con signature verification (mock)
- Usuarios de prueba con diferentes roles y estados

**Validaciones:**
- Verificación de que DATABASE_URL apunta a DB de testing
- Safety check contra ejecución en ambiente de producción
- Cleanup automático de datos de prueba con manejo de errores
