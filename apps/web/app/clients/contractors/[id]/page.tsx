import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { UserRatingBadge } from '@/components/ratings/UserRatingBadge';
import { RatingsList } from '@/components/ratings/RatingsList';
import { clientRatingService } from '@/modules/ratings/services/clientRatingService';
import { ServiceCard } from '@/components/services/ServiceCard';
import { RatingResponse } from '@/modules/ratings/types';

export const dynamic = 'force-dynamic';

export default async function ContractorProfilePage({
    params,
}: {
    params: { id: string };
}) {
    const contractor = await prisma.user.findUnique({
        where: { id: params.id, role: 'CONTRACTOR' },
        include: {
            contractorProfile: true,
            ratingStats: true,
            services: {
                where: { status: 'ACTIVE', visibilityStatus: 'ACTIVE' },
                include: {
                    images: {
                        orderBy: { order: 'asc' },
                        take: 1,
                    },
                    contractor: {
                        include: {
                            contractorProfile: true,
                            ratingStats: true,
                        },
                    },
                    ratingStats: true,
                },
            },
        },
    });

    if (!contractor) {
        notFound();
    }

    const { ratings: rawRatings, total } = await clientRatingService.getForContractor(contractor.id);

    const ratings = rawRatings.map(r => ({
        ...r,
        author: r.client,
    }));

    const displayName = contractor.contractorProfile?.businessName || `${contractor.firstName} ${contractor.lastName}`;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile Info */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
                        <div className="flex flex-col items-center text-center">
                            <div className="relative h-32 w-32 rounded-full overflow-hidden bg-gray-200 mb-4">
                                {contractor.avatarUrl ? (
                                    <Image
                                        src={contractor.avatarUrl}
                                        alt={displayName}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-gray-400">
                                        {contractor.firstName[0]}
                                    </div>
                                )}
                            </div>

                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{displayName}</h1>

                            {contractor.ratingStats && (
                                <div className="mb-4">
                                    <UserRatingBadge
                                        average={Number(contractor.ratingStats.average)}
                                        totalRatings={contractor.ratingStats.totalRatings}
                                        size="lg"
                                    />
                                </div>
                            )}

                            <p className="text-gray-600 mb-6">
                                {contractor.contractorProfile?.description || 'Profesional en ReparaYa'}
                            </p>

                            <div className="w-full border-t border-gray-100 pt-4 text-left">
                                <h3 className="font-semibold text-gray-900 mb-2">Información de contacto</h3>
                                <p className="text-sm text-gray-600 mb-1">
                                    <span className="font-medium">Email:</span> {contractor.email}
                                </p>
                                {contractor.contractorProfile?.website && (
                                    <p className="text-sm text-gray-600 mb-1">
                                        <span className="font-medium">Web:</span>{' '}
                                        <a href={contractor.contractorProfile.website} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                                            {contractor.contractorProfile.website}
                                        </a>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Services and Reviews */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Services Section */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Servicios Ofrecidos</h2>
                        {contractor.services.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {contractor.services.map((service) => (
                                    <ServiceCard key={service.id} service={service} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">Este profesional aún no tiene servicios activos.</p>
                        )}
                    </div>

                    {/* Reviews Section */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Reseñas ({total})</h2>
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <RatingsList ratings={ratings} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
