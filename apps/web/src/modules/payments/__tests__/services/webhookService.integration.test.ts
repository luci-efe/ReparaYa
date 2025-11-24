/**
 * Webhook Service Integration Tests
 * REAL tests that process actual Stripe webhook events
 */

import Stripe from 'stripe';
import { WebhookService } from '../../services/webhookService';
import { stripe } from '../../services/stripeService';
import {
  createTestBooking,
  cleanupTestData,
  disconnectDatabase,
  prisma,
} from '../helpers/testDatabase';
import { Decimal } from '@prisma/client/runtime/library';

describe('WebhookService - Real Integration Tests', () => {
  let webhookService: WebhookService;
  const testIds: { bookingIds: string[]; paymentIds: string[]; userIds: string[] } = {
    bookingIds: [],
    paymentIds: [],
    userIds: [],
  };

  beforeAll(() => {
    webhookService = new WebhookService(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(testIds);
    // Clean up processed webhook events
    await prisma.processedWebhookEvent.deleteMany({
      where: { stripeEventId: { startsWith: 'evt_' } },
    });
    await disconnectDatabase();
  });

  describe('TC-RF-007-01: Webhook processes payment_intent.succeeded', () => {
    it('should process REAL payment_intent.succeeded event', async () => {
      // 1. Create booking and payment
      const booking = await createTestBooking();
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      // 2. Create REAL PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 3300,
        currency: 'mxn',
        payment_method: 'pm_card_visa',
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          booking_id: booking.id,
        },
      });

      // 3. Create payment record
      const payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          type: 'ANTICIPO',
          amount: new Decimal(33),
          currency: 'mxn',
          status: 'PENDING',
          stripePaymentIntentId: paymentIntent.id,
        },
      });
      testIds.paymentIds.push(payment.id);

      // 4. Simulate webhook event
      const event: Stripe.PaymentIntentSucceededEvent = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: paymentIntent as Stripe.PaymentIntent,
        },
        api_version: '2024-11-20.acacia',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
      };

      // 5. Process webhook
      const result = await webhookService.processWebhookEvent(event);

      // 6. Verify processing
      expect(result.success).toBe(true);
      expect(result.wasDuplicate).toBe(false);

      // 7. Verify payment updated in database
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });
      expect(updatedPayment!.status).toBe('SUCCEEDED');

      // 8. Verify booking updated
      const updatedBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
      });
      expect(updatedBooking!.status).toBe('CONFIRMED');

      console.log(`✅ Webhook processed: payment_intent.succeeded`);
    }, 60000);
  });

  describe('TC-RF-007-06: Idempotency - duplicate event ignored', () => {
    it('should skip processing duplicate events', async () => {
      const booking = await createTestBooking();
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: 3300,
        currency: 'mxn',
        payment_method: 'pm_card_visa',
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });

      const payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          type: 'ANTICIPO',
          amount: new Decimal(33),
          status: 'PENDING',
          stripePaymentIntentId: paymentIntent.id,
        },
      });
      testIds.paymentIds.push(payment.id);

      const event: Stripe.PaymentIntentSucceededEvent = {
        id: `evt_test_idempotency_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: paymentIntent as Stripe.PaymentIntent,
        },
        api_version: '2024-11-20.acacia',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
      };

      // Process first time
      const result1 = await webhookService.processWebhookEvent(event);
      expect(result1.success).toBe(true);
      expect(result1.wasDuplicate).toBe(false);

      // Process second time - should be marked as duplicate
      const result2 = await webhookService.processWebhookEvent(event);
      expect(result2.success).toBe(true);
      expect(result2.wasDuplicate).toBe(true);

      console.log(`✅ Idempotency verified: duplicate skipped`);
    }, 60000);
  });

  describe('TC-RF-007-03: Webhook processes payment_intent.payment_failed', () => {
    it('should mark payment as FAILED', async () => {
      const booking = await createTestBooking();
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      // Create PaymentIntent that will fail
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 3300,
        currency: 'mxn',
        metadata: { booking_id: booking.id },
      });

      const payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          type: 'ANTICIPO',
          amount: new Decimal(33),
          status: 'PENDING',
          stripePaymentIntentId: paymentIntent.id,
        },
      });
      testIds.paymentIds.push(payment.id);

      // Simulate failed payment event
      const failedEvent: Stripe.PaymentIntentPaymentFailedEvent = {
        id: `evt_test_failed_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            ...paymentIntent,
            last_payment_error: {
              message: 'Insufficient funds',
            },
          } as Stripe.PaymentIntent,
        },
        api_version: '2024-11-20.acacia',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
      };

      const result = await webhookService.processWebhookEvent(failedEvent);

      expect(result.success).toBe(true);

      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });
      expect(updatedPayment!.status).toBe('FAILED');

      console.log(`✅ Failed payment processed correctly`);
    }, 60000);
  });

  describe('TC-RF-007-08: Webhook stores event ID in database', () => {
    it('should store processed event ID', async () => {
      // 1. Create booking and payment for successful processing
      const booking = await createTestBooking();
      testIds.bookingIds.push(booking.id);
      testIds.userIds.push(booking.clientId, booking.contractorId);

      // 2. Create REAL PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 3300,
        currency: 'mxn',
        payment_method: 'pm_card_visa',
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: {
          booking_id: booking.id,
        },
      });

      // 3. Create payment record
      const payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          type: 'ANTICIPO',
          amount: new Decimal(33),
          currency: 'mxn',
          status: 'PENDING',
          stripePaymentIntentId: paymentIntent.id,
        },
      });
      testIds.paymentIds.push(payment.id);

      // 4. Create event with real payment intent
      const event: Stripe.PaymentIntentSucceededEvent = {
        id: `evt_test_storage_${Date.now()}`,
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: paymentIntent as Stripe.PaymentIntent,
        },
        api_version: '2024-11-20.acacia',
        created: Date.now(),
        livemode: false,
        pending_webhooks: 0,
        request: { id: null, idempotency_key: null },
      };

      // 5. Process event
      await webhookService.processWebhookEvent(event);

      // 6. Verify event stored in database
      const storedEvent = await prisma.processedWebhookEvent.findUnique({
        where: { stripeEventId: event.id },
      });

      expect(storedEvent).toBeDefined();
      expect(storedEvent!.stripeEventId).toBe(event.id);
      expect(storedEvent!.eventType).toBe('payment_intent.succeeded');

      console.log(`✅ Event ID stored in database`);
    }, 60000);
  });
});
