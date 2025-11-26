import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const bookingId = 'ba4a190a-887d-4443-8646-b6e57225a455';
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { id: true, status: true, scheduledDate: true, updatedAt: true },
    });

    console.log('Booking:', booking);
}

main()
    .catch((e) => {
        console.error(e);
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
