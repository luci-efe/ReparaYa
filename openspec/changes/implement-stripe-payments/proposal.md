# Change: Implement Stripe Payments Module

## Why

The payments module (`src/modules/payments/`) currently has only a README placeholder. We need to implement the complete Stripe integration for processing payments (anticipos, liquidaciones, reembolsos) and managing webhooks with idempotency according to `openspec/specs/payments-webhooks/spec.md`.

This is critical for the MVP's end-to-end flow: búsqueda → reserva → **pago** → ejecución → calificación.

## What Changes

- ✅ **Stripe Client**: Initialize Stripe SDK in test mode
- ✅ **Payment Repository**: CRUD operations for Payment and ProcessedWebhookEvent entities
- ✅ **Commission Service**: Calculate amounts per BR-001, BR-002, BR-003
  - Precio final (Pf) = Precio base (Pc) × 1.10 (10% markup)
  - Anticipo = 30% × Pf
  - Liquidación = 70% × Pf
  - Comisión plataforma = 15% × Pf
  - Pago a contratista (Ic) = Pf - 15%
- ✅ **Checkout Service**: Create Stripe Checkout Sessions for advance payments
- ✅ **Webhook Service**: Process Stripe webhooks with idempotency and signature verification
- ✅ **Payout Service**: Create Stripe Transfers to contractor Connect accounts
- ✅ **Refund Service**: Process refunds according to cancellation policy (BR-004)
- ✅ **API Endpoint**: `/api/webhooks/stripe` to receive Stripe events
- ✅ **Stripe Connect Integration**: Onboard contractors to Express accounts
- ✅ **Comprehensive Tests**: Unit, integration, and E2E tests with ≥75% coverage

## Impact

**Affected specs:**
- `specs/payments-webhooks/spec.md` - Implementation of existing spec (no changes to spec itself)

**Affected code:**
- `apps/web/src/modules/payments/` - Complete module implementation
  - `services/stripeService.ts` (NEW)
  - `services/checkoutService.ts` (NEW)
  - `services/webhookService.ts` (NEW)
  - `services/payoutService.ts` (NEW)
  - `services/commissionService.ts` (NEW)
  - `services/refundService.ts` (NEW)
  - `repositories/paymentRepository.ts` (NEW)
  - `repositories/webhookEventRepository.ts` (NEW)
  - `types/index.ts` (NEW)
  - `validators/index.ts` (NEW)
  - `__tests__/*` (NEW - comprehensive test suite)
- `apps/web/app/api/webhooks/stripe/route.ts` (NEW)
- `apps/web/.env.example` - Document `STRIPE_WEBHOOK_SECRET` requirement
- `docs/md/STP-ReparaYa.md` - Add test cases for payments module

