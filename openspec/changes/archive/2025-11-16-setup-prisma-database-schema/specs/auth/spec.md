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
