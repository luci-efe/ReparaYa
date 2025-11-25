/**
 * API Route: PATCH/DELETE /api/contractors/me/availability/exceptions/[exceptionId]
 * Manage individual exceptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { availabilityService, UnauthorizedError, NotFoundError } from '@/modules/contractors/availability/services/availabilityService';

export async function PATCH(
    req: NextRequest,
    { params }: { params: { exceptionId: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const body = await req.json();
        const exception = await availabilityService.updateException(
            userId,
            params.exceptionId,
            body
        );

        return NextResponse.json(exception);
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error('Error updating exception:', error);
        return NextResponse.json(
            { error: 'Error al actualizar excepción' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { exceptionId: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        await availabilityService.deleteException(userId, params.exceptionId);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error('Error deleting exception:', error);
        return NextResponse.json(
            { error: 'Error al eliminar excepción' },
            { status: 500 }
        );
    }
}
