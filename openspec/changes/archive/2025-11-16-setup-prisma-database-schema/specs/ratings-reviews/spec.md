## ADDED Requirements

### Requirement: Database Schema - Rating Model

The system SHALL provide a Rating model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Unique foreign key `bookingId` linking to Booking (1:1, one rating per booking)
- Foreign keys: `serviceId` (to Service), `clientId` (to User)
- Rating fields: `stars` (Int, constraint 1-5), `comment` (optional String, max 500 characters)
- Moderation fields: `moderationStatus` (enum: PENDING, APPROVED, REJECTED), `moderationNotes` (optional Text)
- Audit fields: `createdAt`, `updatedAt`
- Relations: `booking`, `service`, `client`
- Indexes: composite `serviceId + moderationStatus`, `moderationStatus` alone

#### Scenario: Rating created after booking completion
- **WHEN** a client submits a rating for a completed booking
- **THEN** a Rating record SHALL be created with the provided stars and optional comment
- **AND** `bookingId` SHALL be unique (enforced by database constraint)
- **AND** `moderationStatus` SHALL default to PENDING
- **AND** the rating SHALL NOT appear in public queries until approved

#### Scenario: Rating uniqueness validation
- **WHEN** a client attempts to submit a second rating for the same booking
- **THEN** Prisma SHALL reject the operation with a unique constraint violation on bookingId
- **AND** the API SHALL return a 409 Conflict error
- **AND** inform the client they have already rated this booking

#### Scenario: Stars constraint validation
- **WHEN** a Rating record is created or updated
- **AND** the stars value is outside the range 1-5
- **THEN** the application layer SHALL validate and reject the operation
- **AND** return a validation error to the client

#### Scenario: Moderation query for admins
- **WHEN** an admin views ratings pending moderation
- **THEN** the system SHALL query WHERE moderationStatus = 'PENDING'
- **AND** use the `moderationStatus` index for performance
- **AND** the query SHALL complete in <50ms

### Requirement: Database Schema - ModerationStatus Enum

The system SHALL define a ModerationStatus enum in Prisma with the following values:
- PENDING
- APPROVED
- REJECTED

#### Scenario: Auto-approval of ratings without comments
- **WHEN** a rating is submitted with only stars (no comment)
- **THEN** the moderationStatus MAY be set to APPROVED automatically
- **AND** the rating SHALL immediately appear in public service ratings

#### Scenario: Manual moderation of ratings with comments
- **WHEN** a rating includes a comment
- **THEN** the moderationStatus SHALL default to PENDING
- **AND** require admin review before approval
- **AND** admin SHALL provide moderationNotes if rejecting

### Requirement: Database Schema - ServiceRatingStats Model

The system SHALL provide a ServiceRatingStats model in the Prisma schema with the following structure:
- Primary key `serviceId` (String, foreign key to Service, 1:1 relationship)
- Aggregate fields: `average` (Decimal), `totalRatings` (Int)
- Timestamp: `updatedAt` (DateTime)
- Relation: `service` (1:1)

#### Scenario: Rating stats cached on first rating
- **WHEN** the first approved rating is created for a service
- **THEN** a ServiceRatingStats record SHALL be created
- **AND** `average` SHALL equal the stars value
- **AND** `totalRatings` SHALL equal 1
- **AND** the stats SHALL be stored for fast retrieval

#### Scenario: Rating stats updated on new rating
- **WHEN** a new rating is approved for a service
- **THEN** the system SHALL recalculate the average from all approved ratings
- **AND** update ServiceRatingStats with new average and incremented totalRatings
- **AND** the update SHALL occur atomically via upsert operation

#### Scenario: Public service search includes ratings
- **WHEN** clients search for services
- **THEN** each Service result SHALL include average rating and total count
- **AND** the data SHALL come from ServiceRatingStats (cached, not calculated on-the-fly)
- **AND** the query SHALL JOIN Service with ServiceRatingStats
- **AND** services without ratings SHALL show null or 0.0 average

#### Scenario: Rating stats consistency validation
- **WHEN** a rating moderation status changes from APPROVED to REJECTED
- **THEN** the ServiceRatingStats SHALL be recalculated
- **AND** the rejected rating SHALL be excluded from the average
- **AND** `totalRatings` SHALL be decremented
- **AND** maintain data consistency between Rating and ServiceRatingStats tables

### Requirement: Rating Stats Recalculation Job

The system SHALL provide a mechanism to ensure ServiceRatingStats accuracy:
- A nightly batch job SHALL recalculate all ServiceRatingStats from scratch
- The job SHALL aggregate WHERE moderationStatus = 'APPROVED'
- The job SHALL detect and fix any discrepancies between cached and actual stats
- The job SHALL log any corrections made for audit purposes

#### Scenario: Nightly stats recalculation
- **WHEN** the nightly job runs at a low-traffic time (e.g., 3 AM)
- **THEN** for each Service with ratings, recalculate average and total
- **AND** compare with existing ServiceRatingStats
- **AND** update if there's a discrepancy
- **AND** log services that had incorrect cached values

#### Scenario: Stats recovery after data inconsistency
- **WHEN** a bug or manual database change causes stats desynchronization
- **THEN** the nightly job SHALL automatically detect and correct the issue
- **AND** restore correct average and totalRatings values
- **AND** no manual intervention SHALL be required
