/**
 * Stripe Webhook Endpoint
 * Receives and processes Stripe events
 *
 * IMPORTANT: This endpoint uses raw body parsing for signature verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { stripe, getWebhookSecret } from '@/modules/payments/services/stripeService';
import { getWebhookService } from '@/modules/payments/services/webhookService';
import { prisma } from '@/lib/prisma';
import { InvalidWebhookSignatureError } from '@/modules/payments/types';

/**
 * POST /api/webhooks/stripe
 * Receives Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body and signature
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('[Stripe Webhook] Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // 2. Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        getWebhookSecret()
      );
    } catch (err) {
      console.error('[Stripe Webhook] Signature verification failed:', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw new InvalidWebhookSignatureError();
    }

    console.log(`[Stripe Webhook] Received event: ${event.id}`, {
      type: event.type,
    });

    // 3. Process event with webhook service
    const webhookService = getWebhookService(prisma);
    const result = await webhookService.processWebhookEvent(event);

    // 4. Return response
    if (result.success) {
      return NextResponse.json({
        received: true,
        eventId: result.eventId,
        wasDuplicate: result.wasDuplicate,
      });
    } else {
      // Return 500 for processing errors (Stripe will retry)
      console.error('[Stripe Webhook] Processing failed:', {
        eventId: result.eventId,
        error: result.error,
      });
      return NextResponse.json(
        {
          error: 'Event processing failed',
          eventId: result.eventId,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      // Return 400 for invalid signature (no retry)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Return 500 for other errors (Stripe will retry)
    console.error('[Stripe Webhook] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
