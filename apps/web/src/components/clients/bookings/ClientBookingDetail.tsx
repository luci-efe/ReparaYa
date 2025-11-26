'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookingDTO } from '@/modules/booking/types';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { BookingTimeline } from '@/components/contractors/bookings/BookingTimeline';
import { PaymentSection } from './PaymentSection';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RatingModal } from '@/components/ratings/RatingModal';
import { RatingCard } from '@/components/ratings/RatingCard';
import { RatingResponse } from '@/modules/ratings/types';

import { BookingChat } from './BookingChat';

interface ClientBookingDetailProps {
    bookingId: string;
}

export function ClientBookingDetail({ bookingId }: ClientBookingDetailProps) {
    const [booking, setBooking] = useState<BookingDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ratings, setRatings] = useState<{ clientRating: RatingResponse | null; contractorRating: RatingResponse | null }>({ clientRating: null, contractorRating: null });
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [isSubmittingRating, setIsSubmittingRating] = useState(false);

    const fetchBooking = useCallback(async () => {
        try {
            const res = await fetch(`/api/bookings/${bookingId}`);
            if (!res.ok) {
                throw new Error('Error al cargar la reserva');
            }
            const data = await res.json();
            setBooking(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }, [bookingId]);

    const fetchRatings = useCallback(async () => {
        try {
            const res = await fetch(`/api/bookings/${bookingId}/ratings`);
            if (res.ok) {
                const data = await res.json();
                setRatings(data);
            }
        } catch (error) {
            console.error('Error fetching ratings:', error);
        }
    }, [bookingId]);

    useEffect(() => {
        fetchBooking();
        fetchRatings();
    }, [bookingId, fetchBooking, fetchRatings]);

    // Demo Auto-Advance Logic
    useEffect(() => {
        let outerTimeout: NodeJS.Timeout;
        let innerTimeout: NodeJS.Timeout;
        let cancelled = false;

        const autoAdvance = async () => {
            // Only auto-advance if status is CONFIRMED, ON_ROUTE, ON_SITE, or IN_PROGRESS
            // and we are in "demo mode" (which we'll assume is true for this flow or triggered by the user)
            const activeStates = ['CONFIRMED', 'ON_ROUTE', 'ON_SITE', 'IN_PROGRESS'];

            if (booking && activeStates.includes(booking.status)) {
                try {
                    // Wait 5 seconds before advancing
                    await new Promise<void>((resolve, reject) => {
                        innerTimeout = setTimeout(() => {
                            if (cancelled) {
                                reject(new Error('Cancelled'));
                            } else {
                                resolve();
                            }
                        }, 5000);
                    });

                    if (cancelled) return;

                    const res = await fetch(`/api/demo/advance/${booking.id}`, {
                        method: 'POST',
                    });

                    if (res.ok && !cancelled) {
                        const data = await res.json();
                        if (data.status) {
                            fetchBooking(); // Refresh UI
                        }
                    }
                } catch (error) {
                    if (!cancelled) {
                        console.error('Auto-advance error:', error);
                    }
                }
            }
        };

        if (booking) {
            outerTimeout = setTimeout(autoAdvance, 2000); // Check/Start after 2s
        }

        return () => {
            cancelled = true;
            clearTimeout(outerTimeout);
            clearTimeout(innerTimeout);
        };
    }, [booking, fetchBooking]);

    const handleRateService = async (data: { stars: number; comment: string }) => {
        setIsSubmittingRating(true);
        try {
            const res = await fetch(`/api/bookings/${bookingId}/ratings/client`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId,
                    serviceId: booking?.service?.id, // Assuming service ID is available in booking
                    contractorId: booking?.contractor?.id, // Assuming contractor ID is available
                    stars: data.stars,
                    comment: data.comment,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al enviar la calificación');
            }

            await fetchRatings();
            setIsRatingModalOpen(false);
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert(error instanceof Error ? error.message : 'Error al enviar la calificación');
        } finally {
            setIsSubmittingRating(false);
        }
    };

    const [activeTab, setActiveTab] = useState<'details' | 'chat'>('details');

    // ... (existing useEffects)

    // Check for tab query param
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'chat') {
            setActiveTab('chat');
        }
    }, []);

    if (loading) return <div className="p-8 text-center">Cargando detalles...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
    if (!booking) return <div className="p-8 text-center">Reserva no encontrada</div>;

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'details'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        Detalles de la Reserva
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                            ${activeTab === 'chat'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                        `}
                    >
                        Mensajes
                    </button>
                </nav>
            </div>

            {activeTab === 'details' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Header Card */}
                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{booking.service?.title}</h2>
                                    <p className="text-gray-500">ID: {booking.id.slice(0, 8)}</p>
                                </div>
                                <BookingStatusBadge status={booking.status} />
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div>
                                    <p className="text-sm text-gray-500">Fecha y Hora</p>
                                    <p className="font-medium">
                                        {format(new Date(booking.scheduledDate), 'PPPP p', { locale: es })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Precio Total</p>
                                    <p className="font-medium">${Number(booking.finalPrice).toFixed(2)} MXN</p>
                                </div>
                            </div>

                            {/* Demo Indicator */}
                            {['CONFIRMED', 'ON_ROUTE', 'ON_SITE', 'IN_PROGRESS'].includes(booking.status) && (
                                <div className="mt-4 bg-blue-50 text-blue-700 px-4 py-2 rounded-md text-sm flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                    </span>
                                    Modo Demo: Actualizando estado automáticamente...
                                </div>
                            )}
                        </div>

                        {/* Ratings Section */}
                        {booking.status === 'COMPLETED' && (
                            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                                <h3 className="text-lg font-semibold mb-4">Calificaciones</h3>

                                {ratings.clientRating && !('isHidden' in ratings.clientRating) ? (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Tu calificación al profesional:</h4>
                                        <RatingCard
                                            rating={ratings.clientRating}
                                            authorName="Tú"
                                            role="CLIENT"
                                        />
                                    </div>
                                ) : (
                                    <div className="mb-6">
                                        <p className="text-gray-600 mb-3">¿Cómo estuvo el servicio? Califica al profesional.</p>
                                        <button
                                            onClick={() => setIsRatingModalOpen(true)}
                                            className="px-4 py-2 bg-yellow-400 text-white font-medium rounded-md hover:bg-yellow-500 transition-colors"
                                        >
                                            Calificar Servicio
                                        </button>
                                    </div>
                                )}

                                {ratings.contractorRating && !('isHidden' in ratings.contractorRating) && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Calificación del profesional:</h4>
                                        <RatingCard
                                            rating={ratings.contractorRating}
                                            authorName={booking.contractor?.firstName || 'Profesional'}
                                            role="CONTRACTOR"
                                        />
                                    </div>
                                )}
                                {ratings.contractorRating && 'isHidden' in ratings.contractorRating && (
                                    <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500 italic">
                                        El profesional te ha calificado. Tu calificación será visible cuando tú también lo califiques o pasen 7 días.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Contractor Info */}
                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold mb-4">Información del Profesional</h3>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
                                    {booking.contractor?.firstName?.[0]}
                                </div>
                                <div>
                                    <p className="font-medium">
                                        {booking.contractor?.contractorProfile?.businessName ||
                                            `${booking.contractor?.firstName} ${booking.contractor?.lastName}`}
                                    </p>
                                    <p className="text-sm text-gray-500">{booking.contractor?.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Section */}
                        <PaymentSection
                            bookingId={booking.id}
                            status={booking.status}
                            amount={Number(booking.finalPrice)}
                            onPaymentComplete={fetchBooking}
                        />
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Timeline */}
                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold mb-4">Estado de la Reserva</h3>
                            <BookingTimeline history={booking.stateHistory || []} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <BookingChat booking={booking} />
                </div>
            )}

            <RatingModal
                isOpen={isRatingModalOpen}
                onClose={() => setIsRatingModalOpen(false)}
                onSubmit={handleRateService}
                isLoading={isSubmittingRating}
                title="Calificar Servicio"
            />
        </div>
    );
}
