## ADDED Requirements

### Requirement: Database Schema - Dispute Model

The system SHALL provide a Dispute model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Unique foreign key `bookingId` linking to Booking (1:1, one dispute per booking)
- Foreign keys: `openedBy` (to User), `resolvedBy` (to User, optional)
- Dispute fields: `reason` (Text), `evidence` (Json with S3 URLs)
- Status enum: `status` (OPEN, RESOLVED_REFUND_CLIENT, RESOLVED_PAYOUT_CONTRACTOR, RESOLVED_PARTIAL)
- Resolution fields: `resolution` (optional Text), `resolutionNotes` (optional Text)
- Timestamps: `createdAt`, `resolvedAt` (optional DateTime)
- Relations: `booking`, `openedByUser`, `resolvedByUser`
- Indexes: composite `status + createdAt`, `bookingId`

#### Scenario: Dispute opened by client
- **WHEN** a client or contractor opens a dispute for a booking
- **THEN** a Dispute record SHALL be created with status OPEN
- **AND** `openedBy` SHALL reference the user who opened it
- **AND** `reason` SHALL contain the dispute explanation
- **AND** `evidence` SHALL store S3 keys of uploaded files (screenshots, photos, etc.)
- **AND** the Booking status SHALL transition to DISPUTED
- **AND** `resolvedBy` and `resolvedAt` SHALL be NULL

#### Scenario: Dispute uniqueness per booking
- **WHEN** a user attempts to open a second dispute for the same booking
- **THEN** Prisma SHALL reject the operation with a unique constraint violation on bookingId
- **AND** the API SHALL return a 409 Conflict error
- **AND** inform the user a dispute is already open

#### Scenario: Admin queries open disputes
- **WHEN** an admin views the dispute queue
- **THEN** the system SHALL query WHERE status = 'OPEN'
- **AND** ORDER BY createdAt ASC (oldest first)
- **AND** use the composite `status + createdAt` index
- **AND** include booking details via JOIN
- **AND** the query SHALL complete in <100ms

#### Scenario: Admin resolves dispute with refund
- **WHEN** an admin resolves a dispute in favor of the client
- **THEN** the status SHALL be updated to RESOLVED_REFUND_CLIENT
- **AND** `resolvedBy` SHALL reference the admin user
- **AND** `resolvedAt` SHALL be set to current timestamp
- **AND** `resolution` and `resolutionNotes` SHALL document the decision
- **AND** the system SHALL trigger a refund process via Stripe

### Requirement: Database Schema - DisputeStatus Enum

The system SHALL define a DisputeStatus enum in Prisma with the following values:
- OPEN
- RESOLVED_REFUND_CLIENT
- RESOLVED_PAYOUT_CONTRACTOR
- RESOLVED_PARTIAL

#### Scenario: Enum validation on dispute status
- **WHEN** a Dispute record is created or updated
- **AND** an invalid status value is provided (e.g., "CLOSED")
- **THEN** Prisma SHALL reject the operation with a validation error
- **AND** the error message SHALL indicate the allowed enum values

#### Scenario: Partial resolution handling
- **WHEN** an admin determines both parties share responsibility
- **THEN** the status SHALL be set to RESOLVED_PARTIAL
- **AND** the resolution notes SHALL explain the split decision
- **AND** the system SHALL process partial refund and partial payout

### Requirement: Database Schema - AdminAuditLog Model

The system SHALL provide an AdminAuditLog model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Foreign key `adminId` linking to User (admin who performed action)
- Action fields: `action` (String, e.g., "approve_service", "block_user"), `targetType` (String, e.g., "service", "user", "rating"), `targetId` (String, UUID of affected entity)
- Metadata: `metadata` (Json) for additional context
- Timestamp: `createdAt` (immutable)
- Relation: `admin` (User)
- Indexes: composite `adminId + createdAt`, composite `targetType + targetId`

#### Scenario: Admin approves service
- **WHEN** an admin approves a service for publication
- **THEN** an AdminAuditLog record SHALL be created automatically
- **AND** `adminId` SHALL reference the admin user
- **AND** `action` SHALL be "approve_service"
- **AND** `targetType` SHALL be "service"
- **AND** `targetId` SHALL be the service UUID
- **AND** `metadata` SHALL optionally include previous/new status

#### Scenario: Admin blocks user
- **WHEN** an admin blocks a user account
- **THEN** an AdminAuditLog record SHALL be created
- **AND** `action` SHALL be "block_user"
- **AND** `targetType` SHALL be "user"
- **AND** `targetId` SHALL be the user UUID
- **AND** `metadata` SHALL include the reason for blocking

#### Scenario: Audit trail query by admin
- **WHEN** viewing all actions performed by a specific admin
- **THEN** the system SHALL query WHERE adminId = X
- **AND** ORDER BY createdAt DESC
- **AND** use the composite `adminId + createdAt` index
- **AND** the query SHALL complete in <50ms

#### Scenario: Audit trail query by target entity
- **WHEN** investigating all admin actions on a specific service
- **THEN** the system SHALL query WHERE targetType = 'service' AND targetId = serviceId
- **AND** use the composite `targetType + targetId` index
- **AND** retrieve all historical actions (approvals, rejections, edits)
- **AND** include admin details via JOIN on adminId

#### Scenario: Compliance audit report
- **WHEN** generating a compliance report of all admin actions in a date range
- **THEN** the system SHALL query WHERE createdAt BETWEEN startDate AND endDate
- **AND** optionally filter by action type (e.g., all "block_user" actions)
- **AND** export the results with admin names, timestamps, and metadata
- **AND** support pagination for large result sets

### Requirement: Audit Log Immutability

The system SHALL enforce immutability of AdminAuditLog records:
- AdminAuditLog records SHALL NOT have an `updatedAt` field
- No application code SHALL be allowed to UPDATE or DELETE AdminAuditLog records
- Database permissions SHALL restrict modifications to AdminAuditLog table
- Audit logs SHALL serve as permanent, tamper-proof record of admin actions

#### Scenario: Attempted audit log modification
- **WHEN** code attempts to update or delete an AdminAuditLog record
- **THEN** the operation SHALL fail (database constraint or application-level validation)
- **AND** an error SHALL be logged indicating the attempted violation
- **AND** the audit log SHALL remain unchanged

#### Scenario: Long-term retention policy
- **WHEN** audit logs accumulate over months/years
- **THEN** old logs SHALL be retained indefinitely for compliance
- **AND** archival strategies (e.g., move to cold storage) MAY be implemented after 1 year
- **AND** no deletion SHALL occur unless legally required
