'use client';

import { useState } from 'react';
import { BookingStatus } from '@/modules/booking/types';
import { getValidTransitions } from '@/modules/booking/services/bookingStateMachine';
import { useRouter } from 'next/navigation';

interface ContractorBookingControlsProps {
    bookingId: string;
    currentStatus: BookingStatus;
    onStatusUpdate?: () => void;
}

export function ContractorBookingControls({ bookingId, currentStatus, onStatusUpdate }: ContractorBookingControlsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const validTransitions = getValidTransitions(currentStatus);

    const handleStatusChange = async (newStatus: BookingStatus) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/bookings/${bookingId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, notes: 'Actualización manual por contratista' }),
            });

            if (res.ok) {
                if (onStatusUpdate) onStatusUpdate();
                router.refresh();
            }
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSimulate = async () => {
        setSimulating(true);
        try {
            const res = await fetch(`/api/bookings/${bookingId}/simulate`, {
                method: 'POST',
            });

            if (res.ok) {
                if (onStatusUpdate) onStatusUpdate();
                router.refresh();
            }
        } catch (error) {
            console.error('Error simulating:', error);
        } finally {
            setSimulating(false);
        }
    };

    if (validTransitions.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Gestión de Estado</h3>

            <div className="flex flex-wrap gap-2 mb-4">
                {validTransitions.map((status) => (
                    <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        disabled={loading || simulating}
                        className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 disabled:opacity-50"
                    >
                        Mover a {status}
                    </button>
                ))}
            </div>

            <div className="border-t pt-4">
                <button
                    onClick={handleSimulate}
                    disabled={loading || simulating}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {simulating ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Simulando Avance...
                        </>
                    ) : (
                        'Simular Siguiente Paso (Demo)'
                    )}
                </button>
            </div>
        </div>
    );
}
