import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BookingService } from '@/modules/booking/services/bookingService';
import { prisma } from '@/lib/db';
import { BookingNotFoundError } from '@/modules/booking/errors';

const bookingService = new BookingService();

export async function GET(
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

        const booking = await bookingService.getBookingById(params.id, user.id);

        return NextResponse.json(booking);
    } catch (error) {
        console.error('Error fetching booking:', error);

        if (error instanceof BookingNotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }

        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        return NextResponse.json(
            { error: 'Error al obtener la reserva' },
            { status: 500 }
        );
    }
}
