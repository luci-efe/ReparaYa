# Implementation Tasks: Stripe Payments Module

## 0. Prerequisites

- [ ] 0.1 Set up Stripe webhook secret
  - Option A: Use Stripe CLI: `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`
  - Option B: Create webhook in Stripe Dashboard and copy secret
  - Add `STRIPE_WEBHOOK_SECRET` to `.env.local`
- [ ] 0.2 Update `docs/md/STP-ReparaYa.md` with all 50+ test cases from proposal
  - Add section 4.1.X for Payments Module
  - Document test cases TC-PAY-*, TC-BR-*, TC-RF-007-*, TC-RF-010-*, TC-SEC-*, TC-E2E-*

## 1. Foundation - Data Layer (Week 1, Days 1-2)

### 1.1 Type Definitions
- [ ] 1.1.1 Create `src/modules/payments/types/index.ts`
  - Export types for Payment, ProcessedWebhookEvent, Stripe metadata
  - DTOs for checkout, webhook events, payouts
  - Business rule calculation types

### 1.2 Payment Repository
- [ ] 1.2.1 Create `src/modules/payments/repositories/paymentRepository.ts`
  - `createPayment(data: CreatePaymentInput): Promise<Payment>`
  - `findById(id: string): Promise<Payment | null>`
  - `findByBookingId(bookingId: string): Promise<Payment[]>`
  - `findByStripePaymentIntentId(id: string): Promise<Payment | null>`
  - `updateStatus(id: string, status: PaymentStatus): Promise<Payment>`
- [ ] 1.2.2 Create `src/modules/payments/repositories/webhookEventRepository.ts`
  - `createProcessedEvent(eventId: string, eventType: string): Promise<ProcessedWebhookEvent>`
  - `findByStripeEventId(eventId: string): Promise<ProcessedWebhookEvent | null>`
  - `hasBeenProcessed(eventId: string): Promise<boolean>`
- [ ] 1.2.3 Write tests for repositories
  - `src/modules/payments/__tests__/repositories/paymentRepository.test.ts`
  - `src/modules/payments/__tests__/repositories/webhookEventRepository.test.ts`
  - Use Prisma test client and seed test data
  - Verify: All tests pass, coverage ≥ 85%

## 2. Business Logic - Commission Service (Week 1, Day 3)

- [ ] 2.1 Create `src/modules/payments/services/commissionService.ts`
  - `calculateBookingAmounts(basePrice: Decimal): BookingAmounts`
    - Returns: finalPrice, anticipoAmount, liquidacionAmount, comisionAmount, contractorPayoutAmount
  - Read percentages from env vars: `PLATFORM_MARKUP_PERCENTAGE`, `PLATFORM_COMMISSION_PERCENTAGE`, `BOOKING_ADVANCE_PERCENTAGE`
  - Use Prisma `Decimal` type for precision
- [ ] 2.2 Write comprehensive tests
  - `src/modules/payments/__tests__/services/commissionService.test.ts`
  - Test cases:
    - TC-BR-001-01: Markup exactly 10%
    - TC-BR-002-01: Commission exactly 15% of final
    - TC-BR-003-01: Advance exactly 30% of final
    - TC-BR-003-02: Settlement exactly 70% of final
    - TC-BR-002-02: Contractor payout = final - 15%
  - Test with multiple base prices: $100, $1000, $50.50, $0.01
  - Verify decimal precision (no rounding errors)
  - **Verify: 100% coverage on this service (pure logic)**

## 3. Stripe Client & Checkout (Week 1, Days 4-5)

### 3.1 Stripe Client
- [ ] 3.1.1 Create `src/modules/payments/services/stripeService.ts`
  - Initialize Stripe SDK with `process.env.STRIPE_SECRET_KEY`
  - Export singleton `stripe` client
  - Validate env vars on module load
- [ ] 3.1.2 Write tests
  - `src/modules/payments/__tests__/services/stripeService.test.ts`
  - TC-PAY-001-01: Client initializes with valid key
  - TC-PAY-001-02: Throws error if `STRIPE_SECRET_KEY` missing

### 3.2 Checkout Service
- [ ] 3.2.1 Create `src/modules/payments/services/checkoutService.ts`
  - `createCheckoutSession(bookingId: string): Promise<{ sessionId: string, checkoutUrl: string }>`
    - Fetch booking data (service, client, amounts)
    - Calculate anticipo amount using commissionService
    - Create Stripe Checkout Session
    - Metadata: `{ booking_id, service_id, client_id }`
    - Success URL: `/bookings/{id}/success`
    - Cancel URL: `/bookings/{id}/cancelled`
    - Create Payment record (type: ANTICIPO, status: PENDING)
    - Return session ID and checkout URL
