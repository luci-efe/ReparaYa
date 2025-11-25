# Spec: Stripe Payments Integration

**Module:** payments
**Capability:** payments-webhooks
**Version:** 1.0
**Status:** Proposed
**Last Updated:** 2025-11-23

## Purpose and Scope

This specification defines the implementation of Stripe payment processing for ReparaYa, including checkout sessions, webhook handling, payouts to contractors via Stripe Connect, and refunds.

### In Scope

- Stripe SDK initialization and configuration
- Commission calculation according to business rules (BR-001, BR-002, BR-003)
- Checkout session creation for advance payments (30%)
- Webhook processing with signature verification and idempotency
- Payouts to contractors via Stripe Connect
- Refund processing
- Comprehensive audit logging

### Out of Scope

- Booking module implementation (separate change)
- UI for payment forms (handled by Stripe Checkout)
- Dispute resolution workflow (future feature)

---

## ADDED Requirements

### Requirement: PAY-001 - The system SHALL initialize Stripe SDK with environment variables

**Priority:** HIGH
**Type:** Technical Setup


The payments module MUST initialize the Stripe SDK client with valid API keys from environment variables. The system SHALL validate that all required Stripe credentials are present at startup and SHALL fail with a clear error message if any are missing.

Configuration requirements:
- `STRIPE_SECRET_KEY`: Server-side Stripe secret key (sk_test_* for test mode, sk_live_* for production)
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret for signature verification
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Client-side publishable key
- Stripe API version: 2024-11-20.acacia (latest stable)

Safety:
- Never expose secret keys in client-side code or logs
- Use test mode keys during development and testing
- Validate keys on initialization, not at runtime

#### Scenario: Stripe client initializes successfully with valid credentials

**Given** environment variables are set:
- `STRIPE_SECRET_KEY` = "sk_test_123456789"
- `STRIPE_WEBHOOK_SECRET` = "whsec_123456789"
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = "pk_test_123456789"

**When** the Stripe service module is imported

**Then** the Stripe client is initialized successfully
**And** no errors are thrown
**And** the client is ready to make API calls

#### Scenario: Stripe client initialization fails when secret key is missing

**Given** the environment variable `STRIPE_SECRET_KEY` is not set

**When** the Stripe service module is imported

**Then** an error is thrown with message "Missing required environment variable: STRIPE_SECRET_KEY"
**And** the application fails to start
**And** the error is logged for debugging

---

### Requirement: PAY-002 - The system SHALL calculate booking amounts according to business rules BR-001, BR-002, BR-003

**Priority:** HIGH
**Type:** Business Logic

The commission service MUST calculate all payment amounts for a booking with exact precision according to the defined business rules. All monetary calculations SHALL use Prisma's `Decimal` type to avoid floating-point errors.

Business Rules:
- BR-001 (Precios y recargos):
  - Precio base (Pc) = Contractor's listed price
  - Precio final (Pf) = Pc × 1.10 (10% platform markup charged to client)
- BR-002 (Comisiones):
  - Comisión plataforma = Pf × 0.15 (15% of final price)
  - Pago a contratista (Ic) = Pf - Comisión = Pf × 0.85 (contractor receives 85%)
- BR-003 (Anticipo y liquidación):
  - Anticipo (advance payment) = Pf × 0.30 (30% paid upfront at booking)
  - Liquidación (settlement) = Pf × 0.70 (70% paid after service completion)

Percentages from environment variables:
- `PLATFORM_MARKUP_PERCENTAGE` = "10"
- `PLATFORM_COMMISSION_PERCENTAGE` = "15"
- `BOOKING_ADVANCE_PERCENTAGE` = "30"

#### Scenario: Calculate amounts for $100 base price

**Given** a service has base price of $100.00

**When** the commission service calculates booking amounts

**Then** the following amounts are returned:
- `basePrice`: $100.00
- `finalPrice`: $110.00 (base × 1.10)
- `anticipoAmount`: $33.00 (final × 0.30)
- `liquidacionAmount`: $77.00 (final × 0.70)
- `comisionAmount`: $16.50 (final × 0.15)
- `contractorPayoutAmount`: $93.50 (final × 0.85)

