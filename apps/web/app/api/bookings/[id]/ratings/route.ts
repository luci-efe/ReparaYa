import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import {
    clientRatingService,
    contractorRatingService,
    visibilityService,
} from '@/modules/ratings';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = auth();
        const bookingId = params.id;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
        }

        // Get internal user ID
        const user = await prisma.user.findUnique({
            where: { clerkUserId: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const clientRating = await clientRatingService.getByBookingId(bookingId);
        const contractorRating = await contractorRatingService.getByBookingId(bookingId);

        const canSee = visibilityService.canSeeRating(
            booking as any,
            user.id,
            clientRating,
            contractorRating
        );

        // Format response based on visibility
        // Format response based on visibility
        const formatRating = (rating: any, type: 'CLIENT' | 'CONTRACTOR') => {
            if (!rating) return null;

            // If hidden, return limited data
            if (!canSee) {
                return {
                    id: rating.id,
                    isHidden: true,
                    createdAt: rating.createdAt
                };
            }

            // Map to RatingResponse structure
            return {
                ...rating,
                author: type === 'CLIENT' ? rating.client : rating.contractor,
            };
        };

        const response = {
            clientRating: formatRating(clientRating, 'CLIENT'),
            contractorRating: formatRating(contractorRating, 'CONTRACTOR'),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching ratings:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
