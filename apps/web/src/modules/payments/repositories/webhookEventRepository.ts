/**
 * Webhook Event Repository
 * Data access layer for ProcessedWebhookEvent entities
 * Handles idempotency for Stripe webhooks
 */

import { PrismaClient, ProcessedWebhookEvent } from '@prisma/client';
import { CreateProcessedWebhookEventInput } from '../types';

/**
 * Webhook event repository for idempotency tracking
 */
export class WebhookEventRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a processed webhook event record
   */
  async createProcessedEvent(
    data: CreateProcessedWebhookEventInput
  ): Promise<ProcessedWebhookEvent> {
    return this.prisma.processedWebhookEvent.create({
      data: {
        stripeEventId: data.stripeEventId,
        eventType: data.eventType,
      },
    });
  }

  /**
   * Find processed event by Stripe event ID
   */
  async findByStripeEventId(
    stripeEventId: string
  ): Promise<ProcessedWebhookEvent | null> {
    return this.prisma.processedWebhookEvent.findUnique({
      where: { stripeEventId },
    });
  }

  /**
   * Check if an event has already been processed
   * (Idempotency check)
   */
  async hasBeenProcessed(stripeEventId: string): Promise<boolean> {
    const event = await this.findByStripeEventId(stripeEventId);
    return event !== null;
  }
}

/**
 * Singleton instance
 */
let webhookEventRepository: WebhookEventRepository | null = null;

export function getWebhookEventRepository(
  prisma: PrismaClient
): WebhookEventRepository {
  if (!webhookEventRepository) {
    webhookEventRepository = new WebhookEventRepository(prisma);
  }
  return webhookEventRepository;
}
