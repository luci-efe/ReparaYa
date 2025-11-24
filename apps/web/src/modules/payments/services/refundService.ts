/**
 * Refund Service
 * Processes refunds when bookings are cancelled
 */

import { PrismaClient } from '@prisma/client';
import { stripe } from './stripeService';
import { getPaymentRepository } from '../repositories/paymentRepository';
import {
  BookingNotFoundError,
  PaymentNotFoundError,
  RefundInput,
  RefundResult,
} from '../types';

/**
 * Refund service for processing payment refunds
 */
export class RefundService {
  private paymentRepository;

  constructor(private prisma: PrismaClient) {
    this.paymentRepository = getPaymentRepository(prisma);
  }

  /**
   * Process refund for a cancelled booking
   *
   * @param input - Refund input (booking ID, reason, optional amount)
   * @returns Refund result with payment records
   */
  async processRefund(input: RefundInput): Promise<RefundResult> {
    // 1. Find booking
    const booking = await this.prisma.booking.findUnique({
      where: { id: input.bookingId },
    });

    if (!booking) {
      throw new BookingNotFoundError(input.bookingId);
    }

    // 2. Find original ANTICIPO payment
    const originalPayment = await this.prisma.payment.findFirst({
      where: {
        bookingId: input.bookingId,
        type: 'ANTICIPO',
        status: 'SUCCEEDED',
      },
    });

    if (!originalPayment) {
      throw new PaymentNotFoundError(
        `No successful advance payment found for booking ${input.bookingId}`
      );
    }

    if (!originalPayment.stripePaymentIntentId) {
      throw new Error(
        `Payment ${originalPayment.id} has no Stripe Payment Intent ID`
      );
    }

    // 3. Calculate refund amount
    // TODO: Apply cancellation policy (BR-004) based on time until scheduled date
    // For now: full refund
    const refundAmount = input.amount || originalPayment.amount;

    // 4. Create Stripe Refund
    const refund = await stripe.refunds.create({
      payment_intent: originalPayment.stripePaymentIntentId,
      amount: Math.round(refundAmount.toNumber() * 100), // Convert to cents
      reason: 'requested_by_customer',
      metadata: {
        booking_id: input.bookingId,
        original_payment_id: originalPayment.id,
        reason: input.reason,
      },
    });

    // 5. Update original payment status
    await this.paymentRepository.updateStatus(
      originalPayment.id,
      'REFUNDED'
    );

    // 6. Create REEMBOLSO payment record
    const refundPayment = await this.paymentRepository.createPayment({
      bookingId: input.bookingId,
      type: 'REEMBOLSO',
      amount: refundAmount,
      currency: originalPayment.currency,
      status: 'SUCCEEDED',
      metadata: {
        originalPaymentId: originalPayment.id,
        refundId: refund.id,
        reason: input.reason,
        refundedAt: new Date().toISOString(),
      },
    });

    console.log(`[RefundService] Refund processed for booking ${input.bookingId}`, {
      refundPaymentId: refundPayment.id,
      refundId: refund.id,
      amount: refundAmount.toString(),
      reason: input.reason,
    });

    return {
      payment: refundPayment,
      stripeRefundId: refund.id,
      amount: refundAmount,
      originalPayment,
    };
  }
}

/**
 * Singleton instance
 */
let refundService: RefundService | null = null;

export function getRefundService(prisma: PrismaClient): RefundService {
  if (!refundService) {
    refundService = new RefundService(prisma);
  }
  return refundService;
}
