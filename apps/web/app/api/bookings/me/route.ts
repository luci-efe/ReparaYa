import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BookingService } from '@/modules/booking/services/bookingService';
import { prisma } from '@/lib/db';

const bookingService = new BookingService();

export async function GET(req: NextRequest) {
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

        // Fetch both client and contractor bookings
        const [clientBookings, contractorBookings] = await Promise.all([
            bookingService.getClientBookings(user.id),
            bookingService.getContractorBookings(user.id),
        ]);

        // Combine and sort by date descending
        const allBookings = [...clientBookings, ...contractorBookings].sort(
            (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
        );

        // Remove duplicates if any (shouldn't be unless user booked their own service)
        const uniqueBookings = Array.from(new Map(allBookings.map(item => [item.id, item])).values());

        return NextResponse.json(uniqueBookings);
    } catch (error) {
        console.error('Error fetching bookings:', error);
        return NextResponse.json(
            { error: 'Error al obtener reservas' },
            { status: 500 }
        );
    }
}
