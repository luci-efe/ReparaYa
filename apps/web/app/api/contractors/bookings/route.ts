import { NextRequest, NextResponse } from 'next/server';
import { BookingService } from '@/modules/booking/services/bookingService';
import { BookingStatus } from '@/modules/booking/types';
import { requireRole, UnauthorizedError, ForbiddenError } from '@/modules/auth';

const bookingService = new BookingService();

// Pagination constants
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
    try {
        // Verify user is authenticated and has CONTRACTOR role
        const user = await requireRole('CONTRACTOR');

        // Parse query params
        const searchParams = req.nextUrl.searchParams;
        const statusParam = searchParams.get('status');
        const page = Math.max(1, Number(searchParams.get('page')) || 1);
        const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get('limit')) || DEFAULT_PAGE_SIZE));

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
        // Handle authentication/authorization errors
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }
        if (error instanceof ForbiddenError) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
        
        console.error('Error fetching contractor bookings:', error);
        return NextResponse.json(
            { error: 'Error al obtener reservas del contratista' },
            { status: 500 }
        );
    }
}
