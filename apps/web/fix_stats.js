
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const contractorId = "55698448-5a2b-4c17-9ada-a7d3de5972e9";
        const serviceId = "0e7a8a2a-448c-4d86-b2c6-98d71c71b4d5";

        console.log("--- Checking UserRatingStats directly ---");
        const userStats = await prisma.userRatingStats.findUnique({
            where: { userId: contractorId }
        });
        console.log("UserStats:", userStats);

        console.log("\n--- Seeding Correct Stats ---");
        // Seed User Stats (again, just in case)
        await prisma.userRatingStats.upsert({
            where: { userId: contractorId },
            update: { average: 4.5, totalRatings: 5, role: 'CONTRACTOR' },
            create: { userId: contractorId, average: 4.5, totalRatings: 5, role: 'CONTRACTOR' }
        });

        // Seed Service Stats for the CORRECT service
        await prisma.serviceRatingStats.upsert({
            where: { serviceId: serviceId },
            update: { average: 4.8, totalRatings: 3 },
            create: { serviceId: serviceId, average: 4.8, totalRatings: 3 }
        });

        console.log("--- Verifying via Service Query ---");
        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: {
                ratingStats: true,
                contractor: {
                    include: {
                        ratingStats: true
                    }
                }
            }
        });
        console.log(JSON.stringify(service, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
