
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const serviceTitle = "Reparación de refrigeradores";
        console.log(`Checking service "${serviceTitle}"...`);

        const services = await prisma.service.findMany({
            where: { title: { contains: "refrigeradores", mode: 'insensitive' } },
            include: {
                ratingStats: true,
                contractor: {
                    include: {
                        ratingStats: true
                    }
                }
            }
        });

        console.log(JSON.stringify(services, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
