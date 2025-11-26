import Link from 'next/link';
import Image from 'next/image';
import type { Decimal } from '@prisma/client/runtime/library';

import { UserRatingBadge } from '@/components/ratings/UserRatingBadge';

interface ServiceCardProps {
    service: {
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
            ratingStats: {
                average: number | Decimal;
                totalRatings: number;
            } | null;
        };
    };
}

export function ServiceCard({ service }: ServiceCardProps) {
    const imageUrl = service.images[0]?.s3Url || '/placeholder-service.svg';
    const contractorName = service.contractor.contractorProfile?.businessName || `${service.contractor.firstName} ${service.contractor.lastName}`;
    const ratingStats = service.contractor.ratingStats;

    return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-48 w-full">
                <Image
                    src={imageUrl}
                    alt={service.title}
                    fill
                    className="object-cover"
                />
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{service.title}</h3>
                    {ratingStats && (
                        <UserRatingBadge
                            average={Number(ratingStats.average)}
                            totalRatings={ratingStats.totalRatings}
                            size="sm"
                        />
                    )}
                </div>
                <p className="text-sm text-gray-500 mb-2 truncate">{service.description}</p>

                <div className="flex items-center gap-2 mb-3">
                    <div className="relative h-6 w-6 rounded-full overflow-hidden bg-gray-200">
                        {service.contractor.avatarUrl && (
                            <Image src={service.contractor.avatarUrl} alt={contractorName} fill className="object-cover" />
                        )}
                    </div>
                    <span className="text-sm text-gray-600">{contractorName}</span>
                </div>

                <div className="flex items-center justify-between mt-4">
                    <span className="text-emerald-600 font-bold text-lg">
                        ${Number(service.basePrice).toFixed(2)}
                    </span>
                    <Link
                        href={`/clients/services/${service.id}`}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                        Ver Detalles →
                    </Link>
                </div>
            </div>
        </div>
    );
}
