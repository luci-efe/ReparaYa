
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- Checking Pending Ratings ---");
        const pendingClientRatings = await prisma.clientRating.findMany({
            where: { moderationStatus: 'PENDING' }
        });
        console.log(`Pending Client Ratings: ${pendingClientRatings.length}`);
        console.log(JSON.stringify(pendingClientRatings, null, 2));

        const pendingContractorRatings = await prisma.contractorRating.findMany({
            where: { moderationStatus: 'PENDING' }
        });
        console.log(`Pending Contractor Ratings: ${pendingContractorRatings.length}`);
        console.log(JSON.stringify(pendingContractorRatings, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
