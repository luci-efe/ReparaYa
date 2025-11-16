## ADDED Requirements

### Requirement: Database Schema - Message Model

The system SHALL provide a Message model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Foreign key `bookingId` linking to Booking (N:1 relationship)
- Foreign key `senderId` linking to User (N:1 relationship)
- Text field: `text` (String, max 2000 characters)
- Timestamp: `createdAt` (immutable, no updatedAt needed for messages)
- Relations: `booking`, `sender` (User)
- Composite index on `bookingId + createdAt` for chronological message retrieval

#### Scenario: Message created in booking context
- **WHEN** a client or contractor sends a message within a booking
- **THEN** a Message record SHALL be created with the current authenticated user as senderId
- **AND** the `bookingId` SHALL reference the active booking
- **AND** the `text` field SHALL be sanitized to prevent XSS
- **AND** the text length SHALL be validated (max 2000 characters)
- **AND** `createdAt` SHALL be set automatically

#### Scenario: Message thread retrieval
- **WHEN** loading the message thread for a booking
- **THEN** the system SHALL query WHERE bookingId = X
- **AND** ORDER BY createdAt ASC for chronological order
- **AND** use the composite `bookingId + createdAt` index
- **AND** the query SHALL complete in <100ms even with 100+ messages

#### Scenario: Polling for new messages
- **WHEN** the client polls for new messages using the `since` parameter
- **THEN** the system SHALL query WHERE bookingId = X AND createdAt > sinceTimestamp
- **AND** return only messages created after the last poll
- **AND** use the same composite index for performance

#### Scenario: Authorization check on message access
- **WHEN** a user attempts to read messages for a booking
- **THEN** the system SHALL verify the user is either the client OR contractor of the booking
- **AND** reject access if the user is neither participant
- **AND** perform this check before querying messages

### Requirement: Message Retention Policy

The system SHALL implement a retention policy for Message records:
- Messages SHALL be retained for a minimum of 7 days after the booking reaches COMPLETED or CANCELLED status
- After the retention period, a batch job SHALL delete expired messages
- The deletion policy SHALL comply with data protection regulations (LFPDPPP)

#### Scenario: Message retention after booking completion
- **WHEN** a booking transitions to COMPLETED status
- **THEN** the system SHALL record the completion date
- **AND** messages for that booking SHALL remain accessible for at least 7 days
- **AND** after 7 days, the messages SHALL be eligible for deletion

#### Scenario: Batch deletion of expired messages
- **WHEN** a scheduled batch job runs (e.g., daily at midnight)
- **THEN** the system SHALL identify bookings WHERE status IN ('COMPLETED', 'CANCELLED')
- **AND** updatedAt < 7 days ago
- **AND** delete associated Message records WHERE bookingId IN (eligible bookings)
- **AND** log the number of deleted messages for audit purposes

#### Scenario: Dispute extends retention
- **WHEN** a booking is in DISPUTED status
- **THEN** messages SHALL NOT be deleted regardless of age
- **AND** deletion SHALL only occur after dispute resolution AND 7 day retention period
