'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { BookingTimeline } from '@/components/booking/BookingTimeline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingStatus, BookingDTO } from '@/modules/booking/types';

export default function ClientBookingDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const [booking, setBooking] = useState<BookingDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [simulatingPayment, setSimulatingPayment] = useState(false);
    const showSuccessMessage = searchParams.get('booking_created') === 'true';

    const fetchBooking = useCallback(async () => {
        try {
            const res = await fetch(`/api/bookings/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setBooking(data);
            }
        } catch (error) {
            console.error('Error fetching booking:', error);
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        fetchBooking();
        const interval = setInterval(fetchBooking, 10000); // Poll every 10s for updates
        return () => clearInterval(interval);
    }, [fetchBooking]);

    const handleSimulatePayment = async () => {
        if (!booking) return;
        setSimulatingPayment(true);
        try {
            const res = await fetch('/api/payments/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId: booking.id,
                    type: 'ANTICIPO',
                    amount: booking.anticipoAmount,
                }),
            });

            if (res.ok) {
                fetchBooking(); // Refresh immediately
            }
        } catch (error) {
            console.error('Error simulating payment:', error);
        } finally {
            setSimulatingPayment(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando...</div>;
    if (!booking) return <div className="p-8 text-center">Reserva no encontrada</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                {showSuccessMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <div>
                            <h3 className="font-semibold text-green-800">¡Reserva creada exitosamente!</h3>
                            <p className="text-sm text-green-700 mt-1">
                                Tu solicitud ha sido enviada al profesional. Te notificaremos cuando confirme la cita para que puedas proceder con el pago del anticipo.
                            </p>
                        </div>
                    </div>
                )}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{booking.service?.title || 'Servicio'}</h1>
                            <p className="text-gray-500">
                                Profesional: {booking.contractor?.contractorProfile?.businessName || `${booking.contractor?.firstName || ''} ${booking.contractor?.lastName || ''}`}
                            </p>
                        </div>
                        <BookingStatusBadge status={booking.status} />
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Detalles de la Cita</h3>
                            <div className="space-y-2 text-sm text-gray-600">
                                <p>
                                    <span className="font-medium">Fecha:</span>{' '}
                                    {format(new Date(booking.scheduledDate), 'PPPP', { locale: es })}
                                </p>
                                <p>
                                    <span className="font-medium">Hora:</span>{' '}
                                    {format(new Date(booking.scheduledDate), 'p', { locale: es })}
                                </p>
                                <p>
                                    <span className="font-medium">Dirección:</span> {booking.address}
                                </p>
                                {booking.notes && (
                                    <p>
                                        <span className="font-medium">Notas:</span> {booking.notes}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Resumen de Pago</h3>
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between">
                                    <span>Precio Base:</span>
                                    <span>${Number(booking.basePrice).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-medium text-gray-900 pt-2 border-t">
                                    <span>Total:</span>
                                    <span>${Number(booking.finalPrice).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600">
                                    <span>Anticipo (50%):</span>
                                    <span>${Number(booking.anticipoAmount).toFixed(2)}</span>
                                </div>
                            </div>

                            {booking.status === 'PENDING_APPROVAL' as BookingStatus && (
                                <div className="mt-4 p-3 bg-amber-50 text-amber-800 rounded-md text-sm">
                                    Esperando confirmación del profesional para proceder con el pago.
                                </div>
                            )}

                            {booking.status === BookingStatus.PENDING_PAYMENT && (
                                <button
                                    onClick={handleSimulatePayment}
                                    disabled={simulatingPayment}
                                    className="mt-4 w-full py-2 px-4 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium"
                                >
                                    {simulatingPayment ? 'Procesando...' : 'Pagar Anticipo (Simulado)'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Historial de Estado</h3>
                    <BookingTimeline history={booking.stateHistory || []} />
                </div>
            </div>
        </div>
    );
}
