/**
 * Validators for payments module
 * Uses Zod for runtime validation
 */

import { z } from 'zod';

/**
 * Validator for creating checkout session
 */
export const createCheckoutSessionSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
});

/**
 * Validator for processing refund
 */
export const processRefundSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
  reason: z.string().min(1, 'Reason cannot be empty').max(500, 'Reason too long').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
});

/**
 * Validator for creating payout
 */
export const createPayoutSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID format'),
});

/**
 * Validator for Stripe Connect account creation
 */
export const createConnectAccountSchema = z.object({
  contractorId: z.string().uuid('Invalid contractor ID format'),
});

/**
 * Validator for metadata sanitization
 * Removes potentially dangerous keys
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Skip dangerous keys
    if (
      key.toLowerCase().includes('password') ||
      key.toLowerCase().includes('secret') ||
      key.toLowerCase().includes('token')
    ) {
      continue;
    }

    // Only allow primitive values
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
