import { NextRequest, NextResponse } from 'next/server';
import { slotGeneratorService } from '@/modules/contractors/availability/services/slotGeneratorService';
import { prisma } from '@/lib/db';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const serviceId = params.id;

        const service = await prisma.service.findUnique({
            where: { id: serviceId },
            include: { contractor: { include: { contractorProfile: true } } },
        });

        if (!service || !service.contractor.contractorProfile) {
            return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
        }

        const contractorProfileId = service.contractor.contractorProfile.id;
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 14); // Next 14 days (2 weeks)

        const slots = await slotGeneratorService.generateSlots(
            contractorProfileId,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0],
            serviceId
        );

        return NextResponse.json(slots);
    } catch (error) {
        console.error('Error fetching slots:', error);
        return NextResponse.json(
            { error: 'Error al obtener horarios disponibles' },
            { status: 500 }
        );
    }
}
