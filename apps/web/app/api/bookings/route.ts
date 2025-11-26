import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BookingService } from '@/modules/booking/services/bookingService';
import { createBookingSchema } from '@/modules/booking/validators';
import { prisma } from '@/lib/db';
import { ZodError } from 'zod';

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

        // Validate request body
        const validatedData = createBookingSchema.parse(body);

        const booking = await bookingService.createBooking(validatedData, user.id);

        return NextResponse.json(booking, { status: 201 });
    } catch (error) {
        console.error('Error creating booking:', error);

        if (error instanceof ZodError) {
            return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
        }

        if (error instanceof Error) {
            if (error.name === 'SlotNotAvailableError') {
                return NextResponse.json({ error: error.message }, { status: 409 });
            }
        }

        return NextResponse.json(
            { error: 'Error al crear la reserva' },
            { status: 500 }
        );
    }
}
