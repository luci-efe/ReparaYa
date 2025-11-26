import { prisma } from '@/lib/db';
import { UserRatingStats, UserRole } from '@prisma/client';

export const statsRepository = {
    async upsertUserStats(
        userId: string,
        role: UserRole,
        average: number,
        totalRatings: number
    ): Promise<UserRatingStats> {
        return prisma.userRatingStats.upsert({
            where: { userId },
            update: {
                average,
                totalRatings,
                role,
            },
            create: {
                userId,
                role,
                average,
                totalRatings,
            },
        });
    },

    async getUserStats(userId: string): Promise<UserRatingStats | null> {
        return prisma.userRatingStats.findUnique({
            where: { userId },
        });
    },

    async calculateClientStats(clientId: string): Promise<{ average: number; count: number }> {
        const aggregate = await prisma.contractorRating.aggregate({
            where: {
                clientId,
                moderationStatus: 'APPROVED',
            },
            _avg: { stars: true },
            _count: { stars: true },
        });

        return {
            average: aggregate._avg.stars || 0,
            count: aggregate._count.stars || 0,
        };
    },

    async calculateContractorStats(contractorId: string): Promise<{ average: number; count: number }> {
        const aggregate = await prisma.clientRating.aggregate({
            where: {
                contractorId,
                moderationStatus: 'APPROVED',
            },
            _avg: { stars: true },
            _count: { stars: true },
        });

        return {
            average: aggregate._avg.stars || 0,
            count: aggregate._count.stars || 0,
        };
    },
};
