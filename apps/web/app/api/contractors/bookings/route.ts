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

        let status: BookingStatus | BookingStatus[] | undefined;
        if (statusParam) {
            status = statusParam.split(',') as BookingStatus[];
        }

        // We need to access the repository directly for the advanced filtering method
        // or expose it via service. For now, let's use the repository method directly via service if possible
        // But since we didn't expose it in service yet (we just fixed the simple getter), 
        // let's add a new method to service or just use the repository here for now?
        // Better practice: Add method to service.

        // Let's assume we'll add `getContractorBookingsWithFilters` to service.
        // But to avoid circular dependency or waiting, I'll implement the logic here using the repository
        // actually I can just cast the service to any to access the repository or better yet,
        // I should have updated the service to expose this.

        // Let's update the service to expose this properly in the next step.
        // For now, I will use the simple getContractorBookings if no filters, but that returns all.
        // I'll implement a new method in the service in the next step.

        // Wait, I can't leave this file broken. 
        // I will implement the route assuming the service has the method `getContractorBookingsWithFilters`
        // and I will add it to the service in the next step.

        // Actually, I can just instantiate the repository here if I export it, but it's not exported from the module index.
        // I'll stick to the plan: Update service, then route.

        // Since I'm writing this file now, I'll write it assuming the service update is coming.

        // Re-reading my previous step: I updated `getContractorBookings` to return `Booking[]`.
        // I should probably overload it or add a new method.

        // Let's write this file to use a new method `getContractorBookingsPaged` which I will add to the service.

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
