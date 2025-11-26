
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const bookingId = "aacb3bee-1519-4c91-b9c6-bac76c018f31";
        console.log(`Checking booking ${bookingId}...`);

        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                client: true,
                contractor: true,
                clientRating: {
                    include: { client: true }
                },
                contractorRating: {
                    include: { contractor: true }
                }
            }
        });

        console.log(JSON.stringify(booking, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
