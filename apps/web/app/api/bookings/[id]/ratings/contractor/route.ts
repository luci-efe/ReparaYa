import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { contractorRatingService, createContractorRatingSchema } from '@/modules/ratings';
import { DuplicateRatingError, RatingNotAuthorizedError, BookingNotCompletedError } from '@/modules/ratings/errors';
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

        // Return the rating with the author info for consistency
        return NextResponse.json({
            ...rating,
            author: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                avatarUrl: user.avatarUrl,
            },
        });
    } catch (error) {
        console.error('Error creating contractor rating:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        if (error instanceof DuplicateRatingError) {
            return NextResponse.json({ error: error.message }, { status: 409 });
        }
        if (error instanceof RatingNotAuthorizedError) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error instanceof BookingNotCompletedError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
