/**
 * Refund Service Integration Tests
 * REAL tests that hit Stripe API and database
 */

import { Decimal } from '@prisma/client/runtime/library';
import { RefundService } from '../../services/refundService';
import { stripe } from '../../services/stripeService';
import {
  createTestBooking,
  cleanupTestData,
  disconnectDatabase,
  prisma,
} from '../helpers/testDatabase';

describe('RefundService - Real Integration Tests', () => {
  let refundService: RefundService;
  const testIds: { bookingIds: string[]; paymentIds: string[]; userIds: string[] } = {
    bookingIds: [],
    paymentIds: [],
    userIds: [],
  };

  beforeAll(() => {
    refundService = new RefundService(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(testIds);
    await disconnectDatabase();
  });

  /**
   * Helper: Create a successful payment with REAL Stripe PaymentIntent
   */
  async function createSuccessfulPayment(bookingId: string, amount: Decimal) {
    // Create REAL PaymentIntent in Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount.toNumber() * 100),
      currency: 'mxn',
      payment_method: 'pm_card_visa', // Test payment method
      confirm: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: {
        booking_id: bookingId,
      },
    });

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        type: 'ANTICIPO',
        amount,
        currency: 'mxn',
        status: 'SUCCEEDED',
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    return { payment, paymentIntent };
  }

  describe('TC-PAY-005-01: Process full refund', () => {
    it('should process REAL full refund via Stripe API', async () => {
      // 1. Create real booking
      const booking = await createTestBooking({ status: 'CONFIRMED' });
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      // 2. Create successful payment with REAL Stripe PaymentIntent
      const { payment } = await createSuccessfulPayment(
        booking.id,
        new Decimal(33)
      );
      testIds.paymentIds.push(payment.id);

      // 3. Process REAL refund
      const result = await refundService.processRefund({
        bookingId: booking.id,
      });

      testIds.paymentIds.push(result.payment.id);

      // 4. Verify refund was created in Stripe
      expect(result.stripeRefundId).toMatch(/^re_/);
      expect(result.amount.toNumber()).toBe(33);

      const stripeRefund = await stripe.refunds.retrieve(result.stripeRefundId);
      expect(stripeRefund.amount).toBe(3300); // $33 in cents
      expect(stripeRefund.status).toBe('succeeded');

      // 5. Verify original payment marked as REFUNDED in database
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });
      expect(updatedPayment!.status).toBe('REFUNDED');

      // 6. Verify refund payment record created
      expect(result.payment.type).toBe('REEMBOLSO');
      expect(result.payment.status).toBe('SUCCEEDED');

      console.log(`✅ Real refund created: ${result.stripeRefundId}`);
      console.log(`   View in dashboard: https://dashboard.stripe.com/test/refunds`);
    }, 60000); // 60s timeout
  });

  describe('TC-PAY-005-02: Process partial refund', () => {
    it('should process REAL partial refund', async () => {
      const booking = await createTestBooking({ status: 'CONFIRMED' });
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      const { payment } = await createSuccessfulPayment(
        booking.id,
        new Decimal(33)
      );
      testIds.paymentIds.push(payment.id);

      // Refund only half
      const result = await refundService.processRefund({
        bookingId: booking.id,
        amount: new Decimal(16.50),
      });

      testIds.paymentIds.push(result.payment.id);

      // Verify partial refund amount
      expect(result.amount.toNumber()).toBe(16.50);

      const stripeRefund = await stripe.refunds.retrieve(result.stripeRefundId);
      expect(stripeRefund.amount).toBe(1650); // $16.50 in cents

      console.log(`✅ Partial refund created: $16.50`);
    }, 60000);
  });

  describe('TC-PAY-005-03: Refund creates REEMBOLSO payment record', () => {
    it('should create payment record with type REEMBOLSO in database', async () => {
      const booking = await createTestBooking({ status: 'CONFIRMED' });
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      const { payment } = await createSuccessfulPayment(
        booking.id,
        new Decimal(33)
      );
      testIds.paymentIds.push(payment.id);

      const result = await refundService.processRefund({
        bookingId: booking.id,
        reason: 'Customer requested cancellation',
      });

      testIds.paymentIds.push(result.payment.id);

      // Verify REEMBOLSO record in database
      const refundPayment = await prisma.payment.findUnique({
        where: { id: result.payment.id },
      });

      expect(refundPayment).toBeDefined();
      expect(refundPayment!.type).toBe('REEMBOLSO');
      expect(refundPayment!.status).toBe('SUCCEEDED');
      expect(refundPayment!.metadata).toMatchObject({
        originalPaymentId: payment.id,
        refundId: result.stripeRefundId,
        reason: 'Customer requested cancellation',
      });

      console.log(`✅ REEMBOLSO payment record created in database`);
    }, 60000);
  });

  describe('Error handling', () => {
    it('should throw error if no payment to refund', async () => {
      const booking = await createTestBooking({ status: 'CONFIRMED' });
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      // No payment created - should fail
      await expect(
        refundService.processRefund({ bookingId: booking.id })
      ).rejects.toThrow();
    });

    it('should throw error for non-existent booking', async () => {
      await expect(
        refundService.processRefund({ bookingId: 'non-existent' })
      ).rejects.toThrow();
    });
  });
});
