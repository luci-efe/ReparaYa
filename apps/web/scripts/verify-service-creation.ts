import { PrismaClient, ServiceVisibilityStatus, ServiceStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Service Creation Verification...');

    try {
        // 1. Get a valid contractor (user)
        console.log('Fetching a valid contractor...');
        const contractor = await prisma.user.findFirst({
            where: { role: 'CONTRACTOR' },
        });

        if (!contractor) {
            console.error('No contractor found in DB. Cannot proceed.');
            return;
        }
        console.log(`Found contractor: ${contractor.id} (${contractor.email})`);

        // 2. Get a valid category
        console.log('Fetching a valid category...');
        const category = await prisma.serviceCategory.findFirst();

        if (!category) {
            console.error('No service category found in DB. Cannot proceed.');
            return;
        }
        console.log(`Found category: ${category.id} (${category.name})`);

        // 3. Attempt to create a service
        console.log('Attempting to create a service...');
        const service = await prisma.service.create({
            data: {
                title: 'Test Service Verification',
                description: 'This is a test service to verify DB schema.',
                basePrice: 100.00,
                currency: 'MXN',
                durationMinutes: 60,
                visibilityStatus: ServiceVisibilityStatus.DRAFT, // Using the enum from Prisma Client
                status: ServiceStatus.ACTIVE,
                contractor: {
                    connect: { id: contractor.id }
                },
                category: {
                    connect: { id: category.id }
                }
            }
        });

        console.log('Service created successfully!');
        console.log('Service ID:', service.id);
        console.log('Visibility Status:', service.visibilityStatus);

        // Cleanup
        console.log('Cleaning up test service...');
        await prisma.service.delete({ where: { id: service.id } });
        console.log('Cleanup complete.');

    } catch (error) {
        console.error('Error creating service:', error);
        // Log specific details if it's a Prisma error
        if ((error as any).code) {
            console.error('Error Code:', (error as any).code);
            console.error('Error Message:', (error as any).message);
            console.error('Error Meta:', (error as any).meta);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
