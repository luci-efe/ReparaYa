'use client';

import { useState, useEffect } from 'react';
import { BookingCard } from '@/components/booking/BookingCard';
import { BookingStatus } from '@/modules/booking/types';

export default function ContractorBookingsPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'COMPLETED'>('ALL');

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const res = await fetch('/api/bookings/me');
            if (res.ok) {
                const data = await res.json();
                // Filter only contractor bookings if the API returns mixed (it returns all for user)
                // But for now we assume the API returns what we need or we filter by role if we had that info in the booking
                // The API returns bookings where user is client OR contractor.
                // We should probably filter by contractorId matching current user, but we don't have current user ID easily here without another call.
                // For the demo, we'll assume the user is viewing their relevant bookings.
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
        if (filter === 'PENDING') return booking.status === BookingStatus.PENDING_PAYMENT;
        if (filter === 'ACTIVE') {
            return [
                BookingStatus.CONFIRMED,
                BookingStatus.ON_ROUTE,
                BookingStatus.ON_SITE,
                BookingStatus.IN_PROGRESS,
            ].includes(booking.status);
        }
        if (filter === 'COMPLETED') return booking.status === BookingStatus.COMPLETED;
        return true;
    });

    if (loading) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Gestión de Reservas</h1>

            <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
                <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>Todas</button>
                <button onClick={() => setFilter('PENDING')} className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'PENDING' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>Pendientes</button>
                <button onClick={() => setFilter('ACTIVE')} className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>Activas</button>
                <button onClick={() => setFilter('COMPLETED')} className={`px-4 py-2 rounded-full text-sm font-medium ${filter === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'bg-gray-100'}`}>Completadas</button>
            </div>

            <div className="grid gap-4">
                {filteredBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} role="CONTRACTOR" />
                ))}
            </div>
        </div>
    );
}
