/**
 * Webhook Event Repository Tests
 * Tests for webhook idempotency tracking
 */

import { PrismaClient } from '@prisma/client';
import { WebhookEventRepository } from '../../repositories/webhookEventRepository';

// Mock Prisma Client
const mockPrisma = {
  processedWebhookEvent: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient;

describe('WebhookEventRepository', () => {
  let repository: WebhookEventRepository;

  beforeEach(() => {
    repository = new WebhookEventRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('createProcessedEvent', () => {
    it('should create processed webhook event record', async () => {
      const mockEvent = {
        id: 'pwe_123',
        stripeEventId: 'evt_test_456',
        eventType: 'payment_intent.succeeded',
        processedAt: new Date(),
      };

      (mockPrisma.processedWebhookEvent.create as jest.Mock).mockResolvedValue(mockEvent);

      const result = await repository.createProcessedEvent({
        stripeEventId: 'evt_test_456',
        eventType: 'payment_intent.succeeded',
      });

      expect(result).toEqual(mockEvent);
      expect(mockPrisma.processedWebhookEvent.create).toHaveBeenCalledWith({
        data: {
          stripeEventId: 'evt_test_456',
          eventType: 'payment_intent.succeeded',
        },
      });
    });
  });

  describe('findByStripeEventId', () => {
    it('should find event by Stripe event ID', async () => {
      const mockEvent = {
        id: 'pwe_123',
        stripeEventId: 'evt_test_456',
        eventType: 'payment_intent.succeeded',
        processedAt: new Date(),
      };

      (mockPrisma.processedWebhookEvent.findUnique as jest.Mock).mockResolvedValue(mockEvent);

      const result = await repository.findByStripeEventId('evt_test_456');

      expect(result).toEqual(mockEvent);
      expect(mockPrisma.processedWebhookEvent.findUnique).toHaveBeenCalledWith({
        where: { stripeEventId: 'evt_test_456' },
      });
    });

    it('should return null if event not found', async () => {
      (mockPrisma.processedWebhookEvent.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.findByStripeEventId('evt_nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('hasBeenProcessed (idempotency check)', () => {
    it('should return true if event has been processed', async () => {
      (mockPrisma.processedWebhookEvent.findUnique as jest.Mock).mockResolvedValue({
        id: 'pwe_123',
        stripeEventId: 'evt_test_456',
      });

      const result = await repository.hasBeenProcessed('evt_test_456');

      expect(result).toBe(true);
    });

    it('should return false if event has not been processed', async () => {
      (mockPrisma.processedWebhookEvent.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repository.hasBeenProcessed('evt_new_789');

      expect(result).toBe(false);
    });
  });
});
