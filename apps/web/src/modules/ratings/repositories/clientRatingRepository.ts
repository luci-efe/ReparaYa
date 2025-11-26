import { prisma } from '@/lib/db';
import { CreateClientRatingDTO } from '../types';
import { ClientRating } from '@prisma/client';

export const clientRatingRepository = {
    async create(data: CreateClientRatingDTO): Promise<ClientRating> {
        return prisma.clientRating.create({
            data: {
                bookingId: data.bookingId,
                serviceId: data.serviceId,
                contractorId: data.contractorId,
                clientId: 'temp-id', // This will be overridden by the service using the authenticated user
                stars: data.stars,
                comment: data.comment,
            },
        });
    },

    async findByBookingId(bookingId: string) {
        return prisma.clientRating.findUnique({
            where: { bookingId },
            include: {
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        avatarUrl: true,
                    },
                },
            },
        });
    },

    async findByContractorId(
        contractorId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ ratings: ClientRating[]; total: number }> {
        const skip = (page - 1) * limit;
        const [ratings, total] = await prisma.$transaction([
            prisma.clientRating.findMany({
                where: {
                    contractorId,
                    moderationStatus: 'APPROVED',
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    client: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                        },
                    },
                },
            }),
            prisma.clientRating.count({
                where: {
                    contractorId,
                    moderationStatus: 'APPROVED',
                },
            }),
        ]);

        return { ratings, total };
    },

    async findByServiceId(
        serviceId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ ratings: ClientRating[]; total: number }> {
        const skip = (page - 1) * limit;
        const [ratings, total] = await prisma.$transaction([
            prisma.clientRating.findMany({
                where: {
                    serviceId,
                    moderationStatus: 'APPROVED',
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    client: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                        },
                    },
                },
            }),
            prisma.clientRating.count({
                where: {
                    serviceId,
                    moderationStatus: 'APPROVED',
                },
            }),
        ]);

        return { ratings, total };
    },
};
