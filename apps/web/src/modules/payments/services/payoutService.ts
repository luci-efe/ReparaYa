/**
 * Payout Service
 * Creates Stripe Transfers to contractor Connect accounts
 */

import { PrismaClient } from '@prisma/client';
import { stripe } from './stripeService';
import { PaymentRepository, getPaymentRepository } from '../repositories/paymentRepository';
import {
  BookingNotFoundError,
  MissingConnectAccountError,
  PaymentError,
  PayoutResult,
} from '../types';

/**
 * Payout service for transferring funds to contractors
 */
export class PayoutService {
  private paymentRepository: PaymentRepository;

  constructor(private prisma: PrismaClient) {
    this.paymentRepository = getPaymentRepository(prisma);
  }

  /**
   * Create payout to contractor when booking is completed
   *
   * @param bookingId - Booking ID to create payout for
   * @returns Payout result with payment record
   */
  async createPayout(bookingId: string): Promise<PayoutResult> {
    // 1. Check if payout already exists (idempotency)
    const payoutExists = await this.paymentRepository.payoutExistsForBooking(
      bookingId
    );

    if (payoutExists) {
      const existingPayout = await this.prisma.payment.findFirst({
        where: { bookingId, type: 'LIQUIDACION' },
      });

      console.log(
        `[PayoutService] Payout already exists for booking ${bookingId}`
      );

      return {
        payment: existingPayout!,
        stripeTransferId: existingPayout!.stripeTransferId!,
        amount: existingPayout!.amount,
      };
    }

    // 2. Fetch booking with contractor
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        contractor: {
          include: {
            contractorProfile: true,
          },
        },
      },
    });

    if (!booking) {
      throw new BookingNotFoundError(bookingId);
    }

    // 3. Verify contractor exists
    if (!booking.contractor) {
      throw new PaymentError(
        `No contractor found for booking ${bookingId}`,
        'CONTRACTOR_NOT_FOUND',
        400
      );
    }

    // 4. Verify contractor has profile configured
    const contractorProfile = booking.contractor.contractorProfile;
    if (!contractorProfile) {
      throw new PaymentError(
        `Contractor profile not configured for booking ${bookingId}`,
        'CONTRACTOR_PROFILE_NOT_CONFIGURED',
        400
      );
    }

    // 5. Verify contractor has Connect account
    if (!contractorProfile.stripeConnectAccountId) {
      throw new MissingConnectAccountError(booking.contractorId);
    }

    // 6. Verify payout amount exists
    if (!booking.contractorPayoutAmount) {
      throw new PaymentError(
        `Missing payout amount for booking ${bookingId}`,
        'MISSING_PAYOUT_AMOUNT',
        400
      );
    }

    // 7. Get contractor payout amount (85% of final price)
    const payoutAmount = booking.contractorPayoutAmount;

    // 8. Create Stripe Transfer to Connect account
    const transfer = await stripe.transfers.create({
      amount: Math.round(payoutAmount.toNumber() * 100), // Convert to cents
      currency: 'mxn',
      destination: contractorProfile.stripeConnectAccountId,
      metadata: {
        booking_id: booking.id,
        contractor_id: booking.contractorId,
        type: 'liquidacion',
      },
    });

    // 6. Create Payment record
    const payment = await this.paymentRepository.createPayment({
      bookingId: booking.id,
      type: 'LIQUIDACION',
      amount: payoutAmount,
      currency: 'mxn',
      stripeTransferId: transfer.id,
      status: 'SUCCEEDED',
      metadata: {
        transferId: transfer.id,
        contractorId: booking.contractorId,
        createdAt: new Date().toISOString(),
      },
    });

    console.log(`[PayoutService] Payout created for booking ${bookingId}`, {
      paymentId: payment.id,
      transferId: transfer.id,
      amount: payoutAmount.toString(),
      contractorId: booking.contractorId,
    });

    return {
      payment,
      stripeTransferId: transfer.id,
      amount: payoutAmount,
    };
  }
}

/**
 * Singleton instance
 */
let payoutService: PayoutService | null = null;

export function getPayoutService(prisma: PrismaClient): PayoutService {
  if (!payoutService) {
    payoutService = new PayoutService(prisma);
  }
  return payoutService;
}
