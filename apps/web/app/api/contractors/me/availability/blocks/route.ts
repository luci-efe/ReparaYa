/**
 * API Route: GET/POST /api/contractors/me/availability/blocks
 * Manage contractor availability blocks
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { availabilityService, BookingConflictError } from '@/modules/contractors/availability/services/availabilityService';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const contractor = await prisma.contractorProfile.findFirst({
            where: { user: { clerkUserId: userId } },
        });

        if (!contractor) {
            return NextResponse.json({ error: 'No eres contratista' }, { status: 403 });
        }

        // Get query params for date range
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate') || undefined;
        const endDate = searchParams.get('endDate') || undefined;

        const blocks = await availabilityService.listBlocks(
            contractor.id,
            startDate,
            endDate
        );

        return NextResponse.json(blocks);
    } catch (error) {
        console.error('Error fetching blocks:', error);
        return NextResponse.json(
            { error: 'Error al obtener bloqueos' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const contractor = await prisma.contractorProfile.findFirst({
            where: { user: { clerkUserId: userId } },
        });

        if (!contractor) {
            return NextResponse.json({ error: 'No eres contratista' }, { status: 403 });
        }

        const body = await req.json();

        const block = await availabilityService.createBlock(userId, contractor.id, body);

        return NextResponse.json(block, { status: 201 });
    } catch (error) {
        if (error instanceof BookingConflictError) {
            return NextResponse.json(
                {
                    error: error.message,
                    bookingIds: (error as BookingConflictError).bookingIds,
                },
                { status: 409 }
            );
        }

        console.error('Error creating block:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        return NextResponse.json(
            { error: 'Error al crear bloqueo', details: errorMessage },
            { status: 500 }
        );
    }
}
