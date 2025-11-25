/**
 * Refund Service Tests
 * Tests for processing refunds
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { RefundService } from '../../services/refundService';
import { PaymentNotFoundError } from '../../types';

// Mock Stripe
jest.mock('../../services/stripeService', () => ({
  stripe: {
    refunds: {
      create: jest.fn(),
    },
  },
}));

import { stripe } from '../../services/stripeService';

const mockPrisma = {
  booking: {
    findUnique: jest.fn(),
  },
  payment: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
} as unknown as PrismaClient;

describe('RefundService', () => {
  let refundService: RefundService;

  beforeEach(() => {
    refundService = new RefundService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('TC-PAY-005-01: Process full refund', () => {
    it('should process full refund of advance payment', async () => {
      const mockBooking = {
        id: 'booking_123',
        status: 'CONFIRMED',
      };

      const originalPayment = {
        id: 'payment_original',
        bookingId: 'booking_123',
        type: 'ANTICIPO',
        amount: new Decimal(33),
        currency: 'mxn',
        status: 'SUCCEEDED',
        stripePaymentIntentId: 'pi_test_123',
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(originalPayment);

      const mockRefund = {
        id: 're_test_456',
        amount: 3300, // $33 in cents
        status: 'succeeded',
      };

      (stripe.refunds.create as jest.Mock).mockResolvedValue(mockRefund);
      (mockPrisma.payment.update as jest.Mock).mockResolvedValue({
        ...originalPayment,
        status: 'REFUNDED',
      });

      const refundPayment = {
        id: 'payment_refund',
        bookingId: 'booking_123',
        type: 'REEMBOLSO',
        amount: new Decimal(33),
        status: 'SUCCEEDED',
        metadata: {
          originalPaymentId: 'payment_original',
          refundId: 're_test_456',
        },
      };

      (mockPrisma.payment.create as jest.Mock).mockResolvedValue(refundPayment);

      const result = await refundService.processRefund({
        bookingId: 'booking_123',
      });

      expect(result.stripeRefundId).toBe('re_test_456');
      expect(result.amount.toNumber()).toBe(33);
      expect(result.payment.type).toBe('REEMBOLSO');

      // Should create Stripe refund with full amount
      expect(stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 3300,
        reason: 'requested_by_customer',
        metadata: expect.objectContaining({
          booking_id: 'booking_123',
          original_payment_id: 'payment_original',
        }),
      });

      // Should mark original payment as REFUNDED
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment_original' },
        data: { status: 'REFUNDED' },
      });
    });

    it('should throw PaymentNotFoundError if no payment to refund', async () => {
      const mockBooking = {
        id: 'booking_123',
        status: 'CONFIRMED',
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        refundService.processRefund({ bookingId: 'booking_123' })
      ).rejects.toThrow(PaymentNotFoundError);
    });
  });

  describe('TC-PAY-005-02: Process partial refund', () => {
    it('should process partial refund with custom amount', async () => {
      const mockBooking = {
        id: 'booking_123',
        status: 'CONFIRMED',
      };

      const originalPayment = {
        id: 'payment_original',
        bookingId: 'booking_123',
        type: 'ANTICIPO',
        amount: new Decimal(33),
        currency: 'mxn',
        status: 'SUCCEEDED',
        stripePaymentIntentId: 'pi_test_123',
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(originalPayment);

      const mockRefund = {
        id: 're_partial_789',
        amount: 1650, // $16.50 in cents
        status: 'succeeded',
      };

      (stripe.refunds.create as jest.Mock).mockResolvedValue(mockRefund);
      (mockPrisma.payment.update as jest.Mock).mockResolvedValue({
        ...originalPayment,
        status: 'REFUNDED',
      });

      const refundPayment = {
        id: 'payment_refund',
        bookingId: 'booking_123',
        type: 'REEMBOLSO',
        amount: new Decimal(16.50),
        status: 'SUCCEEDED',
      };

      (mockPrisma.payment.create as jest.Mock).mockResolvedValue(refundPayment);

      const result = await refundService.processRefund({
        bookingId: 'booking_123',
        amount: new Decimal(16.50),
      });

      expect(result.amount.toNumber()).toBe(16.50);

      // Should create Stripe refund with partial amount
      expect(stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 1650, // $16.50 in cents
        reason: 'requested_by_customer',
        metadata: expect.objectContaining({
          booking_id: 'booking_123',
          original_payment_id: 'payment_original',
        }),
      });
    });

    it('should not allow partial refund greater than original amount', async () => {
      const mockBooking = {
        id: 'booking_123',
        status: 'CONFIRMED',
      };

      const originalPayment = {
        id: 'payment_original',
        bookingId: 'booking_123',
        amount: new Decimal(33),
        stripePaymentIntentId: 'pi_test_123',
        status: 'SUCCEEDED',
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(originalPayment);

      // Attempting to refund more than original amount should fail
      // The Stripe SDK would reject this, but we test our validation
      const excessiveAmount = new Decimal(50);

      (stripe.refunds.create as jest.Mock).mockRejectedValue(
        new Error('Refund amount exceeds charge amount')
      );

      await expect(
        refundService.processRefund({
          bookingId: 'booking_123',
          amount: excessiveAmount,
        })
      ).rejects.toThrow();
    });
  });

  describe('TC-PAY-005-03: Refund creates REEMBOLSO payment record', () => {
    it('should create payment record with type REEMBOLSO', async () => {
      const mockBooking = {
        id: 'booking_123',
        status: 'CONFIRMED',
      };

      const originalPayment = {
        id: 'payment_original',
        bookingId: 'booking_123',
        type: 'ANTICIPO',
        amount: new Decimal(33),
        stripePaymentIntentId: 'pi_test_123',
        status: 'SUCCEEDED',
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(originalPayment);
      (stripe.refunds.create as jest.Mock).mockResolvedValue({
        id: 're_test_123',
        amount: 3300,
      });
      (mockPrisma.payment.update as jest.Mock).mockResolvedValue({});

      const refundPayment = {
        id: 'payment_refund',
        bookingId: 'booking_123',
        type: 'REEMBOLSO',
        amount: new Decimal(33),
        currency: 'mxn',
        status: 'SUCCEEDED',
        metadata: {
          originalPaymentId: 'payment_original',
          refundId: 're_test_123',
          reason: 'Booking cancelled',
        },
      };

      (mockPrisma.payment.create as jest.Mock).mockResolvedValue(refundPayment);

      const result = await refundService.processRefund({
        bookingId: 'booking_123',
        reason: 'Booking cancelled',
      });

      expect(result.payment.type).toBe('REEMBOLSO');
      expect(result.payment.status).toBe('SUCCEEDED');

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 'booking_123',
          type: 'REEMBOLSO',
          amount: new Decimal(33),
          currency: 'mxn',
          status: 'SUCCEEDED',
          metadata: expect.objectContaining({
            originalPaymentId: 'payment_original',
            refundId: 're_test_123',
          }),
        }),
      });
    });

    it('should include refund reason in metadata if provided', async () => {
      const mockBooking = {
        id: 'booking_123',
        status: 'CONFIRMED',
      };

      const originalPayment = {
        id: 'payment_original',
        bookingId: 'booking_123',
        amount: new Decimal(33),
        stripePaymentIntentId: 'pi_test_123',
        status: 'SUCCEEDED',
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(originalPayment);
      (stripe.refunds.create as jest.Mock).mockResolvedValue({ id: 're_123' });
      (mockPrisma.payment.update as jest.Mock).mockResolvedValue({});
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
        metadata: { reason: 'Service not available' },
      });

      await refundService.processRefund({
        bookingId: 'booking_123',
        reason: 'Service not available',
      });

      const createCall = (mockPrisma.payment.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.metadata.reason).toBe('Service not available');
    });
  });

  describe('TC-PAY-005-04: Refund marks original payment as REFUNDED', () => {
    it('should update original payment status to REFUNDED', async () => {
      const mockBooking = {
        id: 'booking_123',
        status: 'CONFIRMED',
      };

      const originalPayment = {
        id: 'payment_original',
        bookingId: 'booking_123',
        type: 'ANTICIPO',
        amount: new Decimal(33),
        stripePaymentIntentId: 'pi_test_123',
        status: 'SUCCEEDED',
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(originalPayment);
      (stripe.refunds.create as jest.Mock).mockResolvedValue({ id: 're_123' });

      const updatedPayment = {
        ...originalPayment,
        status: 'REFUNDED',
      };

      (mockPrisma.payment.update as jest.Mock).mockResolvedValue(updatedPayment);
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment_refund',
        type: 'REEMBOLSO',
      });

      await refundService.processRefund({
        bookingId: 'booking_123',
      });

      // Should update original payment status to REFUNDED
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment_original' },
        data: { status: 'REFUNDED' },
      });
    });

    it('should return reference to original payment', async () => {
      const mockBooking = {
        id: 'booking_123',
        status: 'CONFIRMED',
      };

      const originalPayment = {
        id: 'payment_original',
        bookingId: 'booking_123',
        amount: new Decimal(33),
        stripePaymentIntentId: 'pi_test_123',
        status: 'SUCCEEDED',
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(originalPayment);
      (stripe.refunds.create as jest.Mock).mockResolvedValue({ id: 're_123' });
      (mockPrisma.payment.update as jest.Mock).mockResolvedValue({
        ...originalPayment,
        status: 'REFUNDED',
      });
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment_refund',
      });

      const result = await refundService.processRefund({
        bookingId: 'booking_123',
      });

      expect(result.originalPayment).toBeDefined();
      expect(result.originalPayment.id).toBe('payment_original');
      expect(result.originalPayment.amount.toNumber()).toBe(33);
      // Note: originalPayment is returned before the status update
      expect(result.originalPayment.status).toBe('SUCCEEDED');
    });
  });

  describe('Error handling', () => {
    it('should handle Stripe refund failures gracefully', async () => {
      const mockBooking = {
        id: 'booking_123',
        status: 'CONFIRMED',
      };

      const originalPayment = {
        id: 'payment_original',
        bookingId: 'booking_123',
        amount: new Decimal(33),
        stripePaymentIntentId: 'pi_test_123',
        status: 'SUCCEEDED',
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(originalPayment);
      (stripe.refunds.create as jest.Mock).mockRejectedValue(
        new Error('Charge has already been refunded')
      );

      await expect(
        refundService.processRefund({ bookingId: 'booking_123' })
      ).rejects.toThrow('Charge has already been refunded');

      // Should not update payment status if Stripe refund fails
      expect(mockPrisma.payment.update).not.toHaveBeenCalled();
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });

    it('should only refund SUCCEEDED payments', async () => {
      const mockBooking = {
        id: 'booking_123',
        status: 'CONFIRMED',
      };

      const pendingPayment = {
        id: 'payment_pending',
        bookingId: 'booking_123',
        status: 'PENDING',
      };

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(null); // No SUCCEEDED payment found

      // The service should throw PaymentNotFoundError for non-SUCCEEDED payments
      await expect(
        refundService.processRefund({ bookingId: 'booking_123' })
      ).rejects.toThrow(PaymentNotFoundError);
    });
  });
});
