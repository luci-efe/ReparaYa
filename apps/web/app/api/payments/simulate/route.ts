import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { PaymentService } from '@/modules/payments/services/paymentService';
import { BookingService } from '@/modules/booking/services/bookingService';
import { prisma } from '@/lib/db';
import { BookingStatus, PaymentType } from '@/modules/booking/types';

const paymentService = new PaymentService();
const bookingService = new BookingService();

const simulatePaymentSchema = z.object({
    bookingId: z.string().uuid(),
    type: z.nativeEnum(PaymentType),
    amount: z.number().positive(),
});

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
        
        // Validate input with Zod
        const validationResult = simulatePaymentSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json({ error: 'Datos inválidos', details: validationResult.error.flatten() }, { status: 400 });
        }
        
        const { bookingId, type, amount } = validationResult.data;

        // Verify booking exists and user has access
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
        }

        if (booking.clientId !== user.id && booking.contractorId !== user.id) {
            return NextResponse.json({ error: 'No autorizado para simular pago en esta reserva' }, { status: 403 });
        }

        // Simulate payment
        const payment = await paymentService.simulatePayment({
            bookingId,
            type,
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
