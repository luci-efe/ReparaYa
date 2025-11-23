import { serviceService } from '../src/modules/services/services/serviceService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Service Layer Verification...');

    try {
        // 1. Get a valid contractor (user) WITH a profile
        const contractor = await prisma.user.findFirst({
            where: {
                role: 'CONTRACTOR',
                contractorProfile: { isNot: null }
            },
        });

        if (!contractor) {
            console.error('No contractor with profile found. Cannot proceed.');
            return;
        }
        console.log(`Using contractor: ${contractor.id}`);

        // 2. Get a valid category
        const category = await prisma.serviceCategory.findFirst();
        if (!category) {
            console.error('No category found. Cannot proceed.');
            return;
        }
        console.log(`Using category: ${category.id}`);

        // 3. Call serviceService.createService
        console.log('Calling serviceService.createService...');
        const service = await serviceService.createService({
            title: 'Service Layer Test',
            description: 'Testing via service layer with a description that is definitely longer than fifty characters to satisfy the validation rules.',
            basePrice: 150,
            durationMinutes: 90,
            categoryId: category.id
        }, contractor.id);

        console.log('Service created successfully via Service Layer!');
        console.log('Service ID:', service.id);

        // Cleanup
        await prisma.service.delete({ where: { id: service.id } });
        console.log('Cleanup complete.');

    } catch (error: any) {
        console.log('Error in service layer (safe log):');
        if (error instanceof Error) {
            console.log(error.message);
            console.log(error.stack);
        } else {
            console.log(JSON.stringify(error));
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