**And** all amounts use `Decimal` type (no rounding errors)
**And** anticipo + liquidación = finalPrice

#### Scenario: Calculate amounts for $50.50 base price (test decimal precision)

**Given** a service has base price of $50.50

**When** the commission service calculates booking amounts

**Then** the following amounts are returned:
- `basePrice`: $50.50
- `finalPrice`: $55.55 (base × 1.10)
- `anticipoAmount`: $16.665 → $16.67 (final × 0.30, rounded to 2 decimals)
- `liquidacionAmount`: $38.885 → $38.88 (final × 0.70, rounded to 2 decimals)
- `comisionAmount`: $8.3325 → $8.33 (final × 0.15, rounded to 2 decimals)
- `contractorPayoutAmount`: $47.2175 → $47.22 (final × 0.85, rounded to 2 decimals)

**And** no floating-point errors occur
**And** calculations are deterministic and repeatable

---

### Requirement: PAY-003 - The system SHALL create Stripe Checkout Sessions for advance payments

**Priority:** HIGH
**Type:** Functional

The checkout service MUST create Stripe Checkout Sessions to collect advance payments (30% of final price) from clients when they book a service. The session SHALL include metadata to link the payment back to the booking.

Implementation:
- Use Stripe Checkout Sessions (not Payment Intents directly)
- Amount: `anticipoAmount` calculated by commission service
- Currency: MXN (Mexican pesos)
- Payment methods: card
- Mode: payment (one-time payment)
- Metadata: `{ booking_id, service_id, client_id }`
- Success URL: `/bookings/{booking_id}/success`
- Cancel URL: `/bookings/{booking_id}/cancelled`

Database updates:
- Create `Payment` record with:
  - `type`: ANTICIPO
  - `status`: PENDING
  - `amount`: anticipoAmount
  - `stripeCheckoutSessionId`: session ID from Stripe
  - `bookingId`: reference to booking

#### Scenario: Create checkout session for new booking

**Given** a booking exists with:
- `id`: "booking_123"
- `serviceId`: "service_456"
- `clientId`: "user_789"
- `finalPrice`: $110.00
- `anticipoAmount`: $33.00

**When** the checkout service creates a checkout session

**Then** a Stripe Checkout Session is created with:
- `amount`: 3300 (cents)
- `currency`: "mxn"
- `metadata`: `{ booking_id: "booking_123", service_id: "service_456", client_id: "user_789" }`
- `success_url`: "http://localhost:3000/bookings/booking_123/success"
- `cancel_url`: "http://localhost:3000/bookings/booking_123/cancelled"

**And** a Payment record is created in the database with:
- `type`: ANTICIPO
- `status`: PENDING
- `amount`: $33.00
- `stripeCheckoutSessionId`: (Stripe session ID)

**And** the function returns `{ sessionId, checkoutUrl }`

#### Scenario: Checkout session creation fails for invalid booking

**Given** a booking ID "invalid_123" does not exist in the database

**When** the checkout service attempts to create a checkout session

**Then** an error is thrown with message "Booking not found: invalid_123"
**And** no Stripe API calls are made
**And** no Payment records are created

---

### Requirement: PAY-004 - The webhook endpoint SHALL process Stripe events with signature verification and idempotency

**Priority:** HIGH
**Type:** Functional

The system MUST provide a webhook endpoint at `/api/webhooks/stripe` to receive and process Stripe events. The endpoint SHALL verify webhook signatures to ensure events come from Stripe, and SHALL implement idempotency to prevent duplicate processing.

Events to process:
- `payment_intent.succeeded`: Mark payment as succeeded, update booking to CONFIRMED
- `payment_intent.payment_failed`: Mark payment as failed
- `charge.refunded`: Create refund payment record
- `account.updated`: Update contractor Connect account status

