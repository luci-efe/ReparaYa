/**
 * Payments Module Exports
 * Public API for the payments module
 */

// Services
export { getCheckoutService, CheckoutService } from './services/checkoutService';
export { getWebhookService, WebhookService } from './services/webhookService';
export { getPayoutService, PayoutService } from './services/payoutService';
export { getRefundService, RefundService } from './services/refundService';
export { calculateBookingAmounts, validateCommissionConfig } from './services/commissionService';
export { stripe, getWebhookSecret, getPublishableKey, isTestMode } from './services/stripeService';

// Repositories
export { getPaymentRepository, PaymentRepository } from './repositories/paymentRepository';
export { getWebhookEventRepository, WebhookEventRepository } from './repositories/webhookEventRepository';

// Types
export type {
  BookingAmounts,
  CreatePaymentInput,
  UpdatePaymentStatusInput,
  CheckoutSessionResult,
  CheckoutMetadata,
  WebhookProcessingResult,
  CreateProcessedWebhookEventInput,
  PayoutResult,
  ConnectAccountResult,
  ConnectOnboardingLinkResult,
  RefundInput,
  RefundResult,
  Payment,
  PaymentStatus,
  PaymentType,
  ProcessedWebhookEvent,
} from './types';

// Errors
export {
  PaymentError,
  BookingNotFoundError,
  PaymentNotFoundError,
  MissingConnectAccountError,
  InvalidWebhookSignatureError,
} from './types';

// Validators
export {
  createCheckoutSessionSchema,
  processRefundSchema,
  createPayoutSchema,
  createConnectAccountSchema,
  sanitizeMetadata,
} from './validators';
