import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Adding PENDING_APPROVAL to BookingStatus enum...');
        await prisma.$executeRawUnsafe(`ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_APPROVAL';`);
        console.log('Successfully added PENDING_APPROVAL to BookingStatus enum.');
    } catch (e) {
        console.error('Error executing migration:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
