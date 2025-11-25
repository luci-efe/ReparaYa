/**
 * Stripe Service Tests
 * Tests for Stripe client initialization and helper functions
 */

import { stripe, getWebhookSecret, getPublishableKey, isTestMode } from '../../services/stripeService';

describe('StripeService', () => {
  describe('Stripe client initialization', () => {
    it('should initialize Stripe client', () => {
      expect(stripe).toBeDefined();
      expect(typeof stripe).toBe('object');
    });

    it('should have Stripe SDK methods available', () => {
      expect(stripe.paymentIntents).toBeDefined();
      expect(stripe.checkout).toBeDefined();
      expect(stripe.transfers).toBeDefined();
      expect(stripe.refunds).toBeDefined();
    });
  });

  describe('TC-PAY-001-01: Stripe client ready', () => {
    it('should have Stripe client ready with valid configuration', () => {
      expect(stripe).toBeDefined();
      expect(typeof stripe).toBe('object');

      // Verify essential Stripe methods exist
      expect(stripe.paymentIntents).toBeDefined();
      expect(stripe.webhooks).toBeDefined();
    });
  });

  describe('getWebhookSecret()', () => {
    it('should return webhook secret from environment', () => {
      const secret = getWebhookSecret();

      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);

      // Should start with whsec_ (Stripe webhook secret format)
      expect(secret.startsWith('whsec_')).toBe(true);
    });
  });

  describe('getPublishableKey()', () => {
    it('should return publishable key from environment', () => {
      const key = getPublishableKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);

      // Should start with pk_ (Stripe publishable key format)
      expect(key.startsWith('pk_')).toBe(true);
    });
  });

  describe('isTestMode()', () => {
    it('should return true when using test keys', () => {
      const testMode = isTestMode();

      // Our test environment should use test keys
      expect(testMode).toBe(true);
    });

    it('should detect test mode from secret key', () => {
      // Verify the STRIPE_SECRET_KEY contains 'test'
      const secretKey = process.env.STRIPE_SECRET_KEY || '';
      expect(secretKey).toContain('test');

      // isTestMode should return true
      expect(isTestMode()).toBe(true);
    });
  });

  describe('Environment variable validation', () => {
    it('should have all required Stripe env vars configured', () => {
      expect(process.env.STRIPE_SECRET_KEY).toBeDefined();
      expect(process.env.STRIPE_WEBHOOK_SECRET).toBeDefined();
      expect(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBeDefined();
    });

    it('should have valid STRIPE_SECRET_KEY format', () => {
      const key = process.env.STRIPE_SECRET_KEY!;
      expect(key.startsWith('sk_')).toBe(true);
    });

    it('should have valid STRIPE_WEBHOOK_SECRET format', () => {
      const secret = process.env.STRIPE_WEBHOOK_SECRET!;
      expect(secret.startsWith('whsec_')).toBe(true);
    });

    it('should have valid NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY format', () => {
      const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
      expect(key.startsWith('pk_')).toBe(true);
    });
  });
});