**Dependencies:**
- Stripe SDK already installed (`stripe@^16.0.0`)
- Requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` env vars
- Depends on Booking module (future implementation) for reservation data
- Depends on Contractor module (already implemented) for Stripe Connect account IDs

**Breaking changes:**
- None (new functionality)

## Testing Plan

### Test Cases to Add to STP:

| ID | Description | Type | Priority | Requirement |
|----|-------------|------|----------|-------------|
| **Stripe Client & Configuration** |
| TC-PAY-001-01 | Stripe client initializes with valid credentials | Unit | High | Infrastructure |
| TC-PAY-001-02 | Stripe client initialization fails with invalid key | Unit | High | Infrastructure |
| **Commission Calculations (BR-001, BR-002, BR-003)** |
| TC-BR-001-01 | Calculate final price with 10% markup | Unit | High | BR-001 |
| TC-BR-002-01 | Calculate platform commission (15% of final price) | Unit | High | BR-002 |
| TC-BR-003-01 | Calculate advance payment (30% of final price) | Unit | High | BR-003 |
| TC-BR-003-02 | Calculate settlement amount (70% of final price) | Unit | High | BR-003 |
| TC-BR-002-02 | Calculate contractor payout (final price - 15%) | Unit | High | BR-002 |
| TC-PAY-002-01 | Full booking amount calculation flow | Unit | High | BR-001, BR-002, BR-003 |
| **Checkout Service** |
| TC-RF-005-01 | Create checkout session for booking advance payment | Integration | High | RF-005 |
| TC-RF-005-02 | Checkout session includes correct metadata (booking_id, service_id, client_id) | Integration | High | RF-005 |
| TC-RF-005-03 | Checkout session amount matches calculated advance (30%) | Integration | High | RF-005, BR-003 |
| TC-RF-005-04 | Checkout session fails for invalid booking ID | Integration | High | RF-005 |
| **Webhook Processing (RF-007)** |
| TC-RF-007-01 | Webhook processes payment_intent.succeeded event | Integration | High | RF-007 |
| TC-RF-007-02 | Webhook updates booking status to CONFIRMED after payment | Integration | High | RF-007 |
| TC-RF-007-03 | Webhook processes payment_intent.payment_failed event | Integration | High | RF-007 |
| TC-RF-007-04 | Webhook processes charge.refunded event | Integration | High | RF-007 |
| TC-RF-007-05 | Webhook processes account.updated for Connect accounts | Integration | High | RF-007 |
| TC-RF-007-06 | Webhook idempotency - duplicate event ignored | Integration | High | RF-007 |
| TC-RF-007-07 | Webhook rejects event with invalid signature | Integration | High | RF-007 |
| TC-RF-007-08 | Webhook stores event ID in ProcessedWebhookEvent table | Integration | High | RF-007 |
| TC-RF-007-09 | Webhook performance P95 ≤ 0.8s | Performance | High | RNF-3.5.1 |
| **Payment Repository** |
| TC-PAY-003-01 | Create payment record with ANTICIPO type | Unit | High | Infrastructure |
| TC-PAY-003-02 | Create payment record with LIQUIDACION type | Unit | High | Infrastructure |
| TC-PAY-003-03 | Create payment record with REEMBOLSO type | Unit | High | Infrastructure |
| TC-PAY-003-04 | Find payment by Stripe Payment Intent ID | Unit | High | Infrastructure |
| TC-PAY-003-05 | Find all payments for a booking | Unit | High | Infrastructure |
| TC-PAY-003-06 | Update payment status to SUCCEEDED | Unit | High | Infrastructure |
| TC-PAY-003-07 | Update payment status to FAILED | Unit | High | Infrastructure |
| **Payout Service (RF-010)** |
| TC-RF-010-01 | Create payout to contractor when booking COMPLETED | Integration | High | RF-010 |
| TC-RF-010-02 | Payout amount matches contractor payout (85% of final) | Integration | High | RF-010, BR-002 |
| TC-RF-010-03 | Payout includes correct Stripe Transfer ID | Integration | High | RF-010 |
| TC-RF-010-04 | Payout fails gracefully if contractor has no Connect account | Integration | High | RF-010 |
| TC-RF-010-05 | Payout creates Payment record with LIQUIDACION type | Integration | High | RF-010 |
| **Stripe Connect** |
| TC-PAY-004-01 | Create Stripe Connect Express account for contractor | Integration | Medium | Infrastructure |
| TC-PAY-004-02 | Generate onboarding link for contractor KYC | Integration | Medium | Infrastructure |
| TC-PAY-004-03 | Verify account status (charges_enabled, payouts_enabled) | Integration | Medium | Infrastructure |
| TC-PAY-004-04 | Update ContractorProfile with stripeConnectAccountId | Integration | Medium | Infrastructure |
| **Refund Service** |
| TC-PAY-005-01 | Process full refund for cancelled booking | Integration | Medium | BR-004 |
| TC-PAY-005-02 | Process partial refund according to cancellation policy | Integration | Medium | BR-004 |
| TC-PAY-005-03 | Refund creates Payment record with REEMBOLSO type | Integration | Medium | BR-004 |
| TC-PAY-005-04 | Refund updates original payment status to REFUNDED | Integration | Medium | BR-004 |
| **Security** |
| TC-SEC-001-01 | Webhook signature verification prevents unauthorized calls | Integration | High | Security |
| TC-SEC-001-02 | Stripe secret keys not exposed in logs or responses | Integration | High | Security |
| TC-SEC-001-03 | Payment metadata sanitized before storage | Unit | High | Security |
| **End-to-End Flow** |
| TC-E2E-001-01 | Complete flow: create booking → checkout → webhook → booking confirmed | E2E | High | RF-005, RF-007 |
| TC-E2E-001-02 | Complete flow: booking completed → payout to contractor | E2E | High | RF-010 |
| TC-E2E-001-03 | Complete flow: booking cancelled → refund to client | E2E | Medium | BR-004 |

**Total Test Cases:** 50+

### Acceptance Criteria:

- ✅ Code coverage ≥ 75% in `src/modules/payments/`
- ✅ All 50+ test cases pass (0 failures)
- ✅ Webhook idempotency tested with duplicate events
- ✅ Commission calculations match business rules exactly (BR-001, BR-002, BR-003)
- ✅ Stripe Test Mode: All integration tests use test keys and test cards
- ✅ Performance: Webhook P95 ≤ 0.8s (per RNF-3.5.1)
- ✅ Security: Webhook signature verification blocks invalid requests
- ✅ CI/CD pipeline passes without errors
- ✅ STP updated with test case documentation and results

### Test Implementation Strategy:

#### Test Files to Create:

**Unit Tests:**
- `src/modules/payments/__tests__/services/stripeService.test.ts`
- `src/modules/payments/__tests__/services/commissionService.test.ts`
- `src/modules/payments/__tests__/services/checkoutService.test.ts`
- `src/modules/payments/__tests__/services/webhookService.test.ts`
- `src/modules/payments/__tests__/services/payoutService.test.ts`
- `src/modules/payments/__tests__/services/refundService.test.ts`
- `src/modules/payments/__tests__/repositories/paymentRepository.test.ts`
- `src/modules/payments/__tests__/repositories/webhookEventRepository.test.ts`
- `src/modules/payments/__tests__/validators/index.test.ts`

**Integration Tests:**
- `tests/integration/api/webhooks/stripe.test.ts`
- `tests/integration/payments/checkout-flow.test.ts`
- `tests/integration/payments/payout-flow.test.ts`
- `tests/integration/payments/refund-flow.test.ts`
- `tests/integration/payments/stripe-connect.test.ts`

**E2E Tests:**
- `tests/e2e/payments/complete-booking-flow.spec.ts`
- `tests/e2e/payments/cancellation-refund-flow.spec.ts`

**Performance Tests:**
- `tests/performance/webhook-latency.k6.js`

#### Mocks and Fixtures:

**Mocks:**
- Mock Stripe SDK for unit tests (`jest.mock('stripe')`)
- Mock Prisma client for repository tests
- Mock environment variables for configuration tests

**Fixtures:**
- Sample Stripe Payment Intent objects
- Sample Stripe webhook event payloads (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `account.updated`)
- Sample booking data with calculated amounts
- Sample contractor with Stripe Connect account
- Test webhook signatures (valid and invalid)

**Test Data:**
- Base price scenarios: $100, $1000, $50.50 (test decimal handling)
- Expected calculations:
  - Base $100 → Final $110, Anticipo $33, Liquidación $77, Comisión $16.50, Pago Contratista $93.50

#### External Integrations:

**Stripe:**
- Use Stripe Test Mode for all integration tests
- Test keys: `sk_test_*`, `pk_test_*`
- Test cards:
  - Success: `4242 4242 4242 4242`
  - Decline: `4000 0000 0000 9995`
  - 3D Secure required: `4000 0027 6000 3184`
- Stripe CLI for local webhook testing: `stripe listen --forward-to http://localhost:3000/api/webhooks/stripe`

