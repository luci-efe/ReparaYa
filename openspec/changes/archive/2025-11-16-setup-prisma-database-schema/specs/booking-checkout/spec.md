## ADDED Requirements

### Requirement: Database Schema - Booking Model

The system SHALL provide a Booking model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Foreign keys: `serviceId` (to Service), `clientId` (to User), `contractorId` (to User), `availabilityId` (to Availability)
- Status enum: `status` (BookingStatus with 8 states)
- Scheduling: `scheduledDate` (DateTime), `address` (String), `notes` (optional Text)
- Financial fields (all Decimal): `basePrice`, `finalPrice`, `anticipoAmount`, `liquidacionAmount`, `comisionAmount`, `contractorPayoutAmount`
- Audit fields: `createdAt`, `updatedAt`
- Relations: `service`, `client`, `contractor`, `availability`, `payments`, `messages`, `rating`, `dispute`, `stateHistory`
- Indexes: composite `clientId + status`, composite `contractorId + status`, composite `status + scheduledDate`

#### Scenario: Booking created with price snapshot
- **WHEN** a client creates a booking for a service
- **THEN** the Booking record SHALL capture the current `basePrice` from Service
- **AND** `finalPrice` SHALL be calculated applying markup (BR-001)
- **AND** `anticipoAmount` SHALL be 20% of `finalPrice` (BR-003)
- **AND** `liquidacionAmount` SHALL be 80% of `finalPrice` (BR-003)
- **AND** `comisionAmount` SHALL be platform fee from `basePrice` (BR-002)
- **AND** `contractorPayoutAmount` SHALL be `basePrice - comisionAmount`
- **AND** status SHALL default to PENDING_PAYMENT

#### Scenario: Booking queries by client
- **WHEN** a client views their bookings
- **THEN** the system SHALL query WHERE clientId = userId
- **AND** optionally filter by status (e.g., active bookings exclude COMPLETED, CANCELLED)
- **AND** use the composite `clientId + status` index
- **AND** the query SHALL complete in <100ms

#### Scenario: Contractor dashboard query
- **WHEN** a contractor views upcoming jobs
- **THEN** the system SHALL query WHERE contractorId = userId
- **AND** status IN ('CONFIRMED', 'ON_ROUTE', 'ON_SITE', 'IN_PROGRESS')
- **AND** ORDER BY scheduledDate ASC
- **AND** use the composite `contractorId + status` index

#### Scenario: Financial integrity validation
- **WHEN** a Booking record is created
- **THEN** the system SHALL validate that anticipoAmount + liquidacionAmount = finalPrice
- **AND** validate that comisionAmount < basePrice
- **AND** validate that contractorPayoutAmount = basePrice - comisionAmount
- **AND** reject the operation if any validation fails

### Requirement: Database Schema - BookingStatus Enum

The system SHALL define a BookingStatus enum in Prisma with the following values:
- PENDING_PAYMENT
- CONFIRMED
- ON_ROUTE
- ON_SITE
- IN_PROGRESS
- COMPLETED
- CANCELLED
- DISPUTED

#### Scenario: State transition validation
- **WHEN** a booking status is updated
- **THEN** the application SHALL validate the transition is allowed per RF-006 state machine
- **AND** create a BookingStateHistory record tracking the change
- **AND** reject invalid transitions (e.g., COMPLETED to CONFIRMED)

#### Scenario: Payment webhook confirms booking
- **WHEN** a Stripe webhook indicates payment_intent.succeeded for anticipo
- **THEN** the Booking status SHALL transition from PENDING_PAYMENT to CONFIRMED
- **AND** the Availability status SHALL transition to BOOKED
- **AND** both updates SHALL occur in a single database transaction

### Requirement: Database Schema - BookingStateHistory Model

The system SHALL provide a BookingStateHistory model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Foreign key `bookingId` linking to Booking
- Foreign key `changedBy` linking to User (who made the change)
- State fields: `fromState` (BookingStatus), `toState` (BookingStatus)
- Optional `notes` field (Text) for explaining the change
- Timestamp: `createdAt` (immutable, no updatedAt needed)
- Relations: `booking`, `user` (changedBy)
- Composite index on `bookingId + createdAt` for chronological history queries

#### Scenario: State change audit trail
- **WHEN** a booking status changes from any state to another
- **THEN** a BookingStateHistory record SHALL be created automatically
- **AND** `fromState` SHALL contain the previous status
- **AND** `toState` SHALL contain the new status
- **AND** `changedBy` SHALL reference the user who triggered the change
- **AND** the record SHALL be immutable once created

#### Scenario: History timeline query
- **WHEN** viewing the timeline of a booking (e.g., in dispute resolution)
- **THEN** the system SHALL query WHERE bookingId = X
- **AND** ORDER BY createdAt ASC
- **AND** use the composite `bookingId + createdAt` index
- **AND** include user details via JOIN on changedBy
- **AND** the query SHALL complete in <50ms

#### Scenario: Dispute investigation
- **WHEN** investigating when a booking was marked as COMPLETED
- **THEN** the system SHALL query BookingStateHistory WHERE bookingId = X AND toState = 'COMPLETED'
- **AND** retrieve the timestamp and user who completed it
- **AND** optionally retrieve notes explaining the completion
