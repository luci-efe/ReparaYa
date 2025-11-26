import { prisma } from '@/lib/db';
import { CreateContractorRatingDTO } from '../types';
import { contractorRatingRepository } from '../repositories/contractorRatingRepository';
import { statsService } from './statsService';
import {
    BookingNotCompletedError,
    DuplicateRatingError,
    RatingNotAuthorizedError,
} from '../errors';

export const contractorRatingService = {
    async create(bookingId: string, contractorId: string, data: CreateContractorRatingDTO) {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.contractorId !== contractorId) {
            throw new RatingNotAuthorizedError();
        }

        if (booking.status !== 'COMPLETED') {
            throw new BookingNotCompletedError(bookingId);
        }

        const existingRating = await contractorRatingRepository.findByBookingId(bookingId);
        if (existingRating) {
            throw new DuplicateRatingError(bookingId);
        }

        // Auto-approve if no comment
        const moderationStatus = data.comment ? 'PENDING' : 'APPROVED';

        const rating = await prisma.contractorRating.create({
            data: {
                bookingId,
                contractorId,
                clientId: booking.clientId,
                stars: data.stars,
                comment: data.comment,
                moderationStatus,
            },
        });

        if (moderationStatus === 'APPROVED') {
            await statsService.recalculateUserStats(booking.clientId, 'CLIENT');
        }

        return rating;
    },

    async getByBookingId(bookingId: string) {
        return contractorRatingRepository.findByBookingId(bookingId);
    },

    async getForClient(clientId: string, page: number = 1, limit: number = 10) {
        return contractorRatingRepository.findByClientId(clientId, page, limit);
    },
};
