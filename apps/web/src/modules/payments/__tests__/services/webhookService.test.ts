/**
 * Webhook Service Tests
 * Tests for Stripe webhook processing with idempotency
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import Stripe from 'stripe';
import { WebhookService } from '../../services/webhookService';

// Mock repository methods
const mockPaymentRepository = {
  findByStripePaymentIntentId: jest.fn(),
  updateStatus: jest.fn(),
  createPayment: jest.fn(),
  findById: jest.fn(),
};

const mockWebhookEventRepository = {
  hasBeenProcessed: jest.fn(),
  createProcessedEvent: jest.fn(),
  findByStripeEventId: jest.fn(),
};

// Mock dependencies
jest.mock('../../repositories/paymentRepository', () => ({
  getPaymentRepository: jest.fn(() => mockPaymentRepository),
}));

jest.mock('../../repositories/webhookEventRepository', () => ({
  getWebhookEventRepository: jest.fn(() => mockWebhookEventRepository),
}));

const mockPrisma = {
  payment: {
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  booking: {
    update: jest.fn(),
  },
  contractorProfile: {
    findFirst: jest.fn(),
  },
  processedWebhookEvent: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient;

describe('WebhookService', () => {
  let webhookService: WebhookService;

  beforeEach(() => {
    webhookService = new WebhookService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('TC-RF-007-06: Idempotency - duplicate event ignored', () => {
    it('should skip processing duplicate events', async () => {
      // Mock: event already processed
      mockWebhookEventRepository.hasBeenProcessed.mockResolvedValue(true);

      const event = {
        id: 'evt_test_duplicate',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      } as Stripe.Event;

      const result = await webhookService.processWebhookEvent(event);

      expect(result.success).toBe(true);
      expect(result.wasDuplicate).toBe(true);
      expect(result.eventId).toBe('evt_test_duplicate');

      // Should not create new processed event
      expect(mockWebhookEventRepository.createProcessedEvent).not.toHaveBeenCalled();
    });

    it('should process new events normally', async () => {
      // Mock: event not processed yet
      mockWebhookEventRepository.hasBeenProcessed.mockResolvedValue(false);
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue({
        id: 'payment_123',
        type: 'ANTICIPO',
        bookingId: 'booking_456',
      });
      mockPaymentRepository.updateStatus.mockResolvedValue({});
      (mockPrisma.booking.update as jest.Mock).mockResolvedValue({});
      mockWebhookEventRepository.createProcessedEvent.mockResolvedValue({
        id: 'pwe_new',
        stripeEventId: 'evt_new_123',
      });

      const event = {
        id: 'evt_new_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      } as Stripe.Event;

      const result = await webhookService.processWebhookEvent(event);

      expect(result.success).toBe(true);
      expect(result.wasDuplicate).toBe(false);

      // Should create processed event record
      expect(mockWebhookEventRepository.createProcessedEvent).toHaveBeenCalledWith({
        stripeEventId: 'evt_new_123',
        eventType: 'payment_intent.succeeded',
      });
    });
  });

  describe('TC-RF-007-01: Webhook processes payment_intent.succeeded', () => {
    it('should update payment and booking on successful payment', async () => {
      mockWebhookEventRepository.hasBeenProcessed.mockResolvedValue(false);
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue({
        id: 'payment_123',
        type: 'ANTICIPO',
        bookingId: 'booking_456',
        status: 'PENDING',
        stripePaymentIntentId: 'pi_succeeded',
      });
      mockPaymentRepository.updateStatus.mockResolvedValue({
        id: 'payment_123',
        status: 'SUCCEEDED',
      });
      (mockPrisma.booking.update as jest.Mock).mockResolvedValue({});
      mockWebhookEventRepository.createProcessedEvent.mockResolvedValue({});

      const event = {
        id: 'evt_success_123',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_succeeded',
            metadata: { booking_id: 'booking_456' },
          },
        },
      } as Stripe.PaymentIntentSucceededEvent;

      const result = await webhookService.processWebhookEvent(event);

      expect(result.success).toBe(true);

      // Should update payment status
      expect(mockPaymentRepository.updateStatus).toHaveBeenCalledWith('payment_123', 'SUCCEEDED');

      // Should update booking status
      expect(mockPrisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking_456' },
        data: { status: 'CONFIRMED' },
      });
    });
  });

  describe('TC-RF-007-03: Webhook processes payment_intent.payment_failed', () => {
    it('should mark payment as FAILED', async () => {
      mockWebhookEventRepository.hasBeenProcessed.mockResolvedValue(false);
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue({
        id: 'payment_123',
        status: 'PENDING',
        stripePaymentIntentId: 'pi_failed',
      });
      mockPaymentRepository.updateStatus.mockResolvedValue({
        id: 'payment_123',
        status: 'FAILED',
      });
      mockWebhookEventRepository.createProcessedEvent.mockResolvedValue({});

      const event = {
        id: 'evt_failed_123',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_failed',
            last_payment_error: { message: 'Insufficient funds' },
          },
        },
      } as Stripe.PaymentIntentPaymentFailedEvent;

      const result = await webhookService.processWebhookEvent(event);

      expect(result.success).toBe(true);
      expect(mockPaymentRepository.updateStatus).toHaveBeenCalledWith('payment_123', 'FAILED');
    });
  });

  describe('TC-RF-007-04: Webhook processes charge.refunded', () => {
    it('should create refund payment and update original', async () => {
      mockWebhookEventRepository.hasBeenProcessed.mockResolvedValue(false);
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue({
        id: 'payment_original',
        type: 'ANTICIPO',
        bookingId: 'booking_456',
        amount: new Decimal(33),
        currency: 'mxn',
        status: 'SUCCEEDED',
        stripePaymentIntentId: 'pi_123',
      });
      mockPaymentRepository.updateStatus.mockResolvedValue({});
      mockPaymentRepository.createPayment.mockResolvedValue({
        id: 'payment_refund',
        type: 'REEMBOLSO',
      });
      mockWebhookEventRepository.createProcessedEvent.mockResolvedValue({});

      const event = {
        id: 'evt_refund_123',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_123',
            payment_intent: 'pi_123',
            amount_refunded: 3300, // $33 in cents
          },
        },
      } as Stripe.ChargeRefundedEvent;

      const result = await webhookService.processWebhookEvent(event);

      expect(result.success).toBe(true);

      // Should update original payment to REFUNDED
      expect(mockPaymentRepository.updateStatus).toHaveBeenCalledWith('payment_original', 'REFUNDED');

      // Should create refund payment record
      expect(mockPaymentRepository.createPayment).toHaveBeenCalled();
    });
  });

  describe('TC-RF-007-05: Webhook processes account.updated (Connect)', () => {
    it('should log Connect account update', async () => {
      mockWebhookEventRepository.hasBeenProcessed.mockResolvedValue(false);
      (mockPrisma.contractorProfile.findFirst as jest.Mock).mockResolvedValue({
        id: 'contractor_123',
        stripeConnectAccountId: 'acct_test',
      });
      mockWebhookEventRepository.createProcessedEvent.mockResolvedValue({});

      const event = {
        id: 'evt_account_123',
        type: 'account.updated',
        data: {
          object: {
            id: 'acct_test',
            charges_enabled: true,
            payouts_enabled: true,
          },
        },
      } as Stripe.AccountUpdatedEvent;

      const result = await webhookService.processWebhookEvent(event);

      expect(result.success).toBe(true);
      expect(mockPrisma.contractorProfile.findFirst).toHaveBeenCalledWith({
        where: { stripeConnectAccountId: 'acct_test' },
      });
    });
  });

  describe('TC-RF-007-08: Webhook stores event ID in database', () => {
    it('should always store processed event ID', async () => {
      mockWebhookEventRepository.hasBeenProcessed.mockResolvedValue(false);
      mockPaymentRepository.findByStripePaymentIntentId.mockResolvedValue({
        id: 'payment_123',
        type: 'ANTICIPO',
        bookingId: 'booking_456',
      });
      mockPaymentRepository.updateStatus.mockResolvedValue({});
      (mockPrisma.booking.update as jest.Mock).mockResolvedValue({});
      mockWebhookEventRepository.createProcessedEvent.mockResolvedValue({
        id: 'pwe_123',
        stripeEventId: 'evt_stored_456',
      });

      const event = {
        id: 'evt_stored_456',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      } as Stripe.Event;

      await webhookService.processWebhookEvent(event);

      expect(mockWebhookEventRepository.createProcessedEvent).toHaveBeenCalledWith({
        stripeEventId: 'evt_stored_456',
        eventType: 'payment_intent.succeeded',
      });
    });
  });

  describe('Error handling', () => {
    it('should return error result if processing fails', async () => {
      mockWebhookEventRepository.hasBeenProcessed.mockResolvedValue(false);
      mockPaymentRepository.findByStripePaymentIntentId.mockRejectedValue(
        new Error('Database error')
      );

      const event = {
        id: 'evt_error_123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_123' } },
      } as Stripe.Event;

      const result = await webhookService.processWebhookEvent(event);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
});
