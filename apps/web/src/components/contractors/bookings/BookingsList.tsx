'use client';

import { useState, useEffect, useCallback } from 'react';
import { BookingCard } from '@/components/booking/BookingCard';
import { BookingStatus, BookingDTO } from '@/modules/booking/types';
import { EmptyState } from '@/components/ui/EmptyState';

interface BookingsListProps {
    initialBookings?: BookingDTO[];
}

export function BookingsList({ initialBookings = [] }: BookingsListProps) {
    const [bookings, setBookings] = useState<BookingDTO[]>(initialBookings);
    const [loading, setLoading] = useState(!initialBookings.length);
    const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('limit', '10');

            if (filter === 'PENDING') {
                params.set('status', BookingStatus.PENDING_APPROVAL);
            } else if (filter === 'ACTIVE') {
                params.set('status', [
                    BookingStatus.PENDING_PAYMENT,
                    BookingStatus.CONFIRMED,
                    BookingStatus.ON_ROUTE,
                    BookingStatus.ON_SITE,
                    BookingStatus.IN_PROGRESS
                ].join(','));
            } else if (filter === 'COMPLETED') {
                params.set('status', BookingStatus.COMPLETED);
            } else if (filter === 'CANCELLED') {
                params.set('status', [BookingStatus.CANCELLED, BookingStatus.DISPUTED].join(','));
            }

            const res = await fetch(`/api/contractors/bookings?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setBookings(data.bookings);
                setHasMore(data.total > page * 10);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
        } finally {
            setLoading(false);
        }
    }, [filter, page]);

    useEffect(() => {
        fetchBookings();
    }, [filter, page, fetchBookings]);

    const handleFilterChange = (newFilter: typeof filter) => {
        setFilter(newFilter);
        setPage(1);
    };

    return (
        <div>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
                <FilterButton
                    active={filter === 'ALL'}
                    onClick={() => handleFilterChange('ALL')}
                    label="Todas"
                />
                <FilterButton
                    active={filter === 'PENDING'}
                    onClick={() => handleFilterChange('PENDING')}
                    label="Pendientes"
                />
                <FilterButton
                    active={filter === 'ACTIVE'}
                    onClick={() => handleFilterChange('ACTIVE')}
                    label="Activas"
                />
                <FilterButton
                    active={filter === 'COMPLETED'}
                    onClick={() => handleFilterChange('COMPLETED')}
                    label="Completadas"
                />
                <FilterButton
                    active={filter === 'CANCELLED'}
                    onClick={() => handleFilterChange('CANCELLED')}
                    label="Canceladas"
                />
            </div>

            {loading && bookings.length === 0 ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : bookings.length === 0 ? (
                <EmptyState
                    title="No hay reservas"
                    description="No se encontraron reservas con el filtro seleccionado."
                />
            ) : (
                <div className="grid gap-4">
                    {bookings.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} role="CONTRACTOR" />
                    ))}
                </div>
            )}

            {/* Simple Pagination Controls */}
            <div className="mt-6 flex justify-center gap-4">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="px-4 py-2 border rounded-md disabled:opacity-50"
                >
                    Anterior
                </button>
                <span className="py-2">Página {page}</span>
                <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore || loading}
                    className="px-4 py-2 border rounded-md disabled:opacity-50"
                >
                    Siguiente
                </button>
            </div>
        </div>
    );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${active
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
        >
            {label}
        </button>
    );
}
