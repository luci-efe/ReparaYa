import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BookingService } from '@/modules/booking/services/bookingService';
import { updateBookingStatusSchema } from '@/modules/booking/validators';
import { prisma } from '@/lib/db';
import { BookingNotFoundError, InvalidStateTransitionError } from '@/modules/booking/errors';
import { ZodError } from 'zod';

const bookingService = new BookingService();

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
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
        const validatedData = updateBookingStatusSchema.parse(body);

        const booking = await bookingService.updateBookingStatus(params.id, validatedData, user.id);

        return NextResponse.json(booking);
    } catch (error) {
        console.error('Error updating booking status:', error);

        if (error instanceof ZodError) {
            return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 });
        }

        if (error instanceof BookingNotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof InvalidStateTransitionError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        return NextResponse.json(
            { error: 'Error al actualizar el estado de la reserva' },
            { status: 500 }
        );
    }
}
