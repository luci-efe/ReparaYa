import { ServiceSearchFilters } from '@/components/services/ServiceSearchFilters';
import { ServiceGrid } from '@/components/services/ServiceGrid';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
    searchParams,
}: {
    searchParams: { q?: string; category?: string; minPrice?: string; maxPrice?: string };
}) {
    const { q, category, minPrice, maxPrice } = searchParams;

    const where: Prisma.ServiceWhereInput = {
        status: 'ACTIVE',
        visibilityStatus: 'ACTIVE',
    };

    if (q) {
        where.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
        ];
    } else if (!category && !minPrice && !maxPrice) {
        // If no filters are applied, show all active services
        // The 'where' object already has status: 'ACTIVE' and visibilityStatus: 'ACTIVE'
    }

    if (category) {
        where.category = { slug: category };
    }

    if (minPrice || maxPrice) {
        where.basePrice = {};
        if (minPrice) where.basePrice.gte = Number(minPrice);
        if (maxPrice) where.basePrice.lte = Number(maxPrice);
    }

    const services = await prisma.service.findMany({
        where,
        include: {
            contractor: {
                include: {
                    contractorProfile: true,
                    ratingStats: true,
                },
            },
            images: {
                orderBy: { order: 'asc' },
                take: 1,
            },
            ratingStats: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Buscar Servicios</h1>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1">
                    <ServiceSearchFilters />
                </div>

                <div className="lg:col-span-3">
                    <ServiceGrid services={services} loading={false} />
                </div>
            </div>
        </div>
    );
}
