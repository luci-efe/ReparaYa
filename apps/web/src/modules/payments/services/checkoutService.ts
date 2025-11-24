/**
 * Checkout Service
 * Creates Stripe Checkout Sessions for advance payments
 */

import { PrismaClient } from '@prisma/client';
import { stripe } from './stripeService';
import { calculateBookingAmounts } from './commissionService';
import { getPaymentRepository } from '../repositories/paymentRepository';
import {
  BookingNotFoundError,
  CheckoutSessionResult,
  CheckoutMetadata,
} from '../types';

/**
 * Checkout service for creating payment sessions
 */
export class CheckoutService {
  private paymentRepository;

  constructor(private prisma: PrismaClient) {
    this.paymentRepository = getPaymentRepository(prisma);
  }

  /**
   * Create a Stripe Checkout Session for advance payment (30%)
   *
   * Flow:
   * 1. Fetch booking with service and client data
   * 2. Calculate advance amount (30% of final price)
   * 3. Create Stripe Checkout Session
   * 4. Create Payment record with status PENDING
   * 5. Return session URL
   *
   * @param bookingId - Booking ID to create checkout for
   * @returns Checkout session ID, URL, and payment record
   */
  async createCheckoutSession(
    bookingId: string
  ): Promise<CheckoutSessionResult> {
    // 1. Fetch booking data
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        client: true,
      },
    });

    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }

    // 2. Get amounts (should already be calculated and stored in booking)
    // But we can recalculate to ensure consistency
    const amounts = calculateBookingAmounts(booking.basePrice);

    // 3. Create Stripe Checkout Session
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const metadata: CheckoutMetadata = {
      booking_id: booking.id,
      service_id: booking.serviceId,
      client_id: booking.clientId,
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            unit_amount: Math.round(amounts.anticipoAmount.toNumber() * 100), // Convert to cents
            product_data: {
              name: booking.service.title,
              description: `Anticipo 30% - Servicio programado para ${booking.scheduledDate.toLocaleDateString('es-MX')}`,
              images: booking.service.images.length > 0
                ? [booking.service.images[0]]
                : undefined,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: booking.client.email,
      success_url: `${appUrl}/bookings/${booking.id}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/bookings/${booking.id}/cancelled`,
      metadata,
      payment_intent_data: {
        metadata,
      },
    });

    // 4. Create Payment record
    const payment = await this.paymentRepository.createPayment({
      bookingId: booking.id,
      type: 'ANTICIPO',
      amount: amounts.anticipoAmount,
      currency: 'mxn',
      stripeCheckoutSessionId: session.id,
      status: 'PENDING',
      metadata: {
        sessionUrl: session.url,
        createdAt: new Date().toISOString(),
      },
    });

    console.log('[CheckoutService] Created checkout session:', {
      bookingId: booking.id,
      sessionId: session.id,
      amount: amounts.anticipoAmount.toString(),
      paymentId: payment.id,
    });

    // 5. Return result
    return {
      sessionId: session.id,
      checkoutUrl: session.url!,
      payment,
    };
  }
}

/**
 * Singleton instance
 */
let checkoutService: CheckoutService | null = null;

export function getCheckoutService(prisma: PrismaClient): CheckoutService {
  if (!checkoutService) {
    checkoutService = new CheckoutService(prisma);
  }
  return checkoutService;
}
