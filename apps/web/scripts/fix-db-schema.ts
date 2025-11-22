import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting DB schema fix...');

    try {
        // 1. Drop the conflicting column
        console.log('Dropping visibilityStatus column...');
        await prisma.$executeRawUnsafe(`ALTER TABLE "Service" DROP COLUMN IF EXISTS "visibilityStatus";`);

        // 2. Drop the conflicting enum
        console.log('Dropping VisibilityStatus enum...');
        await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "VisibilityStatus";`);

        // 3. Drop the new enum if it exists (to ensure clean slate)
        console.log('Dropping ServiceVisibilityStatus enum...');
        await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "ServiceVisibilityStatus";`);

        // 4. Create the correct enum
        console.log('Creating ServiceVisibilityStatus enum...');
        await prisma.$executeRawUnsafe(`CREATE TYPE "ServiceVisibilityStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');`);

        // 5. Add the column back with correct type
        console.log('Adding visibilityStatus column...');
        await prisma.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN "visibilityStatus" "ServiceVisibilityStatus" NOT NULL DEFAULT 'DRAFT';`);

        console.log('DB schema fix completed successfully.');
    } catch (error) {
        console.error('Error fixing DB schema:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
