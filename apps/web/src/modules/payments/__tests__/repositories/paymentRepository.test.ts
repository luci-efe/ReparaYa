/**
 * Payment Repository Tests
 * Tests for payment CRUD operations
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentRepository } from '../../repositories/paymentRepository';
import { PaymentNotFoundError } from '../../types';

// Mock Prisma Client
const mockPrisma = {
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

describe('PaymentRepository', () => {
  let repository: PaymentRepository;

  beforeEach(() => {
    repository = new PaymentRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('TC-PAY-003-01: Create payment with ANTICIPO type', () => {
    it('should create payment record with ANTICIPO type', async () => {
      const mockPayment = {
        id: 'payment_123',
        bookingId: 'booking_456',
        type: 'ANTICIPO',
        amount: new Decimal(33),
        currency: 'mxn',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.payment.create as jest.Mock).mockResolvedValue(mockPayment);

      const result = await repository.createPayment({
        bookingId: 'booking_456',
        type: 'ANTICIPO',
        amount: new Decimal(33),
      });

      expect(result).toEqual(mockPayment);
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          bookingId: 'booking_456',
          type: 'ANTICIPO',
          amount: new Decimal(33),
          currency: 'mxn',
          status: 'PENDING',
          stripePaymentIntentId: undefined,
          stripeCheckoutSessionId: undefined,
          stripeTransferId: undefined,
          metadata: {},
        },
      });
    });
  });

  describe('TC-PAY-003-02: Create payment with LIQUIDACION type', () => {
    it('should create payment record with LIQUIDACION type', async () => {
      const mockPayment = {
        id: 'payment_789',
        bookingId: 'booking_456',
        type: 'LIQUIDACION',
        amount: new Decimal(77),
        currency: 'mxn',
        status: 'SUCCEEDED',
        stripeTransferId: 'tr_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.payment.create as jest.Mock).mockResolvedValue(mockPayment);

      const result = await repository.createPayment({
        bookingId: 'booking_456',
        type: 'LIQUIDACION',
        amount: new Decimal(77),
        stripeTransferId: 'tr_123',
        status: 'SUCCEEDED',
      });

      expect(result.type).toBe('LIQUIDACION');
      expect(result.stripeTransferId).toBe('tr_123');
    });
  });

  describe('TC-PAY-003-03: Create payment with REEMBOLSO type', () => {
    it('should create payment record with REEMBOLSO type', async () => {
      const mockPayment = {
        id: 'payment_refund',
        bookingId: 'booking_456',
        type: 'REEMBOLSO',
        amount: new Decimal(33),
        currency: 'mxn',
        status: 'SUCCEEDED',
        metadata: { reason: 'Cancellation' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.payment.create as jest.Mock).mockResolvedValue(mockPayment);

      const result = await repository.createPayment({
        bookingId: 'booking_456',
        type: 'REEMBOLSO',
        amount: new Decimal(33),
        status: 'SUCCEEDED',
        metadata: { reason: 'Cancellation' },
      });

      expect(result.type).toBe('REEMBOLSO');
      expect(result.metadata).toEqual({ reason: 'Cancellation' });
    });
  });

  describe('TC-PAY-003-04: Find payment by Stripe Payment Intent ID', () => {
    it('should find payment by stripePaymentIntentId', async () => {
      const mockPayment = {
        id: 'payment_123',
        stripePaymentIntentId: 'pi_test_456',
        status: 'SUCCEEDED',
      };

      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(mockPayment);

      const result = await repository.findByStripePaymentIntentId('pi_test_456');

      expect(result).toEqual(mockPayment);
      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { stripePaymentIntentId: 'pi_test_456' },
      });
    });

    it('should return null if not found', async () => {
      (mockPrisma.payment.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByStripePaymentIntentId('pi_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('TC-PAY-003-05: Find all payments for a booking', () => {
    it('should return all payments for a booking ordered by creation', async () => {
      const mockPayments = [
        { id: 'payment_1', type: 'ANTICIPO', createdAt: new Date('2025-01-01') },
        { id: 'payment_2', type: 'LIQUIDACION', createdAt: new Date('2025-01-02') },
      ];

      (mockPrisma.payment.findMany as jest.Mock).mockResolvedValue(mockPayments);

      const result = await repository.findByBookingId('booking_456');

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockPayments);
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { bookingId: 'booking_456' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('TC-PAY-003-06: Update payment status to SUCCEEDED', () => {
    it('should update payment status to SUCCEEDED', async () => {
      const mockUpdatedPayment = {
        id: 'payment_123',
        status: 'SUCCEEDED',
        updatedAt: new Date(),
      };

      (mockPrisma.payment.update as jest.Mock).mockResolvedValue(mockUpdatedPayment);

      const result = await repository.updateStatus('payment_123', 'SUCCEEDED');

      expect(result.status).toBe('SUCCEEDED');
      expect(mockPrisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment_123' },
        data: { status: 'SUCCEEDED' },
      });
    });
  });

  describe('TC-PAY-003-07: Update payment status to FAILED', () => {
    it('should update payment status to FAILED', async () => {
      const mockUpdatedPayment = {
        id: 'payment_123',
        status: 'FAILED',
        updatedAt: new Date(),
      };

      (mockPrisma.payment.update as jest.Mock).mockResolvedValue(mockUpdatedPayment);

      const result = await repository.updateStatus('payment_123', 'FAILED');

      expect(result.status).toBe('FAILED');
    });
  });

  describe('TC-PAY-003-08: Update payment status to REFUNDED', () => {
    it('should update payment status to REFUNDED', async () => {
      const mockUpdatedPayment = {
        id: 'payment_123',
        status: 'REFUNDED',
        updatedAt: new Date(),
      };

      (mockPrisma.payment.update as jest.Mock).mockResolvedValue(mockUpdatedPayment);

      const result = await repository.updateStatus('payment_123', 'REFUNDED');

      expect(result.status).toBe('REFUNDED');
    });

    it('should throw PaymentNotFoundError if payment does not exist', async () => {
      (mockPrisma.payment.update as jest.Mock).mockRejectedValue(new Error('Record not found'));

      await expect(
        repository.updateStatus('payment_nonexistent', 'REFUNDED')
      ).rejects.toThrow(PaymentNotFoundError);
    });
  });

  describe('Payout idempotency check', () => {
    it('should detect existing payout for booking', async () => {
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: 'payment_payout',
        type: 'LIQUIDACION',
      });

      const exists = await repository.payoutExistsForBooking('booking_456');

      expect(exists).toBe(true);
      expect(mockPrisma.payment.findFirst).toHaveBeenCalledWith({
        where: { bookingId: 'booking_456', type: 'LIQUIDACION' },
      });
    });

    it('should return false when no payout exists', async () => {
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(null);

      const exists = await repository.payoutExistsForBooking('booking_456');

      expect(exists).toBe(false);
    });
  });
});