- [ ] 3.2.2 Write tests
  - `src/modules/payments/__tests__/services/checkoutService.test.ts`
  - Mock Stripe SDK and Prisma
  - TC-RF-005-01: Creates checkout session successfully
  - TC-RF-005-02: Includes correct metadata
  - TC-RF-005-03: Amount matches 30% of final price
  - TC-RF-005-04: Throws error for invalid booking
  - `tests/integration/payments/checkout-flow.test.ts` (with real Stripe Test Mode)
  - **Verify: Tests pass with test card 4242 4242 4242 4242**

## 4. Webhook Processing (Week 2, Days 1-3)

### 4.1 Webhook Service
- [ ] 4.1.1 Create `src/modules/payments/services/webhookService.ts`
  - `processWebhookEvent(event: Stripe.Event): Promise<void>`
  - Handler for `payment_intent.succeeded`:
    - Find Payment by stripePaymentIntentId
    - Update Payment status to SUCCEEDED
    - Update Booking status to CONFIRMED (when booking module exists)
    - Create ProcessedWebhookEvent record
  - Handler for `payment_intent.payment_failed`:
    - Update Payment status to FAILED
  - Handler for `charge.refunded`:
    - Create Payment record (type: REEMBOLSO)
    - Update original payment status to REFUNDED
  - Handler for `account.updated`:
    - Update ContractorProfile with account status
  - All handlers check idempotency first
- [ ] 4.1.2 Write tests
  - `src/modules/payments/__tests__/services/webhookService.test.ts`
  - TC-RF-007-01 through TC-RF-007-05: All event types
  - TC-RF-007-06: Idempotency with duplicate events
  - TC-RF-007-08: Stores event ID in database

### 4.2 Webhook API Endpoint
- [ ] 4.2.1 Create `app/api/webhooks/stripe/route.ts`
  - `POST` handler
  - Extract raw body and `stripe-signature` header
  - Verify signature with `stripe.webhooks.constructEvent(body, signature, secret)`
  - Check idempotency (has event been processed?)
  - Call `webhookService.processWebhookEvent(event)`
  - Return 200 OK on success (even for duplicates)
  - Return 400 Bad Request for invalid signature
  - Return 500 Internal Server Error for processing errors (Stripe retries)
  - Log all events and errors
- [ ] 4.2.2 Write tests
  - `tests/integration/api/webhooks/stripe.test.ts`
  - TC-RF-007-07: Reject invalid signature
  - TC-RF-007-06: Handle duplicate events (idempotency)
  - TC-SEC-001-01: Signature verification prevents unauthorized calls
  - Use Stripe's test webhook signatures
  - **Verify: All webhook tests pass**

### 4.3 Performance Testing
- [ ] 4.3.1 Create `tests/performance/webhook-latency.k6.js`
  - Send webhook events with valid signatures
  - Measure P95 and P99 latency
  - TC-RF-007-09: Verify P95 ≤ 0.8s
  - **Verify: Performance requirements met**

## 5. Stripe Connect & Payouts (Week 2, Days 4-5)

### 5.1 Stripe Connect Service
- [ ] 5.1.1 Create `src/modules/contractors/services/stripeConnectService.ts`
  - `createConnectAccount(contractorId: string): Promise<{ accountId: string }>`
    - Create Stripe Connect Express account
    - Update ContractorProfile with stripeConnectAccountId
  - `createOnboardingLink(contractorId: string): Promise<{ url: string }>`
    - Generate Stripe account link for KYC
  - `getAccountStatus(accountId: string): Promise<{ chargesEnabled: boolean, payoutsEnabled: boolean }>`
- [ ] 5.1.2 Write tests
  - `tests/integration/payments/stripe-connect.test.ts`
  - TC-PAY-004-01 through TC-PAY-004-04
  - Use Stripe Test Mode

### 5.2 Payout Service
- [ ] 5.2.1 Create `src/modules/payments/services/payoutService.ts`
  - `createPayout(bookingId: string): Promise<Payment>`
    - Fetch booking and contractor
    - Verify contractor has Connect account
    - Calculate contractorPayoutAmount (85% of finalPrice)
    - Create Stripe Transfer to Connect account
    - Create Payment record (type: LIQUIDACION, status: SUCCEEDED)
    - Return Payment
- [ ] 5.2.2 Write tests
  - `src/modules/payments/__tests__/services/payoutService.test.ts`
  - TC-RF-010-01 through TC-RF-010-05
  - Mock Stripe Transfer API
  - `tests/integration/payments/payout-flow.test.ts` (with real Stripe)
  - **Verify: Payout amounts match BR-002 (85% of final price)**

## 6. Refund Service (Week 3, Days 1-2)

- [ ] 6.1 Create `src/modules/payments/services/refundService.ts`
  - `processRefund(bookingId: string, reason: string): Promise<Payment>`
    - Apply cancellation policy (BR-004) - TODO: define policy
    - Find original payment
    - Create Stripe Refund
    - Create Payment record (type: REEMBOLSO)
    - Update original payment status to REFUNDED
