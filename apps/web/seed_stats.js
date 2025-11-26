
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const ratingId = "16b665fb-729a-4e34-9ba0-8c559156cfad";
        const contractorId = "55698448-5a2b-4c17-9ada-a7d3de5972e9";
        const serviceId = "65cb44ce-3682-41d3-9d2c-be6e58c28b0f";

        console.log("Approving rating...");
        await prisma.clientRating.update({
            where: { id: ratingId },
            data: { moderationStatus: 'APPROVED' }
        });

        console.log("Seeding UserRatingStats...");
        await prisma.userRatingStats.upsert({
            where: { userId: contractorId },
            update: { average: 5.0, totalRatings: 1, role: 'CONTRACTOR' },
            create: { userId: contractorId, average: 5.0, totalRatings: 1, role: 'CONTRACTOR' }
        });

        console.log("Seeding ServiceRatingStats...");
        await prisma.serviceRatingStats.upsert({
            where: { serviceId: serviceId },
            update: { average: 5.0, totalRatings: 1 },
            create: { serviceId: serviceId, average: 5.0, totalRatings: 1 }
        });

        console.log("Done!");

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
