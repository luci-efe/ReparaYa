'use client';

import { useState, useEffect } from 'react';
import { ServiceImageGallery } from './ServiceImageGallery';
import { AvailabilitySlotPicker } from './AvailabilitySlotPicker';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingForm } from '../booking/BookingForm';
import type { Decimal } from '@prisma/client/runtime/library';
import { UserRatingBadge } from '@/components/ratings/UserRatingBadge';
import { RatingsList } from '@/components/ratings/RatingsList';
import { RatingResponse } from '@/modules/ratings/types';
import { useUserRatingStats } from '@/hooks/useUserRatingStats';

interface ServiceDetailData {
    id: string;
    title: string;
    description: string;
    basePrice: number | Decimal;
    durationMinutes: number;
    images: { s3Url: string }[];
    contractor: {
        id: string; // Added ID for stats
        firstName: string;
        lastName: string;
        contractorProfile: {
            businessName: string;
            description: string | null;
        } | null;
    };
}

interface ServiceDetailProps {
    service: ServiceDetailData;
}

export function ServiceDetail({ service }: ServiceDetailProps) {
    const router = useRouter();
    const { isSignedIn } = useAuth();
    const [selectedSlot, setSelectedSlot] = useState<{ id: string; date: Date } | null>(null);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [ratings, setRatings] = useState<RatingResponse[]>([]);
    const [ratingsLoading, setRatingsLoading] = useState(true);

    // We use contractor stats for now as service stats are not yet implemented in backend
    // Or we could implement service stats. For now, let's use contractor stats as a proxy or just hide if not available.
    // Actually, the requirement says "Contractor profile and service detail pages to display aggregated rating information".
    // Displaying contractor's overall rating on service page is common.
    // But wait, `useUserRatingStats` takes a userId. `service.contractor.id` is the internal ID.
    // The hook expects Clerk ID? No, I checked `useUserRatingStats.ts` and it uses `useUser` from Clerk to get CURRENT user stats.
    // I need a hook to get ANY user stats.
    // I should create `useContractorRatingStats` or modify `useUserRatingStats` to accept an ID.
    // The current `useUserRatingStats` implementation:
    /*
    export function useUserRatingStats() {
        const { user } = useUser();
        const userId = user?.id;
        return useQuery({ ... queryKey: ['userRatingStats', userId] ... fetch('/api/users/me/rating-stats') ... });
    }
    */
    // It fetches "me". I need to fetch "other".
    // I created `GET /api/users/[id]/rating-stats`.
    // So I should create a new hook `usePublicRatingStats(userId)` or similar.
    // Or just fetch it in useEffect for now to save time.

    const [stats, setStats] = useState<{ average: number; totalRatings: number } | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Assuming service.contractor.id is the internal ID
                const res = await fetch(`/api/users/${service.contractor.id}/rating-stats`);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            }
        };

        const fetchRatings = async () => {
            try {
                const res = await fetch(`/api/services/${service.id}/ratings`);
                if (res.ok) {
                    const data = await res.json();
                    setRatings(data);
                }
            } catch (error) {
                console.error('Error fetching ratings:', error);
            } finally {
                setRatingsLoading(false);
            }
        };

        if (service.contractor.id) {
            fetchStats();
        }
        fetchRatings();
    }, [service.id, service.contractor.id]);


    const handleSlotSelect = (slotId: string, date: Date) => {
        setSelectedSlot({ id: slotId, date });
    };

    const handleBookClick = () => {
        if (!isSignedIn) {
            router.push(`/sign-in?redirect_url=/clients/services/${service.id}`);
            return;
        }

        if (!selectedSlot) return;
        setIsBookingModalOpen(true);
    };

    const handleBookingSuccess = (bookingId: string) => {
        setIsBookingModalOpen(false);
        router.push(`/clients/bookings/${bookingId}?booking_created=true`);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
            {/* Booking Modal */}
            {isBookingModalOpen && selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Confirmar Reserva</h2>
                        <div className="mb-4 text-sm text-gray-600">
                            <p><strong>Servicio:</strong> {service.title}</p>
                            <p><strong>Fecha:</strong> {format(selectedSlot.date, 'PPPP p', { locale: es })}</p>
                            <p><strong>Precio Base:</strong> ${Number(service.basePrice).toFixed(2)}</p>
                        </div>

                        <BookingForm
                            serviceId={service.id}
                            slotId={selectedSlot.id}
                            scheduledDate={selectedSlot.date}
                            onSuccess={handleBookingSuccess}
                            onCancel={() => setIsBookingModalOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Left Column: Images and Description */}
            <div className="lg:col-span-2 space-y-8">
                <ServiceImageGallery images={service.images} />

                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <h1 className="text-3xl font-bold text-gray-900">{service.title}</h1>
                        {stats && (
                            <UserRatingBadge
                                average={stats.average}
                                totalRatings={stats.totalRatings}
                                size="lg"
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold text-2xl">
                                ${Number(service.basePrice).toFixed(2)}
                            </span>
                            <span className="text-gray-500 text-sm">precio base</span>
                        </div>
                        <div className="h-4 w-px bg-gray-300" />
                        <div className="text-gray-600">
                            <span className="font-medium">{service.durationMinutes} min</span> duración estimada
                        </div>
                    </div>

                    <div className="prose max-w-none text-gray-600">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
                        <p>{service.description}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sobre el Profesional</h3>
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden relative flex items-center justify-center text-2xl font-bold text-gray-500">
                            {service.contractor.firstName[0]}
                        </div>
                        <div>
                            <h4 className="font-medium text-lg">
                                {service.contractor.contractorProfile?.businessName ||
                                    `${service.contractor.firstName} ${service.contractor.lastName}`}
                            </h4>
                            <p className="text-gray-500 text-sm">
                                {service.contractor.contractorProfile?.description || 'Profesional verificado en ReparaYa'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Ratings Section */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Reseñas del Servicio</h3>
                    <RatingsList ratings={ratings} isLoading={ratingsLoading} />
                </div>
            </div>

            {/* Right Column: Booking Card */}
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-lg sticky top-8 border border-gray-100">
                    <h3 className="text-xl font-semibold text-gray-900 mb-6">Reservar Cita</h3>

                    <AvailabilitySlotPicker
                        serviceId={service.id}
                        onSelectSlot={handleSlotSelect}
                    />

                    <div className="mt-6 pt-6 border-t border-gray-100">
                        {selectedSlot ? (
                            <div className="mb-4 p-3 bg-emerald-50 rounded-md border border-emerald-100">
                                <p className="text-sm text-emerald-800 font-medium">
                                    Seleccionado: {format(selectedSlot.date, 'PPPP', { locale: es })}
                                </p>
                                <p className="text-sm text-emerald-600">
                                    {format(selectedSlot.date, 'p', { locale: es })}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 mb-4 text-center">
                                Selecciona un horario para continuar
                            </p>
                        )}

                        <button
                            onClick={handleBookClick}
                            disabled={!selectedSlot}
                            className={`w-full py-3 px-4 rounded-md font-medium text-white transition-all ${selectedSlot
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg'
                                : 'bg-gray-300 cursor-not-allowed'
                                }`}
                        >
                            Reservar Ahora
                        </button>

                        {!isSignedIn && (
                            <p className="text-xs text-center text-gray-500 mt-2">
                                Debes iniciar sesión para reservar
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
