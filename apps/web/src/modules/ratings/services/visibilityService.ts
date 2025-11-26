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

        if (!isClient && !isContractor) {
            // Public or admin can see if deadline expired or both submitted
            // For now, let's say public can see if both submitted or deadline expired
            // But usually public only sees aggregated stats or approved reviews on profile
            // This logic is mainly for the participants
            return true;
        }

        const bothSubmitted = !!clientRating && !!contractorRating;
        const deadlineExpired = booking.completedAt
            ? differenceInDays(new Date(), booking.completedAt) >= 7
            : false;

        return bothSubmitted || deadlineExpired;
    },

    calculateRevealDeadline(completedAt: Date): Date {
        const deadline = new Date(completedAt);
        deadline.setDate(deadline.getDate() + 7);
        return deadline;
    },
};