**Database:**
- Use test database with Prisma
- Seed test data before integration tests
- Clean up after each test suite

**Environment:**
- `.env.test` with test Stripe keys
- Mock `STRIPE_WEBHOOK_SECRET` for webhook signature tests

#### Test Execution:

```bash
# Unit tests only
npm run test -- src/modules/payments

# Integration tests
npm run test -- tests/integration/payments

# All tests with coverage
npm run test:coverage

# Performance tests
cd tests/performance && k6 run webhook-latency.k6.js
```

### Coverage Targets:

| Component | Target Coverage | Critical Paths |
|-----------|----------------|----------------|
| `commissionService.ts` | 100% | All calculation functions |
| `webhookService.ts` | 95% | Idempotency, signature verification |
| `checkoutService.ts` | 90% | Payment Intent creation |
| `payoutService.ts` | 90% | Transfer creation |
| `paymentRepository.ts` | 85% | All CRUD operations |
| **Overall Module** | **≥75%** | All public APIs |

### Test Execution Order:

1. **Phase 1 - Foundation** (Can run in parallel)
   - Unit tests for `commissionService` (pure logic)
   - Unit tests for `stripeService` (client init)
   - Unit tests for repositories

2. **Phase 2 - Services** (After Phase 1)
   - Unit tests for `checkoutService`
   - Unit tests for `webhookService`
   - Unit tests for `payoutService`

