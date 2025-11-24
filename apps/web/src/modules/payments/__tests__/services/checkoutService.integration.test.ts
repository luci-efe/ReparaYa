/**
 * Checkout Service Integration Tests
 * REAL tests that hit Stripe API and database
 */

import { CheckoutService } from '../../services/checkoutService';
import { stripe } from '../../services/stripeService';
import {
  createTestBooking,
  cleanupTestData,
  prisma,
} from '../helpers/testDatabase';

describe('CheckoutService - Real Integration Tests', () => {
  let checkoutService: CheckoutService;
  const testIds: { bookingIds: string[]; paymentIds: string[]; userIds: string[] } = {
    bookingIds: [],
    paymentIds: [],
    userIds: [],
  };

  beforeAll(() => {
    checkoutService = new CheckoutService(prisma);
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  afterEach(async () => {
    // Clean up Stripe sessions
    // Note: Stripe test sessions auto-expire, but we track them for reference
  });

  afterAll(async () => {
    // Clean up all test data from database
    await cleanupTestData(testIds);
  });

  describe('TC-RF-005-01: Create checkout session for booking', () => {
    it('should create REAL Stripe Checkout Session', async () => {
      // Create real booking in database
      const booking = await createTestBooking();
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      // Create REAL checkout session via Stripe API
      const result = await checkoutService.createCheckoutSession(booking.id);

      // Verify we got a real Stripe session
      expect(result.sessionId).toMatch(/^cs_test_/);
      expect(result.checkoutUrl).toContain('https://checkout.stripe.com');

      // Verify payment record was created in database
      expect(result.payment).toBeDefined();
      expect(result.payment.type).toBe('ANTICIPO');
      expect(result.payment.status).toBe('PENDING');
      expect(result.payment.stripeCheckoutSessionId).toBe(result.sessionId);

      testIds.paymentIds.push(result.payment.id);

      // Verify session exists in Stripe dashboard
      const stripeSession = await stripe.checkout.sessions.retrieve(result.sessionId);
      expect(stripeSession.id).toBe(result.sessionId);
      expect(stripeSession.amount_total).toBe(3300); // $33 in cents

      console.log(`✅ Real Stripe session created: ${result.sessionId}`);
      console.log(`   View in dashboard: https://dashboard.stripe.com/test/payments`);
    }, 30000); // 30s timeout for real API call

    it('should throw error for non-existent booking', async () => {
      await expect(
        checkoutService.createCheckoutSession('non-existent-booking-id')
      ).rejects.toThrow();
    });
  });

  describe('TC-RF-005-02: Session includes correct metadata', () => {
    it('should include booking_id, service_id, client_id in Stripe metadata', async () => {
      const booking = await createTestBooking();
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      const result = await checkoutService.createCheckoutSession(booking.id);
      testIds.paymentIds.push(result.payment.id);

      // Retrieve session from Stripe and verify metadata
      const stripeSession = await stripe.checkout.sessions.retrieve(result.sessionId);

      expect(stripeSession.metadata).toMatchObject({
        booking_id: booking.id,
        service_id: booking.serviceId,
        client_id: booking.clientId,
      });

      console.log(`✅ Metadata verified in Stripe session`);
    }, 30000);
  });

  describe('TC-RF-005-03: Amount matches advance payment (30%)', () => {
    it('should charge exactly 30% of final price', async () => {
      const booking = await createTestBooking({
        finalPrice: 110,
        anticipoAmount: 33,
      });
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      const result = await checkoutService.createCheckoutSession(booking.id);
      testIds.paymentIds.push(result.payment.id);

      // Verify amount in Stripe
      const stripeSession = await stripe.checkout.sessions.retrieve(result.sessionId);
      expect(stripeSession.amount_total).toBe(3300); // $33 in cents
      expect(stripeSession.currency).toBe('mxn');

      console.log(`✅ Correct amount ($33) charged in Stripe`);
    }, 30000);
  });

  describe('TC-RF-005-05: Session includes success and cancel URLs', () => {
    it('should set correct success_url and cancel_url', async () => {
      const booking = await createTestBooking();
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      const result = await checkoutService.createCheckoutSession(booking.id);
      testIds.paymentIds.push(result.payment.id);

      // Verify URLs in Stripe session
      const stripeSession = await stripe.checkout.sessions.retrieve(result.sessionId);

      expect(stripeSession.success_url).toContain(
        `/bookings/${booking.id}/success?session_id={CHECKOUT_SESSION_ID}`
      );
      expect(stripeSession.cancel_url).toContain(
        `/bookings/${booking.id}/cancelled`
      );

      console.log(`✅ URLs configured correctly in Stripe`);
    }, 30000);
  });

  describe('TC-RF-005-06: Payment record created with PENDING status', () => {
    it('should create payment record in database with PENDING status', async () => {
      const booking = await createTestBooking();
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      const result = await checkoutService.createCheckoutSession(booking.id);
      testIds.paymentIds.push(result.payment.id);

      // Verify payment in database
      const paymentInDb = await prisma.payment.findUnique({
        where: { id: result.payment.id },
      });

      expect(paymentInDb).toBeDefined();
      expect(paymentInDb!.status).toBe('PENDING');
      expect(paymentInDb!.type).toBe('ANTICIPO');
      expect(paymentInDb!.bookingId).toBe(booking.id);
      expect(paymentInDb!.stripeCheckoutSessionId).toBe(result.sessionId);

      console.log(`✅ Payment record created in database`);
    }, 30000);
  });
});
