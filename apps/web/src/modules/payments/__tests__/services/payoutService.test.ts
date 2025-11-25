/**
 * Payout Service Tests
 * Tests for creating payouts to contractors
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PayoutService } from '../../services/payoutService';
import { BookingNotFoundError, MissingConnectAccountError, PaymentError } from '../../types';
import { createMockBooking } from '@/modules/booking/__mocks__/bookingStub';

// Mock Stripe
jest.mock('../../services/stripeService', () => ({
  stripe: {
    transfers: {
      create: jest.fn(),
    },
  },
}));

import { stripe } from '../../services/stripeService';

const mockPrisma = {
  payment: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  booking: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient;

describe('PayoutService', () => {
  let payoutService: PayoutService;

  beforeEach(() => {
    payoutService = new PayoutService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('TC-RF-010-01: Create payout when booking COMPLETED', () => {
    it('should create Stripe Transfer to contractor', async () => {
      const mockBooking = createMockBooking({
        status: 'COMPLETED',
        contractorPayoutAmount: new Decimal(93.50),
      });

      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(null); // No existing payout
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      const mockTransfer = {
        id: 'tr_test_123',
        amount: 9350,
        currency: 'mxn',
        destination: 'acct_test_connect_123',
      };

      (stripe.transfers.create as jest.Mock).mockResolvedValue(mockTransfer);

      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment_payout_123',
        type: 'LIQUIDACION',
        amount: new Decimal(93.50),
        stripeTransferId: 'tr_test_123',
        status: 'SUCCEEDED',
      });

      const result = await payoutService.createPayout(mockBooking.id);

      expect(result.stripeTransferId).toBe('tr_test_123');
      expect(result.amount.toNumber()).toBe(93.50);
      expect(result.payment.type).toBe('LIQUIDACION');
    });

    it('should throw BookingNotFoundError for invalid booking', async () => {
      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        payoutService.createPayout('invalid_booking')
      ).rejects.toThrow(BookingNotFoundError);
    });
  });

  describe('TC-RF-010-02: Payout amount matches 85% of final price', () => {
    it('should transfer exactly 85% of final price', async () => {
      const mockBooking = createMockBooking({
        finalPrice: new Decimal(110),
        contractorPayoutAmount: new Decimal(93.50), // 110 * 0.85
      });

      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (stripe.transfers.create as jest.Mock).mockResolvedValue({
        id: 'tr_123',
      });
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment_123',
        amount: new Decimal(93.50),
      });

      await payoutService.createPayout(mockBooking.id);

      const transferCall = (stripe.transfers.create as jest.Mock).mock.calls[0][0];

      // $93.50 in cents = 9350
      expect(transferCall.amount).toBe(9350);
      expect(transferCall.currency).toBe('mxn');
    });
  });

  describe('TC-RF-010-03: Payout includes Stripe Transfer ID', () => {
    it('should return payment with stripeTransferId', async () => {
      const mockBooking = createMockBooking();

      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (stripe.transfers.create as jest.Mock).mockResolvedValue({
        id: 'tr_transfer_id_test',
      });
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment_123',
        stripeTransferId: 'tr_transfer_id_test',
      });

      const result = await payoutService.createPayout(mockBooking.id);

      expect(result.stripeTransferId).toBe('tr_transfer_id_test');
      expect(result.payment.stripeTransferId).toBe('tr_transfer_id_test');
    });
  });

  describe('TC-RF-010-04: Payout fails if contractor has no Connect account', () => {
    it('should throw MissingConnectAccountError', async () => {
      const mockBooking = createMockBooking({
        contractor: {
          id: 'contractor_no_connect',
          contractorProfile: {
            id: 'profile_123',
            stripeConnectAccountId: null, // No Connect account!
          },
        },
      });

      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      await expect(
        payoutService.createPayout(mockBooking.id)
      ).rejects.toThrow(MissingConnectAccountError);
    });

    it('should throw error if contractor has no profile', async () => {
      const mockBooking = createMockBooking({
        contractor: {
          id: 'contractor_no_profile',
          contractorProfile: undefined,
        },
      });

      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      await expect(
        payoutService.createPayout(mockBooking.id)
      ).rejects.toThrow(PaymentError);
    });
  });

  describe('TC-RF-010-05: Payout creates LIQUIDACION payment record', () => {
    it('should create payment with type LIQUIDACION', async () => {
      const mockBooking = createMockBooking();

      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (stripe.transfers.create as jest.Mock).mockResolvedValue({
        id: 'tr_123',
      });

      const mockPayment = {
        id: 'payment_liquidacion',
        bookingId: mockBooking.id,
        type: 'LIQUIDACION',
        amount: mockBooking.contractorPayoutAmount,
        status: 'SUCCEEDED',
        stripeTransferId: 'tr_123',
      };

      (mockPrisma.payment.create as jest.Mock).mockResolvedValue(mockPayment);

      const result = await payoutService.createPayout(mockBooking.id);

      expect(result.payment.type).toBe('LIQUIDACION');
      expect(result.payment.status).toBe('SUCCEEDED');

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: mockBooking.id,
          type: 'LIQUIDACION',
          status: 'SUCCEEDED',
          stripeTransferId: 'tr_123',
        }),
      });
    });
  });

  describe('TC-RF-010-06: Payout is idempotent (prevents double payment)', () => {
    it('should return existing payout if already created', async () => {
      const existingPayout = {
        id: 'payment_existing',
        bookingId: 'booking_123',
        type: 'LIQUIDACION',
        amount: new Decimal(93.50),
        stripeTransferId: 'tr_existing_123',
        status: 'SUCCEEDED',
      };

      (mockPrisma.payment.findFirst as jest.Mock).mockResolvedValue(existingPayout);

      const result = await payoutService.createPayout('booking_123');

      expect(result.payment.id).toBe('payment_existing');
      expect(result.stripeTransferId).toBe('tr_existing_123');

      // Should NOT create new transfer or payment
      expect(stripe.transfers.create).not.toHaveBeenCalled();
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });
  });
});
