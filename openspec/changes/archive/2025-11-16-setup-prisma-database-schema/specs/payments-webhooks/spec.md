## ADDED Requirements

### Requirement: Database Schema - Payment Model

The system SHALL provide a Payment model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Foreign key `bookingId` linking to Booking
- Type enum: `type` (ANTICIPO, LIQUIDACION, REEMBOLSO)
- Amount fields: `amount` (Decimal), `currency` (String, default "mxn")
- Stripe references: `stripePaymentIntentId` (optional), `stripeCheckoutSessionId` (optional), `stripeTransferId` (optional for payouts)
- Status enum: `status` (PENDING, SUCCEEDED, FAILED, REFUNDED)
- Metadata: `metadata` (Json) for additional info
- Audit fields: `createdAt`, `updatedAt`
- Relation: `booking`
- Indexes: `bookingId`, composite `type + status`, `stripePaymentIntentId`

#### Scenario: Anticipo payment created on checkout
- **WHEN** a client initiates checkout for a booking
- **THEN** a Payment record SHALL be created with type ANTICIPO
- **AND** amount SHALL equal the booking's `anticipoAmount`
- **AND** status SHALL be PENDING
- **AND** `stripePaymentIntentId` SHALL be populated with Stripe's Payment Intent ID
- **AND** `stripeCheckoutSessionId` SHALL be populated with Checkout Session ID

#### Scenario: Payment confirmed via webhook
- **WHEN** a Stripe webhook delivers `payment_intent.succeeded` event
- **THEN** the system SHALL query Payment WHERE stripePaymentIntentId = event.data.object.id
- **AND** use the `stripePaymentIntentId` index for fast lookup
- **AND** update status from PENDING to SUCCEEDED
- **AND** trigger booking confirmation workflow

#### Scenario: Liquidacion payment on completion
- **WHEN** a booking transitions to COMPLETED status
- **THEN** a Payment record SHALL be created with type LIQUIDACION
- **AND** amount SHALL equal the booking's `liquidacionAmount`
- **AND** `stripeTransferId` SHALL be populated when payout is created to contractor
- **AND** status SHALL be SUCCEEDED once transfer completes

#### Scenario: Refund payment on cancellation
- **WHEN** a booking is cancelled and refund policy applies (BR-004)
- **THEN** a Payment record SHALL be created with type REEMBOLSO
- **AND** amount SHALL be the refund amount (partial or full anticipo)
- **AND** `stripePaymentIntentId` SHALL reference the original payment
- **AND** status SHALL transition to REFUNDED once Stripe confirms

### Requirement: Database Schema - PaymentType Enum

The system SHALL define a PaymentType enum in Prisma with the following values:
- ANTICIPO
- LIQUIDACION
- REEMBOLSO

#### Scenario: Payment type validation
- **WHEN** a Payment record is created
- **THEN** Prisma SHALL validate the type is one of the allowed enum values
- **AND** reject invalid values (e.g., "DEPOSIT") with a validation error

### Requirement: Database Schema - PaymentStatus Enum

The system SHALL define a PaymentStatus enum in Prisma with the following values:
- PENDING
- SUCCEEDED
- FAILED
- REFUNDED

#### Scenario: Failed payment handling
- **WHEN** a Stripe webhook delivers `payment_intent.payment_failed` event
- **THEN** the Payment status SHALL be updated to FAILED
- **AND** the Booking status SHALL remain PENDING_PAYMENT
- **AND** the client SHALL be notified to retry payment

### Requirement: Database Schema - ProcessedWebhookEvent Model

The system SHALL provide a ProcessedWebhookEvent model in the Prisma schema with the following structure:
- Primary key `id` as UUID
- Unique field `stripeEventId` (String) for idempotency
- Field `eventType` (String) indicating the webhook event type
- Timestamp `processedAt` (DateTime, default now())
- Index on `stripeEventId` for fast idempotency checks

#### Scenario: Idempotent webhook processing
- **WHEN** a Stripe webhook is received
- **THEN** the system SHALL check if ProcessedWebhookEvent exists WHERE stripeEventId = event.id
- **AND** use the `stripeEventId` index for O(1) lookup
- **AND** if found, skip processing and return 200 OK
- **AND** if not found, process the webhook and create ProcessedWebhookEvent record

#### Scenario: Webhook retry from Stripe
- **WHEN** Stripe retries a webhook due to network timeout
- **THEN** the duplicate event SHALL be detected via stripeEventId
- **AND** the system SHALL NOT double-process (e.g., double charge, double confirmation)
- **AND** return 200 OK to acknowledge receipt

#### Scenario: Webhook audit trail
- **WHEN** debugging payment issues
- **THEN** the admin SHALL query ProcessedWebhookEvent to see all received events
- **AND** filter by eventType to see all `payment_intent.succeeded` events
- **AND** verify event was processed with timestamp
