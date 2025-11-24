/**
 * Webhook Service
 * Processes Stripe webhook events with idempotency
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { getPaymentRepository } from '../repositories/paymentRepository';
import { getWebhookEventRepository } from '../repositories/webhookEventRepository';
import { WebhookProcessingResult } from '../types';

/**
 * Webhook service for processing Stripe events
 */
export class WebhookService {
  private paymentRepository;
  private webhookEventRepository;

  constructor(private prisma: PrismaClient) {
    this.paymentRepository = getPaymentRepository(prisma);
    this.webhookEventRepository = getWebhookEventRepository(prisma);
  }

  /**
   * Process a Stripe webhook event with idempotency
   *
   * @param event - Stripe webhook event
   * @returns Processing result
   */
  async processWebhookEvent(
    event: Stripe.Event
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();

    try {
      // 1. Check idempotency - has this event been processed?
      const alreadyProcessed = await this.webhookEventRepository.hasBeenProcessed(
        event.id
      );

      if (alreadyProcessed) {
        console.log(
          `[WebhookService] Event ${event.id} already processed, skipping`,
          { type: event.type }
        );
        return {
          success: true,
          eventId: event.id,
          eventType: event.type,
          wasDuplicate: true,
        };
      }

      // 2. Process event based on type
      console.log(`[WebhookService] Processing event ${event.id}`, {
        type: event.type,
      });

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(event);
          break;

        case 'account.updated':
          await this.handleAccountUpdated(event);
          break;

        default:
          console.log(`[WebhookService] Unhandled event type: ${event.type}`);
      }

      // 3. Mark event as processed
      await this.webhookEventRepository.createProcessedEvent({
        stripeEventId: event.id,
        eventType: event.type,
      });

      const duration = Date.now() - startTime;
      console.log(`[WebhookService] Event ${event.id} processed successfully`, {
        type: event.type,
        durationMs: duration,
      });

      return {
        success: true,
        eventId: event.id,
        eventType: event.type,
        wasDuplicate: false,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[WebhookService] Error processing event ${event.id}:`,
        {
          type: event.type,
          error: error instanceof Error ? error.message : String(error),
          durationMs: duration,
        }
      );

      return {
        success: false,
        eventId: event.id,
        eventType: event.type,
        wasDuplicate: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Handle payment_intent.succeeded event
   * Updates payment status and booking status
   */
  private async handlePaymentIntentSucceeded(
    event: Stripe.PaymentIntentSucceededEvent
  ): Promise<void> {
    const paymentIntent = event.data.object;

    // Find payment by Payment Intent ID
    const payment = await this.paymentRepository.findByStripePaymentIntentId(
      paymentIntent.id
    );

    if (!payment) {
      console.warn(
        `[WebhookService] Payment not found for PI ${paymentIntent.id}`,
        { metadata: paymentIntent.metadata }
      );
      return;
    }

    // Update payment status to SUCCEEDED
    await this.paymentRepository.updateStatus(payment.id, 'SUCCEEDED');

    // If this is an ANTICIPO payment, update booking to CONFIRMED
    if (payment.type === 'ANTICIPO') {
      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: 'CONFIRMED' },
      });

      console.log(
        `[WebhookService] Booking ${payment.bookingId} confirmed after successful payment`
      );
    }

    console.log(`[WebhookService] Payment ${payment.id} marked as SUCCEEDED`);
  }

  /**
   * Handle payment_intent.payment_failed event
   * Updates payment status to FAILED
   */
  private async handlePaymentIntentFailed(
    event: Stripe.PaymentIntentPaymentFailedEvent
  ): Promise<void> {
    const paymentIntent = event.data.object;

    const payment = await this.paymentRepository.findByStripePaymentIntentId(
      paymentIntent.id
    );

    if (!payment) {
      console.warn(
        `[WebhookService] Payment not found for failed PI ${paymentIntent.id}`
      );
      return;
    }

    await this.paymentRepository.updateStatus(payment.id, 'FAILED');

    console.log(`[WebhookService] Payment ${payment.id} marked as FAILED`, {
      reason: paymentIntent.last_payment_error?.message,
    });
  }

  /**
   * Handle charge.refunded event
   * Creates refund payment record
   */
  private async handleChargeRefunded(
    event: Stripe.ChargeRefundedEvent
  ): Promise<void> {
    const charge = event.data.object;

    // Find original payment by Payment Intent ID
    if (!charge.payment_intent) {
      console.warn('[WebhookService] Charge has no payment_intent', {
        chargeId: charge.id,
      });
      return;
    }

    const originalPayment = await this.paymentRepository.findByStripePaymentIntentId(
      charge.payment_intent as string
    );

    if (!originalPayment) {
      console.warn(
        `[WebhookService] Original payment not found for refunded charge ${charge.id}`
      );
      return;
    }

    // Update original payment status to REFUNDED
    await this.paymentRepository.updateStatus(
      originalPayment.id,
      'REFUNDED'
    );

    // Create REEMBOLSO payment record
    const refundAmount = charge.amount_refunded / 100; // Convert from cents
    await this.paymentRepository.createPayment({
      bookingId: originalPayment.bookingId,
      type: 'REEMBOLSO',
      amount: new (require('@prisma/client/runtime/library').Decimal)(refundAmount),
      currency: originalPayment.currency,
      status: 'SUCCEEDED',
      metadata: {
        originalPaymentId: originalPayment.id,
        chargeId: charge.id,
        refundedAt: new Date().toISOString(),
      },
    });

    console.log(
      `[WebhookService] Refund processed for payment ${originalPayment.id}`,
      { refundAmount }
    );
  }

  /**
   * Handle account.updated event (Stripe Connect)
   * Updates contractor Connect account status
   */
  private async handleAccountUpdated(
    event: Stripe.AccountUpdatedEvent
  ): Promise<void> {
    const account = event.data.object;

    // Find contractor by Connect account ID
    const contractor = await this.prisma.contractorProfile.findFirst({
      where: { stripeConnectAccountId: account.id },
    });

    if (!contractor) {
      console.warn(
        `[WebhookService] Contractor not found for Connect account ${account.id}`
      );
      return;
    }

    console.log(
      `[WebhookService] Connect account ${account.id} updated for contractor ${contractor.id}`,
      {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      }
    );

    // Could update contractor status here if needed
    // For now, just log the update
  }
}

/**
 * Singleton instance
 */
let webhookService: WebhookService | null = null;

export function getWebhookService(prisma: PrismaClient): WebhookService {
  if (!webhookService) {
    webhookService = new WebhookService(prisma);
  }
  return webhookService;
}
