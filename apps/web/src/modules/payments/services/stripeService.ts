/**
 * Stripe Service
 * Lazy-initialized Stripe client - only validates/creates when actually used
 */

import Stripe from 'stripe';

// Lazy-initialized singleton
let stripeClient: Stripe | null = null;
let isValidated = false;

/**
 * Validate required Stripe environment variables
 * Only called when Stripe client is actually needed
 */
function validateStripeEnv(): void {
  if (isValidated) return;

  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Stripe environment variables: ${missing.join(', ')}`
    );
  }

  // Validate key formats
  const secretKey = process.env.STRIPE_SECRET_KEY!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  if (!secretKey.startsWith('sk_')) {
    throw new Error(
      'Invalid STRIPE_SECRET_KEY format. Must start with "sk_"'
    );
  }

  if (!webhookSecret.startsWith('whsec_')) {
    throw new Error(
      'Invalid STRIPE_WEBHOOK_SECRET format. Must start with "whsec_"'
    );
  }

  // Log which mode we're in (test/live)
  const mode = secretKey.includes('test') ? 'TEST MODE' : 'LIVE MODE';
  console.log(`[StripeService] Initialized in ${mode}`);

  if (!secretKey.includes('test')) {
    console.warn(
      '[StripeService] WARNING: Using LIVE Stripe keys. Ensure this is intentional.'
    );
  }

  isValidated = true;
}

/**
 * Get Stripe client (lazy initialization)
 * Only validates and creates client when first accessed
 */
function getStripeClient(): Stripe {
  if (!stripeClient) {
    validateStripeEnv();
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-11-17.clover',
      appInfo: {
        name: 'ReparaYa',
        version: '1.0.0',
        url: 'https://reparaya.com',
      },
    });
    console.log('[StripeService] Stripe client ready');
  }
  return stripeClient;
}

/**
 * Stripe client - lazy initialized on first access
 * Use this for all Stripe API calls
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const client = getStripeClient();
    const value = client[prop as keyof Stripe];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

/**
 * Get Stripe webhook secret
 */
export function getWebhookSecret(): string {
  validateStripeEnv();
  return process.env.STRIPE_WEBHOOK_SECRET!;
}

/**
 * Get Stripe publishable key (for client-side)
 */
export function getPublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
}

/**
 * Check if we're in test mode
 */
export function isTestMode(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? key.includes('test') : true;
}
