/**
 * API Route: GET/POST /api/contractors/me/availability/exceptions
 * Manage contractor availability exceptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { availabilityService } from '@/modules/contractors/availability/services/availabilityService';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        // Get contractor profile
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

        const exceptions = await availabilityService.listExceptions(
            contractor.id,
            startDate,
            endDate
        );

        return NextResponse.json(exceptions);
    } catch (error) {
        console.error('Error fetching exceptions:', error);
        return NextResponse.json(
            { error: 'Error al obtener excepciones' },
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

        const exception = await availabilityService.createException(
            userId,
            contractor.id,
            body
        );

        return NextResponse.json(exception, { status: 201 });
    } catch (error) {
        console.error('Error creating exception:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        return NextResponse.json(
            { error: 'Error al crear excepción', details: errorMessage },
            { status: 500 }
        );
    }
}
