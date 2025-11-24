/**
 * API Route: GET /api/contractors/[id]/availability/slots
 * Generate available time slots for a contractor
 * This is a PUBLIC endpoint - clients can view slots
 */

import { NextRequest, NextResponse } from 'next/server';
import { slotGeneratorService } from '@/modules/contractors/availability/services/slotGeneratorService';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const serviceId = searchParams.get('serviceId') || undefined;

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: 'startDate y endDate son requeridos' },
                { status: 400 }
            );
        }

        // Validate date format (basic)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return NextResponse.json(
                { error: 'Formato de fecha inválido. Usa YYYY-MM-DD' },
                { status: 400 }
            );
        }

        // Generate slots
        const slots = await slotGeneratorService.generateSlots(
            params.id,
            startDate,
            endDate,
            serviceId
        );

        return NextResponse.json(slots);
    } catch (error) {
        if (error instanceof Error) {
            // Check for specific validation errors
            if (error.message.includes('rango máximo') || error.message.includes('zona horaria')) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
            if (error.message.includes('no encontrado')) {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }
        }

        console.error('Error generating slots:', error);
        return NextResponse.json(
            { error: 'Error al generar slots disponibles' },
            { status: 500 }
        );
    }
}