3. **Phase 3 - Integration** (After Phase 2)
   - Integration tests for webhook endpoint
   - Integration tests for checkout flow
   - Integration tests for Stripe Connect

4. **Phase 4 - E2E** (After Phase 3)
   - E2E complete booking flow
   - E2E cancellation/refund flow

5. **Phase 5 - Performance** (Final)
   - k6 webhook latency tests

### Risk Mitigation:

**Risks:**
- Stripe API rate limits during testing → Use mocks for unit tests, real API only for integration
- Webhook signature validation complexity → Use Stripe's test signatures and examples
- Race conditions in idempotency checks → Use database transactions and unique constraints
- Decimal precision in money calculations → Use Prisma's `Decimal` type and test edge cases

**Mitigation:**
- All money calculations tested with multiple decimal values
- Idempotency tested with concurrent webhook deliveries
- Stripe Test Mode prevents real charges
- Comprehensive error handling tests for all failure scenarios

---

## Dependencies

**Prerequisites before implementation:**
1. ✅ Prisma schema already has `Payment` and `ProcessedWebhookEvent` models
2. ✅ Stripe SDK already installed (`stripe@^16.0.0`)
3. ✅ Environment variables configured (`.env.local` has Stripe keys)
4. ⚠️ Need valid `STRIPE_WEBHOOK_SECRET` (obtain via Stripe CLI or Dashboard)
5. ⚠️ Booking module not yet implemented (can mock for now, integrate later)

**External Dependencies:**
- Stripe API (test mode)
- PostgreSQL database (Supabase)
- Clerk (for user authentication in API routes)

**Inter-module Dependencies:**
- `auth` module: For `requireAuth()` in webhook endpoint
- `contractors` module: For accessing `stripeConnectAccountId`
- `booking` module: Will integrate when implemented (mock for now)

---

## Implementation Notes

**Stripe Test Mode:**
- All implementation uses Stripe test keys
- No real charges or payouts during MVP development
- Test cards and test webhook events only

**Business Rule Precision:**
- BR-001: Markup exactly 10%
- BR-002: Commission exactly 15%
- BR-003: Advance exactly 30%, Settlement exactly 70%
- Use Prisma `Decimal` type to avoid floating-point errors

**Idempotency Strategy:**
- Store Stripe event ID in `ProcessedWebhookEvent` table
- Check existence before processing
- Use database unique constraint as safety net
- Return 200 OK even for duplicate events (per Stripe best practices)

**Security:**
- Always verify webhook signatures using `stripe.webhooks.constructEvent`
- Never log full Stripe objects (may contain sensitive data)
- Store only Stripe IDs, never card details
- Use environment variables for all secrets

**Error Handling:**
- Webhooks return 500 for processing errors (Stripe retries)
- Webhooks return 400 for invalid signatures (no retry)
- Log all errors with context (event type, booking ID, etc.)
- Create audit trail for all payment operations

---

## Next Steps After Approval

1. Update `docs/md/STP-ReparaYa.md` with all 50+ test cases
2. Implement `commissionService.ts` first (pure logic, easiest to test)
3. Implement repositories (database layer)
4. Implement Stripe client and services
5. Implement webhook endpoint
6. Write comprehensive tests in parallel with implementation
7. Verify coverage ≥ 75%
8. Submit PR to `dev` branch
9. Archive change only when all tests pass and CI/CD is green
