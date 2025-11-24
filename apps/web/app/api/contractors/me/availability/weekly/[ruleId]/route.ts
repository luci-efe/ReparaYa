/**
 * API Route: PATCH/DELETE /api/contractors/me/availability/weekly/[ruleId]
 * Manage individual weekly règles
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { availabilityService, UnauthorizedError, NotFoundError } from '@/modules/contractors/availability/services/availabilityService';

export async function PATCH(
    req: NextRequest,
    { params }: { params: { ruleId: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const body = await req.json();
        const rule = await availabilityService.updateWeeklyRule(userId, params.ruleId, body);

        return NextResponse.json(rule);
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error('Error updating weekly rule:', error);
        return NextResponse.json(
            { error: 'Error al actualizar horario' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { ruleId: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        await availabilityService.deleteWeeklyRule(userId, params.ruleId);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error('Error deleting weekly rule:', error);
        return NextResponse.json(
            { error: 'Error al eliminar horario' },
            { status: 500 }
        );
    }
}
