'use client';

import { useState, useEffect } from 'react';
import { BookingCard } from '@/components/booking/BookingCard';
import { BookingStatus } from '@/modules/booking/types';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ClientBookingsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

    useEffect(() => {
        fetchBookings();
        // Poll every 30 seconds
        const interval = setInterval(fetchBookings, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchBookings = async () => {
        try {
            const res = await fetch('/api/bookings/me');
            if (res.ok) {
                const data = await res.json();
                setBookings(data);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredBookings = bookings.filter((booking) => {
        if (filter === 'ALL') return true;
        if (filter === 'ACTIVE') {
            return [
                BookingStatus.PENDING_PAYMENT,
                BookingStatus.CONFIRMED,
                BookingStatus.ON_ROUTE,
                BookingStatus.ON_SITE,
                BookingStatus.IN_PROGRESS,
            ].includes(booking.status);
        }
        if (filter === 'COMPLETED') return booking.status === BookingStatus.COMPLETED;
        if (filter === 'CANCELLED') return booking.status === BookingStatus.CANCELLED;
        return true;
    });

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Mis Reservas</h1>
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Mis Reservas</h1>

            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                <button
                    onClick={() => setFilter('ALL')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filter === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Todas
                </button>
                <button
                    onClick={() => setFilter('ACTIVE')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Activas
                </button>
                <button
                    onClick={() => setFilter('COMPLETED')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filter === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Completadas
                </button>
                <button
                    onClick={() => setFilter('CANCELLED')}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${filter === 'CANCELLED' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Canceladas
                </button>
            </div>

            {filteredBookings.length === 0 ? (
                <EmptyState
                    title="No tienes reservas"
                    description="Aún no has realizado ninguna reserva en esta categoría."
                    actionHref="/clients/search"
                    actionLabel="Buscar Servicios"
                />
            ) : (
                <div className="grid gap-4">
                    {filteredBookings.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} role="CLIENT" />
                    ))}
                </div>
            )}
        </div>
    );
}
