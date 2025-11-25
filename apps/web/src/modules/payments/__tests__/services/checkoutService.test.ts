/**
 * Checkout Service Tests
 * Tests for creating Stripe Checkout Sessions
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { CheckoutService } from '../../services/checkoutService';
import { BookingNotFoundError } from '../../types';
import { createMockBooking } from '@/modules/booking/__mocks__/bookingStub';

// Mock Stripe
jest.mock('../../services/stripeService', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  },
}));

import { stripe } from '../../services/stripeService';

const mockPrisma = {
  booking: {
    findUnique: jest.fn(),
  },
  payment: {
    create: jest.fn(),
  },
} as unknown as PrismaClient;

describe('CheckoutService', () => {
  let checkoutService: CheckoutService;

  beforeEach(() => {
    checkoutService = new CheckoutService(mockPrisma);
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  describe('TC-RF-005-01: Create checkout session for booking', () => {
    it('should create Stripe Checkout Session successfully', async () => {
      const mockBooking = createMockBooking();

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment_123',
        bookingId: mockBooking.id,
        type: 'ANTICIPO',
        status: 'PENDING',
      });

      const result = await checkoutService.createCheckoutSession(mockBooking.id);

      expect(result.sessionId).toBe('cs_test_123');
      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/pay/cs_test_123');
      expect(result.payment.type).toBe('ANTICIPO');
    });

    it('should throw BookingNotFoundError for invalid booking', async () => {
      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        checkoutService.createCheckoutSession('invalid_booking_id')
      ).rejects.toThrow(BookingNotFoundError);
    });
  });

  describe('TC-RF-005-02: Session includes correct metadata', () => {
    it('should include booking_id, service_id, client_id in metadata', async () => {
      const mockBooking = createMockBooking({
        id: 'booking_metadata_test',
        serviceId: 'service_meta_123',
        clientId: 'client_meta_456',
      });

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123',
      });
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment_123',
      });

      await checkoutService.createCheckoutSession(mockBooking.id);

      const createCall = (stripe.checkout.sessions.create as jest.Mock).mock.calls[0][0];

      expect(createCall.metadata).toEqual({
        booking_id: 'booking_metadata_test',
        service_id: 'service_meta_123',
        client_id: 'client_meta_456',
      });

      expect(createCall.payment_intent_data.metadata).toEqual({
        booking_id: 'booking_metadata_test',
        service_id: 'service_meta_123',
        client_id: 'client_meta_456',
      });
    });
  });

  describe('TC-RF-005-03: Amount matches advance payment (30%)', () => {
    it('should charge exactly 30% of final price', async () => {
      const mockBooking = createMockBooking({
        basePrice: new Decimal(100),
        finalPrice: new Decimal(110),
        anticipoAmount: new Decimal(33),
      });

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123',
      });
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment_123',
      });

      await checkoutService.createCheckoutSession(mockBooking.id);

      const createCall = (stripe.checkout.sessions.create as jest.Mock).mock.calls[0][0];

      // Amount should be $33 in cents = 3300
      expect(createCall.line_items[0].price_data.unit_amount).toBe(3300);
      expect(createCall.line_items[0].price_data.currency).toBe('mxn');
    });
  });

  describe('TC-RF-005-05: Session includes success and cancel URLs', () => {
    it('should set correct success_url and cancel_url', async () => {
      const mockBooking = createMockBooking({ id: 'booking_url_test' });

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        id: 'cs_123',
        url: 'https://checkout.stripe.com/pay/cs_123',
      });
      (mockPrisma.payment.create as jest.Mock).mockResolvedValue({
        id: 'payment_123',
      });

      await checkoutService.createCheckoutSession(mockBooking.id);

      const createCall = (stripe.checkout.sessions.create as jest.Mock).mock.calls[0][0];

      expect(createCall.success_url).toContain(
        '/bookings/booking_url_test/success?session_id={CHECKOUT_SESSION_ID}'
      );
      expect(createCall.cancel_url).toContain(
        '/bookings/booking_url_test/cancelled'
      );
    });
  });

  describe('TC-RF-005-06: Payment record created with PENDING status', () => {
    it('should create payment record with correct data', async () => {
      const mockBooking = createMockBooking();

      (mockPrisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
      (stripe.checkout.sessions.create as jest.Mock).mockResolvedValue({
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/pay/cs_test_456',
      });

      const mockPayment = {
        id: 'payment_created',
        bookingId: mockBooking.id,
        type: 'ANTICIPO',
        amount: mockBooking.anticipoAmount,
        currency: 'mxn',
        stripeCheckoutSessionId: 'cs_test_456',
        status: 'PENDING',
      };

      (mockPrisma.payment.create as jest.Mock).mockResolvedValue(mockPayment);

      const result = await checkoutService.createCheckoutSession(mockBooking.id);

      expect(result.payment.id).toBe('payment_created');
      expect(result.payment.status).toBe('PENDING');
      expect(result.payment.type).toBe('ANTICIPO');

      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: mockBooking.id,
          type: 'ANTICIPO',
          currency: 'mxn',
          stripeCheckoutSessionId: 'cs_test_456',
          status: 'PENDING',
        }),
      });
    });
  });
});
