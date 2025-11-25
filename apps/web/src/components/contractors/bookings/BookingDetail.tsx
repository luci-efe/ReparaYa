'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookingDTO } from '@/modules/booking/types';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { BookingStateActions } from './BookingStateActions';
import { BookingTimeline } from './BookingTimeline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingDetailProps {
    bookingId: string;
}

export function BookingDetail({ bookingId }: BookingDetailProps) {
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
    );
}
