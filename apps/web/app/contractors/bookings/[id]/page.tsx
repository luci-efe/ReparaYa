'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { BookingStatusBadge } from '@/components/booking/BookingStatusBadge';
import { BookingTimeline } from '@/components/booking/BookingTimeline';
import { ContractorBookingControls } from '@/components/booking/ContractorBookingControls';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ContractorBookingDetailPage() {
    const params = useParams();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBooking();
    }, [params.id]);

    const fetchBooking = async () => {
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
    };

    if (loading) return <div className="p-8 text-center">Cargando...</div>;
    if (!booking) return <div className="p-8 text-center">Reserva no encontrada</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{booking.service.title}</h1>
                            <p className="text-gray-500">
                                Cliente: {booking.client?.firstName} {booking.client?.lastName}
                            </p>
                        </div>
                        <BookingStatusBadge status={booking.status} />
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Detalles de la Cita</h3>
                            <div className="space-y-2 text-sm text-gray-600">
                                <p><span className="font-medium">Fecha:</span> {format(new Date(booking.scheduledDate), 'PPPP', { locale: es })}</p>
                                <p><span className="font-medium">Hora:</span> {format(new Date(booking.scheduledDate), 'p', { locale: es })}</p>
                                <p><span className="font-medium">Dirección:</span> {booking.address}</p>
                                {booking.notes && <p><span className="font-medium">Notas:</span> {booking.notes}</p>}
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-3">Acciones</h3>
                            <ContractorBookingControls
                                bookingId={booking.id}
                                currentStatus={booking.status}
                                onStatusUpdate={fetchBooking}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Historial de Estado</h3>
                    <BookingTimeline history={booking.stateHistory} />
                </div>
            </div>
        </div>
    );
}
