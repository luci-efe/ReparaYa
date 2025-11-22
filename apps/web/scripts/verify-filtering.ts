import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

async function verifyServiceFiltering() {
    try {
        console.log('Verifying service filtering (DB Check)...');

        const service = await prisma.service.findFirst({
            where: { title: 'Servicio Sin Imagen 2' },
        });

        if (!service) {
            console.error('Service "Servicio Sin Imagen 2" not found in DB!');
            return;
        }

        console.log(`Found service: ${service.id}`);
        console.log(`Title: ${service.title}`);
        console.log(`Status: ${service.visibilityStatus}`);
        console.log(`Contractor ID: ${service.contractorId}`);

        if (service.visibilityStatus === 'ACTIVE') {
            console.log('SUCCESS: Service is ACTIVE in DB.');
        } else {
            console.error(`FAILURE: Service is ${service.visibilityStatus} in DB (expected ACTIVE).`);
        }

    } catch (error) {
        console.error('Error verifying filtering:', error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyServiceFiltering();
