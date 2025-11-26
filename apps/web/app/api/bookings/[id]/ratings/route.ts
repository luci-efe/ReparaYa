import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import {
    clientRatingService,
    contractorRatingService,
    visibilityService,
} from '@/modules/ratings';
import { Booking, ClientRating, ContractorRating } from '@prisma/client';

interface AuthorInfo {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
}

// Client ratings include the client (author) information
interface ClientRatingWithAuthor extends ClientRating {
    client?: AuthorInfo;
}

// Contractor ratings include the contractor (author) information
interface ContractorRatingWithAuthor extends ContractorRating {
    contractor?: AuthorInfo;
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

        const clientRating = await clientRatingService.getByBookingId(bookingId) as ClientRatingWithAuthor | null;
        const contractorRating = await contractorRatingService.getByBookingId(bookingId) as ContractorRatingWithAuthor | null;

        const canSee = visibilityService.canSeeRating(
            booking as Booking & { completedAt: Date | null },
            user.id,
            clientRating,
            contractorRating
        );

        // Format client rating based on visibility
        const formatClientRating = (rating: ClientRatingWithAuthor | null) => {
            if (!rating) return null;

            const isAuthor = user.id === rating.clientId;

            if (!canSee && !isAuthor) {
                return {
                    id: rating.id,
                    isHidden: true,
                    createdAt: rating.createdAt
                };
            }

            return {
                ...rating,
                author: rating.client,
            };
        };

        // Format contractor rating based on visibility
        const formatContractorRating = (rating: ContractorRatingWithAuthor | null) => {
            if (!rating) return null;

            const isAuthor = user.id === rating.contractorId;

            if (!canSee && !isAuthor) {
                return {
                    id: rating.id,
                    isHidden: true,
                    createdAt: rating.createdAt
                };
            }

            return {
                ...rating,
                author: rating.contractor,
            };
        };

        const response = {
            clientRating: formatClientRating(clientRating),
            contractorRating: formatContractorRating(contractorRating),
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