- [ ] 6.2 Write tests
  - `src/modules/payments/__tests__/services/refundService.test.ts`
  - TC-PAY-005-01 through TC-PAY-005-04
  - `tests/integration/payments/refund-flow.test.ts`

## 7. Validators (Week 3, Day 3)

- [ ] 7.1 Create `src/modules/payments/validators/index.ts`
  - Zod schemas for webhook events
  - Validation for payment creation inputs
  - Sanitization of metadata
- [ ] 7.2 Write tests
  - `src/modules/payments/__tests__/validators/index.test.ts`
  - TC-SEC-001-03: Metadata sanitization

## 8. Module Exports & Documentation (Week 3, Day 4)

- [ ] 8.1 Create `src/modules/payments/index.ts`
  - Export all public services
  - Export types
- [ ] 8.2 Update `src/modules/payments/README.md`
  - Remove TODOs
  - Add usage examples
  - Document API
  - Link to openspec

## 9. End-to-End Tests (Week 3, Day 5)

- [ ] 9.1 Create E2E tests
  - `tests/e2e/payments/complete-booking-flow.spec.ts`
    - TC-E2E-001-01: Create booking → checkout → pay → webhook → confirmed
  - `tests/e2e/payments/payout-flow.spec.ts`
    - TC-E2E-001-02: Complete booking → payout to contractor
  - `tests/e2e/payments/cancellation-refund-flow.spec.ts`
    - TC-E2E-001-03: Cancel booking → refund to client
  - Use Playwright or Cypress
  - **Verify: All E2E flows work end-to-end**

## 10. Coverage & Quality Checks (Week 4, Day 1)

- [ ] 10.1 Run full test suite
  - `npm run test -- src/modules/payments`
  - `npm run test -- tests/integration/payments`
  - `npm run test:coverage`
  - **Verify: Coverage ≥ 75% in payments module**
- [ ] 10.2 Fix any failing tests
- [ ] 10.3 Address coverage gaps (target: ≥ 75%)

## 11. Update Documentation (Week 4, Day 2)

- [ ] 11.1 Update `docs/md/STP-ReparaYa.md`
  - Add test execution results
  - Document any issues found and resolved
  - Add coverage report
  - Mark all TC-* test cases as executed
- [ ] 11.2 Update `.env.example`
  - Document `STRIPE_WEBHOOK_SECRET` requirement
  - Add instructions for obtaining webhook secret

## 12. Integration with Booking Module (Future - When Available)

- [ ] 12.1 Replace booking mocks with real booking service calls
- [ ] 12.2 Test complete reservation flow
- [ ] 12.3 Update integration tests

## 13. Code Review & CI/CD (Week 4, Day 3)

- [ ] 13.1 Create PR to `dev` branch
  - Title: `feat: implement Stripe payments module`
  - Description: Link to this proposal
  - Include all test results
- [ ] 13.2 Address CodeRabbit review comments
- [ ] 13.3 Verify CI/CD pipeline passes
  - Build succeeds
  - Linter passes
  - All tests pass
  - No type errors

## 14. Completion Checklist (Before Archive)

- [ ] 14.1 ✅ All 50+ test cases documented in STP
- [ ] 14.2 ✅ All test cases executed and passing
- [ ] 14.3 ✅ Code coverage ≥ 75% in payments module
- [ ] 14.4 ✅ Webhook idempotency verified
- [ ] 14.5 ✅ Performance: Webhook P95 ≤ 0.8s
- [ ] 14.6 ✅ Security: Signature verification working
- [ ] 14.7 ✅ Commission calculations match business rules exactly
- [ ] 14.8 ✅ Stripe Test Mode: All flows tested
- [ ] 14.9 ✅ CI/CD pipeline green
- [ ] 14.10 ✅ PR merged to dev
- [ ] 14.11 ✅ STP updated with execution results
- [ ] 14.12 ✅ No critical or high-severity issues open

---

## Notes

**Test-Driven Development Approach:**
- Write test first for each function
- Implement function to pass test
- Refactor if needed
- Move to next test

**Stripe Test Mode:**
- Always use test keys during development
- Test cards: 4242 4242 4242 4242 (success), 4000 0000 0000 9995 (decline)
- Webhook testing: Use Stripe CLI or test signatures

**Booking Module Dependency:**
- Some functions need booking data
- Mock booking service for now
- Update when booking module is implemented
- Plan integration tests for later

**Business Rules - Critical:**
- BR-001: Final price = Base × 1.10 (10% markup)
- BR-002: Commission = Final × 0.15 (15%)
- BR-003: Advance = Final × 0.30 (30%), Settlement = Final × 0.70 (70%)
- Contractor receives: Final - Commission = 85% of final price

**Definition of Done:**
Cannot mark this change as complete until ALL 14 completion checklist items are ✅
