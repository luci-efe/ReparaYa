import { Booking, ClientRating, ContractorRating } from '@prisma/client';
import { differenceInDays } from 'date-fns';

export const visibilityService = {
    canSeeRating(
        booking: Booking & { completedAt: Date | null },
        viewerId: string,
        clientRating: ClientRating | null,
        contractorRating: ContractorRating | null
    ): boolean {
        const isClient = viewerId === booking.clientId;
        const isContractor = viewerId === booking.contractorId;

        const bothSubmitted = !!clientRating && !!contractorRating;
        const deadlineExpired = booking.completedAt
            ? differenceInDays(new Date(), booking.completedAt) >= 7
            : false;

        // For non-participants (public/admin), apply the same double-blind rules
        // Ratings are visible only when both have submitted or deadline expired
        if (!isClient && !isContractor) {
            return bothSubmitted || deadlineExpired;
        }

        return bothSubmitted || deadlineExpired;
    },

    calculateRevealDeadline(completedAt: Date): Date {
        const deadline = new Date(completedAt);
        deadline.setDate(deadline.getDate() + 7);
        return deadline;
    },
};
