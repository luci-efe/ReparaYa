import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PaymentService } from '@/modules/payments/services/paymentService';
import { BookingService } from '@/modules/booking/services/bookingService';
import { prisma } from '@/lib/db';
import { BookingStatus, PaymentType } from '@/modules/booking/types';

const paymentService = new PaymentService();
const bookingService = new BookingService();

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        const body = await req.json();
        const { bookingId, type, amount } = body;

        if (!bookingId || !type || !amount) {
            return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
        }

        // Simulate payment
        const payment = await paymentService.simulatePayment({
            bookingId,
            type: type as PaymentType,
            amount,
            currency: 'MXN',
            metadata: { simulated: true, by: user.id }
        });

        // If payment is ANTICIPO, confirm booking
        if (type === 'ANTICIPO') {
            try {
                await bookingService.updateBookingStatus(
                    bookingId,
                    { status: BookingStatus.CONFIRMED, notes: 'Pago de anticipo recibido (Simulado)' },
                    user.id
                );
            } catch (e) {
                console.warn('Could not auto-confirm booking:', e);
                // Continue, payment was still successful
            }
        }

        return NextResponse.json(payment, { status: 201 });
    } catch (error) {
        console.error('Error simulating payment:', error);
        return NextResponse.json(
            { error: 'Error al simular pago' },
            { status: 500 }
        );
    }
}
