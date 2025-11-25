import { ServiceCard } from './ServiceCard';
import type { Decimal } from '@prisma/client/runtime/library';

interface ServiceData {
    id: string;
    title: string;
    description: string;
    basePrice: number | Decimal;
    images: { s3Url: string }[];
    contractor: {
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
        contractorProfile: {
            businessName: string;
        } | null;
    };
}

interface ServiceGridProps {
    services: ServiceData[];
    loading: boolean;
}

export function ServiceGrid({ services, loading }: ServiceGridProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm h-80 animate-pulse">
                        <div className="h-48 bg-gray-200" />
                        <div className="p-4 space-y-3">
                            <div className="h-6 bg-gray-200 rounded w-3/4" />
                            <div className="h-4 bg-gray-200 rounded w-1/2" />
                            <div className="h-10 bg-gray-200 rounded mt-4" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (services.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No se encontraron servicios que coincidan con tu búsqueda.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
                <ServiceCard key={service.id} service={service} />
            ))}
        </div>
    );
}
