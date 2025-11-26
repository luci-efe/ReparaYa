import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { contractorRatingService, createContractorRatingSchema } from '@/modules/ratings';
import { z } from 'zod';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = auth();
        const bookingId = params.id;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const body = await req.json();
        const validatedData = createContractorRatingSchema.parse({
            ...body,
            bookingId,
        });

        const rating = await contractorRatingService.create(
            bookingId,
            user.id,
            validatedData
        );

        return NextResponse.json({
            ...rating,
            author: rating.contractor,
        });
    } catch (error) {
        console.error('Error creating contractor rating:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
