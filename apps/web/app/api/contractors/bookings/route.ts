import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { BookingService } from '@/modules/booking/services/bookingService';
import { prisma } from '@/lib/db';
import { BookingStatus } from '@/modules/booking/types';

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

        // Parse query params
        const searchParams = req.nextUrl.searchParams;
        const statusParam = searchParams.get('status');
        const page = Number(searchParams.get('page')) || 1;
        const limit = Number(searchParams.get('limit')) || 10;

        // Validate status values against BookingStatus enum
        const validStatuses = Object.values(BookingStatus) as string[];
        let status: BookingStatus | BookingStatus[] | undefined;
        if (statusParam) {
            const requestedStatuses = statusParam.split(',');
            const invalidStatuses = requestedStatuses.filter(s => !validStatuses.includes(s));
            if (invalidStatuses.length > 0) {
                return NextResponse.json(
                    { error: `Estado(s) inválido(s): ${invalidStatuses.join(', ')}` },
                    { status: 400 }
                );
            }
            status = requestedStatuses as BookingStatus[];
        }

        const result = await bookingService.getContractorBookingsPaged(user.id, {
            status,
            page,
            limit
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching contractor bookings:', error);
        return NextResponse.json(
            { error: 'Error al obtener reservas del contratista' },
            { status: 500 }
        );
    }
}
