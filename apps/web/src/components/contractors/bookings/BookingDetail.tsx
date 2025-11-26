'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookingDTO } from '@/modules/booking/types';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { BookingStateActions } from './BookingStateActions';
import { BookingTimeline } from './BookingTimeline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RatingModal } from '@/components/ratings/RatingModal';
import { RatingCard } from '@/components/ratings/RatingCard';
import { RatingResponse } from '@/modules/ratings/types';

import { BookingChat } from '@/components/clients/bookings/BookingChat';

interface BookingDetailProps {
    bookingId: string;
}

export function BookingDetail({ bookingId }: BookingDetailProps) {
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

    const handleRateClient = async (data: { stars: number; comment: string }) => {
        setIsSubmittingRating(true);
        try {
            const res = await fetch(`/api/bookings/${bookingId}/ratings/contractor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId,
                    contractorId: booking?.contractorId, // Assuming contractor ID is available
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
                                    <p className="text-sm text-gray-500">Precio Base</p>
                                    <p className="font-medium">${Number(booking.basePrice).toFixed(2)} MXN</p>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h3 className="font-medium mb-2">Acciones</h3>
                                <BookingStateActions
                                    bookingId={booking.id}
                                    currentStatus={booking.status}
                                    onStatusUpdate={fetchBooking}
                                />
                            </div>
                        </div>

                        {/* Ratings Section */}
                        {booking.status === 'COMPLETED' && (
                            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                                <h3 className="text-lg font-semibold mb-4">Calificaciones</h3>

                                {ratings.contractorRating ? (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Tu calificación al cliente:</h4>
                                        <RatingCard
                                            rating={ratings.contractorRating}
                                            authorName="Tú"
                                            role="CONTRACTOR"
                                        />
                                    </div>
                                ) : (
                                    <div className="mb-6">
                                        <p className="text-gray-600 mb-3">¿Cómo fue tu experiencia con el cliente? Califícalo.</p>
                                        <button
                                            onClick={() => setIsRatingModalOpen(true)}
                                            className="px-4 py-2 bg-yellow-400 text-white font-medium rounded-md hover:bg-yellow-500 transition-colors"
                                        >
                                            Calificar Cliente
                                        </button>
                                    </div>
                                )}

                                {ratings.clientRating && !('isHidden' in ratings.clientRating) && (
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">Calificación del cliente:</h4>
                                        <RatingCard
                                            rating={ratings.clientRating}
                                            authorName={booking.client?.firstName || 'Cliente'}
                                            role="CLIENT"
                                        />
                                    </div>
                                )}
                                {ratings.clientRating && 'isHidden' in ratings.clientRating && (
                                    <div className="p-4 bg-gray-50 rounded-md text-center text-gray-500 italic">
                                        El cliente te ha calificado. Su calificación será visible cuando tú también lo califiques o pasen 7 días.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Client Info */}
                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold mb-4">Información del Cliente</h3>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600">
                                    {booking.client?.firstName?.[0]}
                                </div>
                                <div>
                                    <p className="font-medium">{booking.client?.firstName} {booking.client?.lastName}</p>
                                    <p className="text-sm text-gray-500">{booking.client?.email}</p>
                                    <p className="text-sm text-gray-500">{booking.client?.phone || 'Sin teléfono'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Dirección del Servicio</p>
                                <p className="text-gray-900">{booking.address}</p>
                            </div>
                            {booking.notes && (
                                <div className="mt-4">
                                    <p className="text-sm text-gray-500 mb-1">Notas del Cliente</p>
                                    <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{booking.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Timeline */}
                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold mb-4">Historial</h3>
                            <BookingTimeline history={booking.stateHistory || []} />
                        </div>

                        {/* Financials */}
                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold mb-4">Desglose Financiero</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Precio Base</span>
                                    <span>${Number(booking.basePrice).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Comisión (10%)</span>
                                    <span className="text-red-600">-${Number(booking.comisionAmount).toFixed(2)}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-100 flex justify-between font-bold">
                                    <span>Tu Ganancia</span>
                                    <span className="text-emerald-600">${Number(booking.contractorPayoutAmount).toFixed(2)}</span>
                                </div>
                            </div>
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
                onSubmit={handleRateClient}
                isLoading={isSubmittingRating}
                title="Calificar Cliente"
            />
        </div>
    );
}
