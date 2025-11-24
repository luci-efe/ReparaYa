/**
 * Payment Repository
 * Data access layer for Payment entities
 */

import { PrismaClient, Payment, PaymentStatus, Prisma } from '@prisma/client';
import { CreatePaymentInput, PaymentNotFoundError } from '../types';

/**
 * Payment repository for CRUD operations
 */
export class PaymentRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new payment record
   */
  async createPayment(data: CreatePaymentInput): Promise<Payment> {
    return this.prisma.payment.create({
      data: {
        bookingId: data.bookingId,
        type: data.type,
        amount: data.amount,
        currency: data.currency || 'mxn',
        stripePaymentIntentId: data.stripePaymentIntentId,
        stripeCheckoutSessionId: data.stripeCheckoutSessionId,
        stripeTransferId: data.stripeTransferId,
        status: data.status || 'PENDING',
        metadata: (data.metadata || {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Find payment by ID
   */
  async findById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { id },
    });
  }

  /**
   * Find payment by Stripe Payment Intent ID
   */
  async findByStripePaymentIntentId(
    stripePaymentIntentId: string
  ): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { stripePaymentIntentId },
    });
  }

  /**
   * Find payment by Stripe Checkout Session ID
   */
  async findByStripeCheckoutSessionId(
    stripeCheckoutSessionId: string
  ): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { stripeCheckoutSessionId },
    });
  }

  /**
   * Find all payments for a booking
   */
  async findByBookingId(bookingId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update payment status
   */
  async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    try {
      return await this.prisma.payment.update({
        where: { id },
        data: { status },
      });
    } catch (error) {
      throw new PaymentNotFoundError(id);
    }
  }

  /**
   * Update payment with Stripe Payment Intent ID
   */
  async updateStripePaymentIntentId(
    id: string,
    stripePaymentIntentId: string
  ): Promise<Payment> {
    try {
      return await this.prisma.payment.update({
        where: { id },
        data: { stripePaymentIntentId },
      });
    } catch (error) {
      throw new PaymentNotFoundError(id);
    }
  }

  /**
   * Check if a payout already exists for a booking
   * (Prevents duplicate payouts - idempotency)
   */
  async payoutExistsForBooking(bookingId: string): Promise<boolean> {
    const payout = await this.prisma.payment.findFirst({
      where: {
        bookingId,
        type: 'LIQUIDACION',
      },
    });

    return payout !== null;
  }
}

/**
 * Singleton instance
 */
let paymentRepository: PaymentRepository | null = null;

export function getPaymentRepository(prisma: PrismaClient): PaymentRepository {
  if (!paymentRepository) {
    paymentRepository = new PaymentRepository(prisma);
  }
  return paymentRepository;
}
