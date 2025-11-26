'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RatingStars } from '@/components/ratings/RatingStars';

interface PendingRating {
    id: string;
    stars: number;
    comment: string | null;
    createdAt: string;
    booking: {
        id: string;
        client: { firstName: string; lastName: string };
        contractor: { firstName: string; lastName: string };
        service: { title: string };
    };
    type: 'CLIENT' | 'CONTRACTOR'; // Added for frontend distinction
}

export default function AdminRatingsPage() {
    const [ratings, setRatings] = useState<PendingRating[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRatings = async () => {
        try {
            const res = await fetch('/api/admin/ratings');
            if (res.ok) {
                const data = await res.json();
                // Combine and tag types
                const combined = [
                    ...data.clientRatings.map((r: PendingRating) => ({ ...r, type: 'CLIENT' as const })),
                    ...data.contractorRatings.map((r: PendingRating) => ({ ...r, type: 'CONTRACTOR' as const })),
                ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setRatings(combined);
            }
        } catch (error) {
            console.error('Error fetching ratings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRatings();
    }, []);

    const handleModeration = async (id: string, status: 'APPROVED' | 'REJECTED', type: 'CLIENT' | 'CONTRACTOR') => {
        try {
            const res = await fetch(`/api/admin/ratings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, type }),
            });

            if (res.ok) {
                fetchRatings(); // Refresh list
            } else {
                alert('Error updating rating status');
            }
        } catch (error) {
            console.error('Error moderating rating:', error);
        }
    };

    if (loading) return <div className="p-8">Cargando...</div>;

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-6">Moderación de Calificaciones</h1>

            {ratings.length === 0 ? (
                <p className="text-gray-500">No hay calificaciones pendientes de moderación.</p>
            ) : (
                <div className="space-y-4">
                    {ratings.map((rating) => (
                        <div key={rating.id} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-1 text-xs font-bold rounded ${rating.type === 'CLIENT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                            }`}>
                                            {rating.type === 'CLIENT' ? 'Cliente → Contratista' : 'Contratista → Cliente'}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {format(new Date(rating.createdAt), "d 'de' MMMM, yyyy HH:mm", { locale: es })}
                                        </span>
                                    </div>
                                    <h3 className="font-medium text-lg">
                                        {rating.booking.service.title}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        De: {rating.type === 'CLIENT'
                                            ? `${rating.booking.client.firstName} ${rating.booking.client.lastName}`
                                            : `${rating.booking.contractor.firstName} ${rating.booking.contractor.lastName}`
                                        }
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Para: {rating.type === 'CLIENT'
                                            ? `${rating.booking.contractor.firstName} ${rating.booking.contractor.lastName}`
                                            : `${rating.booking.client.firstName} ${rating.booking.client.lastName}`
                                        }
                                    </p>
                                </div>
                                <RatingStars value={rating.stars} readonly />
                            </div>

                            <div className="bg-gray-50 p-4 rounded-md mb-4">
                                <p className="text-gray-800 italic">&quot;{rating.comment}&quot;</p>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => handleModeration(rating.id, 'REJECTED', rating.type)}
                                    className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-md font-medium transition-colors"
                                >
                                    Rechazar
                                </button>
                                <button
                                    onClick={() => handleModeration(rating.id, 'APPROVED', rating.type)}
                                    className="px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-md font-medium transition-colors"
                                >
                                    Aprobar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
