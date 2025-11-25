/**
 * API Route: DELETE /api/contractors/me/availability/blocks/[blockId]
 * Delete individual block
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { availabilityService, UnauthorizedError, NotFoundError } from '@/modules/contractors/availability/services/availabilityService';

export async function DELETE(
    req: NextRequest,
    { params }: { params: { blockId: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        await availabilityService.deleteBlock(userId, params.blockId);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error instanceof NotFoundError) {
            return NextResponse.json({ error: error.message }, { status: 404 });
        }
        console.error('Error deleting block:', error);
        return NextResponse.json(
            { error: 'Error al eliminar bloqueo' },
            { status: 500 }
        );
    }
}
