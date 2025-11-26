import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import {
    clientRatingService,
    contractorRatingService,
    visibilityService,
} from '@/modules/ratings';
import { Booking, ClientRating } from '@prisma/client';

interface RatingWithAuthor extends ClientRating {
    client?: {
        id: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
    };
    contractor?: {
        id: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
    };
}

export async function GET(
    _req: NextRequest,
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
            booking as Booking & { completedAt: Date | null },
            user.id,
            clientRating,
            contractorRating
        );

        // Format response based on visibility
        const formatRating = (rating: RatingWithAuthor | null, type: 'CLIENT' | 'CONTRACTOR') => {
            if (!rating) return null;

            // Check if user is the author of this rating
            const isAuthor = (type === 'CLIENT' && user.id === rating.clientId) ||
                (type === 'CONTRACTOR' && user.id === rating.contractorId);

            // If hidden and not author, return limited data
            if (!canSee && !isAuthor) {
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
            clientRating: formatRating(clientRating as RatingWithAuthor | null, 'CLIENT'),
            contractorRating: formatRating(contractorRating as RatingWithAuthor | null, 'CONTRACTOR'),
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
