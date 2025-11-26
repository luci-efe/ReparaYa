import { prisma } from '@/lib/db';
import { CreateClientRatingDTO } from '../types';
import { clientRatingRepository } from '../repositories/clientRatingRepository';
import { statsService } from './statsService';
import {
    BookingNotCompletedError,
    DuplicateRatingError,
    RatingNotAuthorizedError,
} from '../errors';

export const clientRatingService = {
    async create(bookingId: string, clientId: string, data: CreateClientRatingDTO) {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new Error('Booking not found');
        }

        if (booking.clientId !== clientId) {
            throw new RatingNotAuthorizedError();
        }

        if (booking.status !== 'COMPLETED') {
            throw new BookingNotCompletedError(bookingId);
        }

        const existingRating = await clientRatingRepository.findByBookingId(bookingId);
        if (existingRating) {
            throw new DuplicateRatingError(bookingId);
        }

        // Auto-approve if no comment
        const moderationStatus = data.comment ? 'PENDING' : 'APPROVED';

        const rating = await prisma.clientRating.create({
            data: {
                bookingId,
                serviceId: booking.serviceId,
                contractorId: booking.contractorId,
                clientId,
                stars: data.stars,
                comment: data.comment,
                moderationStatus,
            },
        });

        if (moderationStatus === 'APPROVED') {
            await statsService.recalculateUserStats(booking.contractorId, 'CONTRACTOR');
            await statsService.recalculateServiceStats(booking.serviceId);
        }

        return rating;
    },

    async getByBookingId(bookingId: string) {
        return clientRatingRepository.findByBookingId(bookingId);
    },

    async getForContractor(contractorId: string, page: number = 1, limit: number = 10) {
        return clientRatingRepository.findByContractorId(contractorId, page, limit);
    },

    async getForService(serviceId: string, page: number = 1, limit: number = 10) {
        return clientRatingRepository.findByServiceId(serviceId, page, limit);
    },
};
