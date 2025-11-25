'use client';

import { useState } from 'react';
import { BookingStatus } from '@/modules/booking/types';
import { useRouter } from 'next/navigation';

interface BookingStateActionsProps {
    bookingId: string;
    currentStatus: BookingStatus;
    onStatusUpdate: () => void;
}

import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

export function BookingStateActions({ bookingId, currentStatus, onStatusUpdate }: BookingStateActionsProps) {
    const [loading, setLoading] = useState(false);
    const [action, setAction] = useState<{ type: BookingStatus; notes?: string } | null>(null);
    const router = useRouter();

    const handleAction = async () => {
        if (!action) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/bookings/${bookingId}/state`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action.type, notes: action.notes }),
            });

            if (!res.ok) {
                const error = await res.json();
                alert(error.error || 'Error al actualizar el estado');
                return;
            }

            onStatusUpdate();
            router.refresh();
            setAction(null);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al actualizar el estado');
        } finally {
            setLoading(false);
        }
    };

    const confirmAction = (status: BookingStatus, notes?: string) => {
        setAction({ type: status, notes });
    };

    const handleReject = () => {
        const reason = prompt('Motivo del rechazo:');
        if (reason) confirmAction(BookingStatus.CANCELLED, `Rechazada: ${reason}`);
    };

    return (
        <>
            {currentStatus === BookingStatus.PENDING_APPROVAL && (
                <div className="flex gap-4">
                    <button
                        onClick={() => confirmAction(BookingStatus.PENDING_PAYMENT, 'Aprobada por contratista')}
                        disabled={loading}
                        className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                    >
                        Aprobar Reserva
                    </button>
                    <button
                        onClick={handleReject}
                        disabled={loading}
                        className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200 disabled:opacity-50"
                    >
                        Rechazar
                    </button>
                </div>
            )}

            {currentStatus === BookingStatus.CONFIRMED && (
                <div className="flex gap-4">
                    <button
                        onClick={() => confirmAction(BookingStatus.ON_ROUTE)}
                        disabled={loading}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        Marcar &quot;En Camino&quot;
                    </button>
                    <button
                        onClick={() => confirmAction(BookingStatus.ON_SITE)}
                        disabled={loading}
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                        Marcar &quot;En Sitio&quot;
                    </button>
                </div>
            )}

            {currentStatus === BookingStatus.ON_ROUTE && (
                <div className="flex gap-4">
                    <button
                        onClick={() => confirmAction(BookingStatus.ON_SITE)}
                        disabled={loading}
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                        Marcar &quot;En Sitio&quot;
                    </button>
                </div>
            )}

            {currentStatus === BookingStatus.ON_SITE && (
                <div className="flex gap-4">
                    <button
                        onClick={() => confirmAction(BookingStatus.IN_PROGRESS)}
                        disabled={loading}
                        className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
                    >
                        Iniciar Trabajo
                    </button>
                    <button
                        onClick={() => confirmAction(BookingStatus.COMPLETED)}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                        Completar Trabajo
                    </button>
                </div>
            )}

            {currentStatus === BookingStatus.IN_PROGRESS && (
                <div className="flex gap-4">
                    <button
                        onClick={() => confirmAction(BookingStatus.COMPLETED)}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                        Completar Trabajo
                    </button>
                </div>
            )}

            <ConfirmationModal
                isOpen={!!action}
                onClose={() => setAction(null)}
                onConfirm={handleAction}
                title="Confirmar Acción"
                message={`¿Estás seguro de cambiar el estado a ${action?.type}?`}
                confirmText="Confirmar"
                isLoading={loading}
                isDestructive={action?.type === BookingStatus.CANCELLED}
            />
        </>
    );
}
