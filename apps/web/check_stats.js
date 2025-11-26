
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- UserRatingStats ---");
        const userStats = await prisma.userRatingStats.findMany();
        console.log(JSON.stringify(userStats, null, 2));

        console.log("\n--- ServiceRatingStats ---");
        const serviceStats = await prisma.serviceRatingStats.findMany();
        console.log(JSON.stringify(serviceStats, null, 2));

        console.log("\n--- Services with Contractor Stats ---");
        const services = await prisma.service.findMany({
            take: 5,
            include: {
                ratingStats: true,
                contractor: {
                    include: {
                        ratingStats: true
                    }
                }
            }
        });
        console.log(JSON.stringify(services.map(s => ({
            id: s.id,
            title: s.title,
            serviceStats: s.ratingStats,
            contractorStats: s.contractor.ratingStats
        })), null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
