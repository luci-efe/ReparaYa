/**
 * Stripe Service
 * Initializes and exports Stripe client
 */

import Stripe from 'stripe';

/**
 * Validate required Stripe environment variables
 */
function validateStripeEnv(): void {
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
}

// Validate environment on module load
validateStripeEnv();

/**
 * Stripe client singleton
 * Configured with secret key and latest API version
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
  appInfo: {
    name: 'ReparaYa',
    version: '1.0.0',
    url: 'https://reparaya.com',
  },
});

/**
 * Get Stripe webhook secret
 */
export function getWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET!;
}

/**
 * Get Stripe publishable key (for client-side)
 */
export function getPublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
}

/**
 * Check if we're in test mode
 */
export function isTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY!.includes('test');
}

console.log('[StripeService] Stripe client ready');
