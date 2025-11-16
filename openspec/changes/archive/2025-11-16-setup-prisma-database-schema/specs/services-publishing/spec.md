## ADDED Requirements

### Requirement: Database Schema - Availability Model

The system SHALL provide an Availability model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Foreign key `serviceId` linking to Service (N:1 relationship)
- Optional foreign key `bookingId` linking to Booking (1:1 when booked)
- Time fields: `date` (DateTime), `startTime` (DateTime), `endTime` (DateTime)
- Status enum: `status` (AVAILABLE, BOOKED, BLOCKED)
- Audit fields: `createdAt`, `updatedAt`
- Relations: `service`, `booking` (optional)
- Composite index on `serviceId + date + status` for efficient availability queries
- Index on `bookingId` for reverse lookup

#### Scenario: Contractor publishes availability slots
- **WHEN** a contractor creates availability for a service
- **AND** provides date, start time, and end time
- **THEN** an Availability record SHALL be created with status AVAILABLE
- **AND** the `bookingId` SHALL be NULL
- **AND** the slot SHALL appear in public availability queries

#### Scenario: Availability query for booking flow
- **WHEN** a client views available time slots for a service
- **THEN** the system SHALL query WHERE serviceId = X
- **AND** date >= TODAY
- **AND** status = 'AVAILABLE'
- **AND** use the composite `serviceId + date + status` index
- **AND** the query SHALL complete in <100ms

#### Scenario: Slot reserved on booking creation
- **WHEN** a booking is created successfully
- **THEN** the corresponding Availability record SHALL be updated
- **AND** status SHALL change from AVAILABLE to BOOKED
- **AND** `bookingId` SHALL be set to the created booking ID
- **AND** the update SHALL be atomic to prevent double-booking

### Requirement: Database Schema - AvailabilityStatus Enum

The system SHALL define an AvailabilityStatus enum in Prisma with the following values:
- AVAILABLE
- BOOKED
- BLOCKED

#### Scenario: Enum validation on availability creation
- **WHEN** an Availability record is created or updated
- **AND** an invalid status value is provided (e.g., "RESERVED")
- **THEN** Prisma SHALL reject the operation with a validation error
- **AND** the error message SHALL indicate the allowed enum values

#### Scenario: Contractor blocks time slot
- **WHEN** a contractor marks a time slot as unavailable manually
- **THEN** the status SHALL be set to BLOCKED
- **AND** the slot SHALL NOT appear in availability queries for clients
- **AND** the `bookingId` SHALL remain NULL
