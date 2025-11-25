import { ServiceDetail } from '@/components/services/ServiceDetail';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ServiceDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const service = await prisma.service.findUnique({
        where: { id: params.id },
        include: {
            contractor: {
                include: {
                    contractorProfile: true,
                },
            },
            images: {
                orderBy: { order: 'asc' },
            },
            category: true,
        },
    });

    if (!service) {
        notFound();
    }

    if (service.status !== 'ACTIVE' || service.visibilityStatus !== 'ACTIVE') {
        // TODO: Allow owner to view draft
        notFound();
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <ServiceDetail service={service} />
        </div>
    );
}
