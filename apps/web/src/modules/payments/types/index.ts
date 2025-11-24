/**
 * Type definitions for Payments module
 * Handles Stripe payments, webhooks, and commission calculations
 */

import { Decimal } from '@prisma/client/runtime/library';
import { Payment, PaymentStatus, PaymentType } from '@prisma/client';

// ============================================
// BOOKING AMOUNTS (Business Rule Calculations)
// ============================================

/**
 * Result of commission calculation per BR-001, BR-002, BR-003
 *
 * Business Rules:
 * - BR-001: Final price = Base price × 1.10 (10% markup)
 * - BR-002: Commission = 15% of final price, Contractor gets 85%
 * - BR-003: Advance = 30% of final, Settlement = 70% of final
 */
export interface BookingAmounts {
  /** Original service base price */
  basePrice: Decimal;

  /** Final price charged to client (base × 1.10) */
  finalPrice: Decimal;

  /** Advance payment (30% of final) - paid at booking */
  anticipoAmount: Decimal;

  /** Settlement payment (70% of final) - paid after completion */
  liquidacionAmount: Decimal;

  /** Platform commission (15% of final) */
  comisionAmount: Decimal;

  /** Contractor payout (final - 15%) = 85% of final */
  contractorPayoutAmount: Decimal;
}

// ============================================
// PAYMENT OPERATIONS
// ============================================

/**
 * Input for creating a new payment record
 */
export interface CreatePaymentInput {
  bookingId: string;
  type: PaymentType; // ANTICIPO | LIQUIDACION | REEMBOLSO
  amount: Decimal;
  currency?: string; // Default: 'mxn'
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  stripeTransferId?: string;
  status?: PaymentStatus; // Default: PENDING
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating payment status
 */
export interface UpdatePaymentStatusInput {
  id: string;
  status: PaymentStatus; // PENDING | SUCCEEDED | FAILED | REFUNDED
}

// ============================================
// CHECKOUT (STRIPE SESSIONS)
// ============================================

/**
 * Result of creating a Stripe Checkout Session
 */
export interface CheckoutSessionResult {
  /** Stripe Checkout Session ID */
  sessionId: string;

  /** URL to redirect user to Stripe Checkout */
  checkoutUrl: string;

  /** Payment record created in database */
  payment: Payment;
}

/**
 * Metadata stored in Stripe Checkout Session
 */
export interface CheckoutMetadata {
  booking_id: string;
  service_id: string;
  client_id: string;
}

// ============================================
// WEBHOOKS
// ============================================

/**
 * Supported Stripe webhook event types
 */
export type StripeWebhookEventType =
  | 'payment_intent.succeeded'
  | 'payment_intent.payment_failed'
  | 'charge.refunded'
  | 'account.updated';

/**
 * Result of webhook event processing
 */
export interface WebhookProcessingResult {
  /** Whether event was processed successfully */
  success: boolean;

  /** Event ID from Stripe */
  eventId: string;

  /** Event type */
  eventType: string;

  /** Whether this was a duplicate event (idempotency) */
  wasDuplicate: boolean;

  /** Error message if processing failed */
  error?: string;
}

/**
 * Input for creating processed webhook event record
 */
export interface CreateProcessedWebhookEventInput {
  stripeEventId: string;
  eventType: string;
}

// ============================================
// PAYOUTS (STRIPE CONNECT)
// ============================================

/**
 * Result of creating a payout to contractor
 */
export interface PayoutResult {
  /** Payment record for the payout */
  payment: Payment;

  /** Stripe Transfer ID */
  stripeTransferId: string;

  /** Amount paid to contractor */
  amount: Decimal;
}

/**
 * Stripe Connect account creation result
 */
export interface ConnectAccountResult {
  /** Stripe Connect Account ID */
  accountId: string;

  /** Whether charges are enabled */
  chargesEnabled: boolean;

  /** Whether payouts are enabled */
  payoutsEnabled: boolean;
}

/**
 * Stripe Connect onboarding link result
 */
export interface ConnectOnboardingLinkResult {
  /** URL to redirect contractor for KYC */
  url: string;

  /** Expiration timestamp */
  expiresAt: Date;
}

// ============================================
// REFUNDS
// ============================================

/**
 * Input for processing a refund
 */
export interface RefundInput {
  bookingId: string;
  reason: string;
  /** Amount to refund (if partial). Omit for full refund. */
  amount?: Decimal;
}

/**
 * Result of processing a refund
 */
export interface RefundResult {
  /** Refund payment record */
  payment: Payment;

  /** Stripe Refund ID */
  stripeRefundId: string;

  /** Amount refunded */
  amount: Decimal;

  /** Original payment that was refunded */
  originalPayment: Payment;
}

// ============================================
// ERRORS
// ============================================

/**
 * Custom error for payment operations
 */
export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/**
 * Error when booking not found
 */
export class BookingNotFoundError extends PaymentError {
  constructor(bookingId: string) {
    super(
      `Booking not found: ${bookingId}`,
      'BOOKING_NOT_FOUND',
      404
    );
  }
}

/**
 * Error when payment not found
 */
export class PaymentNotFoundError extends PaymentError {
  constructor(identifier: string) {
    super(
      `Payment not found: ${identifier}`,
      'PAYMENT_NOT_FOUND',
      404
    );
  }
}

/**
 * Error when contractor missing Connect account
 */
export class MissingConnectAccountError extends PaymentError {
  constructor(contractorId: string) {
    super(
      `Contractor ${contractorId} has no Stripe Connect account`,
      'MISSING_CONNECT_ACCOUNT',
      400
    );
  }
}

/**
 * Error when webhook signature invalid
 */
export class InvalidWebhookSignatureError extends PaymentError {
  constructor() {
    super(
      'Webhook signature verification failed',
      'INVALID_SIGNATURE',
      400
    );
  }
}

// ============================================
// RE-EXPORTS FROM PRISMA
// ============================================

export type { Payment, PaymentStatus, PaymentType, ProcessedWebhookEvent } from '@prisma/client';
