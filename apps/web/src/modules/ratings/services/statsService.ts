import { prisma } from '@/lib/db';
import { UserRole } from '@prisma/client';
import { statsRepository } from '../repositories/statsRepository';

export const statsService = {
    async recalculateUserStats(userId: string, role: UserRole) {
        let stats;
        if (role === 'CLIENT') {
            stats = await statsRepository.calculateClientStats(userId);
        } else {
            stats = await statsRepository.calculateContractorStats(userId);
        }

        return statsRepository.upsertUserStats(
            userId,
            role,
            stats.average,
            stats.count
        );
    },

    async recalculateServiceStats(serviceId: string) {
        const aggregate = await prisma.clientRating.aggregate({
            where: {
                serviceId,
                moderationStatus: 'APPROVED',
            },
            _avg: { stars: true },
            _count: { stars: true },
        });

        const average = aggregate._avg.stars || 0;
        const totalRatings = aggregate._count.stars || 0;

        return prisma.serviceRatingStats.upsert({
            where: { serviceId },
            update: {
                average,
                totalRatings,
            },
            create: {
                serviceId,
                average,
                totalRatings,
            },
        });
    },

    async getUserStats(userId: string) {
        return statsRepository.getUserStats(userId);
    },
};
