
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// We need to replicate the stats calculation logic here since we can't easily import the service in a standalone script
async function recalculateServiceStats(serviceId) {
    console.log(`Recalculating stats for service ${serviceId}...`);
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

    await prisma.serviceRatingStats.upsert({
        where: { serviceId },
        update: { average, totalRatings },
        create: { serviceId, average, totalRatings },
    });
    console.log(`Updated service stats: Avg ${average}, Total ${totalRatings}`);
}

async function recalculateUserStats(userId, role) {
    console.log(`Recalculating stats for user ${userId} (${role})...`);

    let aggregate;
    if (role === 'CLIENT') {
        aggregate = await prisma.contractorRating.aggregate({
            where: { clientId: userId, moderationStatus: 'APPROVED' },
            _avg: { stars: true },
            _count: { stars: true },
        });
    } else {
        aggregate = await prisma.clientRating.aggregate({
            where: { contractorId: userId, moderationStatus: 'APPROVED' },
            _avg: { stars: true },
            _count: { stars: true },
        });
    }

    const average = aggregate._avg.stars || 0;
    const totalRatings = aggregate._count.stars || 0;

    await prisma.userRatingStats.upsert({
        where: { userId },
        update: { average, totalRatings, role },
        create: { userId, average, totalRatings, role },
    });
    console.log(`Updated user stats: Avg ${average}, Total ${totalRatings}`);
}

async function main() {
    try {
        // 1. Approve Client Ratings
        const pendingClientRatings = await prisma.clientRating.findMany({
            where: { moderationStatus: 'PENDING' }
        });

        for (const rating of pendingClientRatings) {
            console.log(`Approving client rating ${rating.id}...`);
            await prisma.clientRating.update({
                where: { id: rating.id },
                data: { moderationStatus: 'APPROVED' }
            });
            await recalculateServiceStats(rating.serviceId);
            await recalculateUserStats(rating.contractorId, 'CONTRACTOR');
        }

        // 2. Approve Contractor Ratings
        const pendingContractorRatings = await prisma.contractorRating.findMany({
            where: { moderationStatus: 'PENDING' }
        });

        for (const rating of pendingContractorRatings) {
            console.log(`Approving contractor rating ${rating.id}...`);
            await prisma.contractorRating.update({
                where: { id: rating.id },
                data: { moderationStatus: 'APPROVED' }
            });
            await recalculateUserStats(rating.clientId, 'CLIENT');
        }

        console.log("Done!");

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
