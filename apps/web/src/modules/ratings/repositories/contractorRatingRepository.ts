import { prisma } from '@/lib/db';
import { CreateContractorRatingDTO } from '../types';
import { ContractorRating } from '@prisma/client';

export const contractorRatingRepository = {
    async create(data: CreateContractorRatingDTO): Promise<ContractorRating> {
        return prisma.contractorRating.create({
            data: {
                bookingId: data.bookingId,
                contractorId: 'temp-id', // Overridden by service
                clientId: 'temp-id', // Overridden by service
                stars: data.stars,
                comment: data.comment,
            },
        });
    },

    async findByBookingId(bookingId: string) {
        return prisma.contractorRating.findUnique({
            where: { bookingId },
            include: {
                contractor: {
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

    async findByClientId(
        clientId: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ ratings: ContractorRating[]; total: number }> {
        const skip = (page - 1) * limit;
        const [ratings, total] = await prisma.$transaction([
            prisma.contractorRating.findMany({
                where: {
                    clientId,
                    moderationStatus: 'APPROVED',
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    contractor: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                        },
                    },
                },
            }),
            prisma.contractorRating.count({
                where: {
                    clientId,
                    moderationStatus: 'APPROVED',
                },
            }),
        ]);

        return { ratings, total };
    },
};
