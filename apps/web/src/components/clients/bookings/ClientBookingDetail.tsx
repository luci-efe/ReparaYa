'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookingDTO } from '@/modules/booking/types';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { BookingTimeline } from '@/components/contractors/bookings/BookingTimeline';
import { PaymentSection } from './PaymentSection';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ClientBookingDetailProps {
    bookingId: string;
}

export function ClientBookingDetail({ bookingId }: ClientBookingDetailProps) {
    const [booking, setBooking] = useState<BookingDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    useEffect(() => {
        fetchBooking();
    }, [bookingId, fetchBooking]);

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

    if (loading) return <div className="p-8 text-center">Cargando detalles...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
    if (!booking) return <div className="p-8 text-center">Reserva no encontrada</div>;

    return (
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
    );
}
