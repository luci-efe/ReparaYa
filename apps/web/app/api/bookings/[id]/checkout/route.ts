/**
 * Checkout API Endpoint
 * Creates Stripe Checkout Sessions for booking payments
 *
 * POST /api/bookings/[id]/checkout
 * - Requires authenticated client who owns the booking
 * - Creates a Stripe Checkout Session for the 30% advance payment
 * - Returns checkout URL to redirect user to Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getCheckoutService } from '@/modules/payments/services/checkoutService';
import { BookingNotFoundError } from '@/modules/payments/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bookings/[id]/checkout
 * Creates a Stripe Checkout Session for the booking's advance payment
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Get booking ID from params
    const { id: bookingId } = await params;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // 3. Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 4. Verify user owns this booking (is the client)
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        clientId: true,
        status: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.clientId !== user.id) {
      return NextResponse.json(
        { error: 'You are not authorized to pay for this booking' },
        { status: 403 }
      );
    }

    // 5. Verify booking is in correct status for payment
    if (booking.status !== 'PENDING_PAYMENT') {
      return NextResponse.json(
        {
          error: 'This booking cannot be paid at this time',
          currentStatus: booking.status,
        },
        { status: 400 }
      );
    }

    // 6. Create checkout session
    const checkoutService = getCheckoutService(prisma);
    const result = await checkoutService.createCheckoutSession(bookingId);

    console.log('[Checkout API] Session created:', {
      bookingId,
      sessionId: result.sessionId,
      userId: user.id,
    });

    // 7. Return checkout URL
    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      checkoutUrl: result.checkoutUrl,
      paymentId: result.payment.id,
    });

  } catch (error) {
    console.error('[Checkout API] Error:', error);

    if (error instanceof BookingNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bookings/[id]/checkout
 * Get checkout status for a booking
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 2. Get booking ID from params
    const { id: bookingId } = await params;

    // 3. Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 4. Get booking with payment info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          where: { type: 'ANTICIPO' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // 5. Check authorization
    if (booking.clientId !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    // 6. Return status
    const payment = booking.payments[0];

    return NextResponse.json({
      bookingId: booking.id,
      bookingStatus: booking.status,
      payment: payment ? {
        id: payment.id,
        status: payment.status,
        amount: payment.amount.toString(),
        createdAt: payment.createdAt,
      } : null,
      canPay: booking.status === 'PENDING_PAYMENT',
    });

  } catch (error) {
    console.error('[Checkout API] GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to get checkout status' },
      { status: 500 }
    );
  }
}