Security:
- Verify signature using `stripe.webhooks.constructEvent()`
- Reject events with invalid signatures (return 400 Bad Request)
- Use `STRIPE_WEBHOOK_SECRET` from environment

Idempotency:
- Check if `event.id` exists in `ProcessedWebhookEvent` table
- If exists, return 200 OK without reprocessing
- If new, process event and store `event.id`
- Use database unique constraint as safety net

Error handling:
- Return 200 OK for successful processing
- Return 200 OK for duplicate events (already processed)
- Return 400 Bad Request for invalid signature
- Return 500 Internal Server Error for processing errors (Stripe will retry)

#### Scenario: Webhook processes payment_intent.succeeded event

**Given** a Stripe event `payment_intent.succeeded` is received with:
- `id`: "evt_123"
- `type`: "payment_intent.succeeded"
- `data.object.id`: "pi_456"
- `data.object.metadata`: `{ booking_id: "booking_789" }`
- Valid `stripe-signature` header

**And** a Payment exists with `stripePaymentIntentId`: "pi_456" and `status`: PENDING

**When** the webhook endpoint receives the event

**Then** the webhook signature is verified successfully
**And** the event ID "evt_123" is checked in `ProcessedWebhookEvent` table (not found)
**And** the Payment status is updated to SUCCEEDED
**And** the Booking status is updated to CONFIRMED (if booking module exists)
**And** a `ProcessedWebhookEvent` record is created with `stripeEventId`: "evt_123"
**And** the endpoint returns 200 OK

#### Scenario: Webhook rejects event with invalid signature

**Given** a POST request is sent to `/api/webhooks/stripe`
**And** the `stripe-signature` header is missing or invalid

**When** the webhook endpoint attempts to verify the signature

**Then** `stripe.webhooks.constructEvent()` throws an error
**And** the endpoint returns 400 Bad Request
**And** no event processing occurs
**And** no database records are created
**And** a warning is logged

#### Scenario: Webhook handles duplicate event (idempotency)

**Given** a Stripe event with `id`: "evt_123" was previously processed
**And** a `ProcessedWebhookEvent` record exists with `stripeEventId`: "evt_123"

**When** the same event is received again (Stripe retry or webhook test)

**Then** the webhook endpoint checks the database
**And** finds the event has already been processed
**And** skips event processing
**And** returns 200 OK (success - idempotency working)
**And** logs: "Event evt_123 already processed, skipping"

#### Scenario: Webhook performance meets latency requirements (RNF-3.5.1)

**Given** the webhook endpoint is deployed and receiving events

**When** 100 webhook events are sent within 10 seconds

**Then** the P95 latency is ≤ 0.8 seconds
**And** the P99 latency is ≤ 1.2 seconds
**And** no events are lost or fail due to timeout
**And** idempotency checks do not significantly impact performance

---

### Requirement: PAY-005 - The system SHALL create payouts to contractors when bookings are completed

**Priority:** HIGH
**Type:** Functional

The payout service MUST automatically create Stripe Transfers to contractors' Connect accounts when a booking is marked as COMPLETED. The transfer amount SHALL be the contractor payout amount (85% of final price, per BR-002).

Implementation:
- Triggered when booking status changes to COMPLETED
- Verify contractor has Stripe Connect account (`stripeConnectAccountId`)
- Calculate amount: `contractorPayoutAmount` (finalPrice × 0.85)
- Create Stripe Transfer to Connect account
- Create Payment record with type: LIQUIDACION
- Handle errors gracefully (log and retry later if Connect account not ready)

Safety:
- Only payout once per booking (check for existing LIQUIDACION payment)
- Verify contractor Connect account is active (`payouts_enabled: true`)
- Use Stripe's idempotency keys for transfer creation

#### Scenario: Create payout when booking is completed

**Given** a booking exists with:
- `id`: "booking_123"
- `status`: COMPLETED
- `finalPrice`: $110.00
- `contractorPayoutAmount`: $93.50
- `contractorId`: "contractor_456"

