import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
    try {
        const { userId } = auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin (simplified check, ideally use RBAC)
        const user = await prisma.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const clientRatings = await prisma.clientRating.findMany({
            where: { moderationStatus: 'PENDING' },
            include: {
                booking: {
                    include: {
                        client: true,
                        contractor: true,
                        service: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const contractorRatings = await prisma.contractorRating.findMany({
            where: { moderationStatus: 'PENDING' },
            include: {
                booking: {
                    include: {
                        client: true,
                        contractor: true,
                        service: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            clientRatings,
            contractorRatings
        });

    } catch (error) {
        console.error('Error fetching pending ratings:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
