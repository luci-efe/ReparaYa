import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { statsService } from '@/modules/ratings';

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const ratingId = params.id;
        const { status, type } = await req.json(); // type: 'CLIENT' | 'CONTRACTOR'

        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        if (type === 'CLIENT') {
            const rating = await prisma.clientRating.update({
                where: { id: ratingId },
                data: { moderationStatus: status },
            });

            if (status === 'APPROVED') {
                await statsService.recalculateUserStats(rating.contractorId, 'CONTRACTOR');
                await statsService.recalculateServiceStats(rating.serviceId);
            }
            return NextResponse.json(rating);
        } else if (type === 'CONTRACTOR') {
            const rating = await prisma.contractorRating.update({
                where: { id: ratingId },
                data: { moderationStatus: status },
            });
            if (status === 'APPROVED') {
                await statsService.recalculateUserStats(rating.clientId, 'CLIENT');
            }
            return NextResponse.json(rating);
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

    } catch (error) {
        console.error('Error updating rating status:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
