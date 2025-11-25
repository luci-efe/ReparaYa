'use client';

import { BookingsList } from '@/components/contractors/bookings/BookingsList';

export default function ContractorBookingsPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6">Gestión de Reservas</h1>
            <BookingsList />
        </div>
    );
}