**And** the contractor has `stripeConnectAccountId`: "acct_789"
**And** no LIQUIDACION payment exists for this booking

**When** the payout service creates a payout

**Then** a Stripe Transfer is created with:
- `amount`: 9350 (cents)
- `currency`: "mxn"
- `destination`: "acct_789"
- `metadata`: `{ booking_id: "booking_123", type: "liquidacion" }`

**And** a Payment record is created with:
- `type`: LIQUIDACION
- `status`: SUCCEEDED
- `amount`: $93.50
- `stripeTransferId`: (Stripe transfer ID)
- `bookingId`: "booking_123"

**And** the function returns the Payment object

#### Scenario: Payout fails when contractor has no Connect account

**Given** a booking is COMPLETED
**And** the contractor has `stripeConnectAccountId`: null (not onboarded)

**When** the payout service attempts to create a payout

**Then** an error is thrown: "Contractor has no Stripe Connect account"
**And** no Stripe Transfer is created
**And** no Payment record is created
**And** the error is logged for manual review

#### Scenario: Payout is idempotent (prevent double payment)

**Given** a booking is COMPLETED
**And** a LIQUIDACION payment already exists for this booking

**When** the payout service is called again (duplicate trigger)

**Then** the service detects the existing payout
**And** skips creating a new transfer
**And** returns the existing Payment record
**And** logs: "Payout already exists for booking booking_123"

---

### Requirement: PAY-006 - The system SHALL integrate contractors with Stripe Connect Express accounts

**Priority:** MEDIUM
**Type:** Integration

The system MUST provide functionality to onboard contractors to Stripe Connect Express accounts, allowing them to receive payouts. The system SHALL create Connect accounts, generate onboarding links for KYC verification, and track account status.

Implementation:
- Create Stripe Connect Express accounts (type: "express")
- Generate Account Links for contractor onboarding
- Store `stripeConnectAccountId` in `ContractorProfile`
- Check account status (`charges_enabled`, `payouts_enabled`)
- Handle webhook event `account.updated` to track onboarding progress

Capabilities:
- `createConnectAccount(contractorId)`: Create new Express account
- `createOnboardingLink(contractorId)`: Generate KYC link
- `getAccountStatus(accountId)`: Check if account is ready for payouts

#### Scenario: Create Stripe Connect account for contractor

**Given** a contractor exists with `id`: "contractor_123"
**And** the contractor has `stripeConnectAccountId`: null

**When** the Stripe Connect service creates an account

**Then** a Stripe Connect Express account is created
**And** the `ContractorProfile` is updated with `stripeConnectAccountId`: "acct_456"
**And** the function returns `{ accountId: "acct_456" }`

#### Scenario: Generate onboarding link for contractor KYC

**Given** a contractor has `stripeConnectAccountId`: "acct_456"
**And** the account is not yet verified (`charges_enabled`: false)

**When** the service generates an onboarding link

**Then** a Stripe Account Link is created with:
- `account`: "acct_456"
- `type`: "account_onboarding"
- `refresh_url`: "/contractors/onboarding/refresh"
- `return_url`: "/contractors/onboarding/complete"

**And** the function returns `{ url: "https://connect.stripe.com/setup/..." }`
**And** the contractor can visit this URL to complete KYC

#### Scenario: Check account status shows account is ready for payouts

**Given** a contractor has completed KYC verification
**And** Stripe Connect account "acct_456" is fully activated

**When** the service checks the account status

**Then** the function returns:
- `chargesEnabled`: true
- `payoutsEnabled`: true

**And** the contractor is ready to receive payouts

---

### Requirement: PAY-007 - The system SHALL process refunds according to cancellation policy

**Priority:** MEDIUM
**Type:** Functional

The refund service MUST handle refunds when bookings are cancelled, applying the cancellation policy (BR-004) to determine refund amounts. The service SHALL create Stripe Refunds and update payment records accordingly.

Implementation:
- Find original ANTICIPO payment
- Apply cancellation policy to calculate refund amount
- Create Stripe Refund
- Create Payment record with type: REEMBOLSO
- Update original payment status to REFUNDED

Cancellation policy (BR-004):
- TODO: Define specific policy (e.g., full refund if >24h before, 50% if <24h, no refund if <2h)

#### Scenario: Process full refund for cancelled booking

**Given** a booking is cancelled more than 24 hours before scheduled date
**And** an ANTICIPO payment exists with:
  - `id`: "payment_123"
  - `amount`: $33.00
  - `stripePaymentIntentId`: "pi_456"
  - `status`: SUCCEEDED

**When** the refund service processes the refund

**Then** a Stripe Refund is created for payment intent "pi_456"
**And** a Payment record is created with:
  - `type`: REEMBOLSO
  - `amount`: $33.00 (full refund)
  - `status`: SUCCEEDED
  - `bookingId`: (booking ID)

**And** the original payment status is updated to REFUNDED
**And** the client receives their money back

#### Scenario: Process partial refund according to cancellation policy

**Given** a booking is cancelled less than 24 hours before scheduled date
**And** the cancellation policy allows 50% refund

**When** the refund service processes the refund

**Then** a Stripe Refund is created for 50% of the original amount
**And** a Payment record is created with:
  - `type`: REEMBOLSO
  - `amount`: $16.50 (50% of $33.00)
  - `status`: SUCCEEDED

**And** the original payment status is updated to REFUNDED
**And** the platform retains $16.50 per cancellation policy

---

### Requirement: PAY-008 - The system SHALL maintain comprehensive audit logs for all payment operations

**Priority:** HIGH
**Type:** Non-Functional

All payment operations (checkouts, webhooks, payouts, refunds) MUST be logged for audit and debugging purposes. Logs SHALL include sufficient context to trace the full lifecycle of a payment without exposing sensitive data.

Logging requirements:
- Log all webhook events received (event ID, type, timestamp)
- Log all payment state changes (PENDING → SUCCEEDED, etc.)
- Log all Stripe API errors with context
- Never log full Stripe objects (may contain card details)
- Never log API keys or secrets
- Include correlation IDs (booking ID, payment ID) for tracing

Audit trail capabilities:
- Track full payment lifecycle for a booking
- Debug webhook processing issues
- Investigate payment failures
- Compliance reporting

#### Scenario: Audit log contains webhook processing details

**Given** a webhook event `payment_intent.succeeded` is processed

**When** the event processing completes

**Then** the following is logged:
- Event ID: "evt_123"
- Event type: "payment_intent.succeeded"
- Booking ID: "booking_789"
- Payment ID: "payment_456"
- Status change: PENDING → SUCCEEDED
- Timestamp: ISO 8601 format
- Processing duration: milliseconds

**And** no sensitive data (card details, full Stripe objects) is logged
**And** logs are queryable by booking ID or payment ID

#### Scenario: Audit log captures payment failure

**Given** a payment fails due to insufficient funds

**When** the `payment_intent.payment_failed` webhook is processed

**Then** the following is logged:
- Event type: "payment_intent.payment_failed"
- Failure reason: "insufficient_funds"
- Booking ID: (booking ID)
- Client ID: (client ID)
- Timestamp: ISO 8601 format

**And** the error is flagged for manual review
**And** the client is notified of the failure

---

## MODIFIED Requirements

### Update TODOs section

Remove completed TODOs as they are now implemented as formal requirements above:

- [x] Definir esquemas Prisma (Payment, ProcessedWebhookEvent) - Implemented in PAY-001
- [x] Implementar webhook handler - Implemented in PAY-004
- [x] Lógica de idempotencia - Implemented in PAY-004
- [x] Integración Stripe Connect - Implemented in PAY-006
- [x] Cálculo de comisiones según BR-001 y BR-002 - Implemented in PAY-002
- [x] Tests con Stripe Test Mode - Covered in testing plan

---

## REMOVED Requirements

_None - this change does not remove any existing requirements._

