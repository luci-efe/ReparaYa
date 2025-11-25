'use client';

import { useState } from 'react';
import { BookingStatus } from '@/modules/booking/types';
import { useRouter } from 'next/navigation';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

interface PaymentSectionProps {
    bookingId: string;
    status: BookingStatus;
    amount: number;
    onPaymentComplete: () => void;
}

export function PaymentSection({ bookingId, status, amount, onPaymentComplete }: PaymentSectionProps) {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const router = useRouter();

    const handlePayment = async () => {
        setLoading(true);
        try {
            // In a real app, this would trigger Stripe flow
            // For demo, we just advance the state to CONFIRMED
            const res = await fetch(`/api/bookings/${bookingId}/state`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: BookingStatus.CONFIRMED,
                    notes: 'Pago simulado completado por el cliente'
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                alert(error.error || 'Error al procesar el pago');
                return;
            }

            onPaymentComplete();
            router.refresh();
            setShowModal(false);
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Error al procesar el pago');
        } finally {
            setLoading(false);
        }
    };

    if (status !== BookingStatus.PENDING_PAYMENT) return null;

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 mt-6">
                <h3 className="text-lg font-semibold mb-4">Pago Requerido</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                        Tu reserva ha sido aprobada. Por favor realiza el pago del anticipo para confirmarla.
                    </p>
                </div>

                <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-600">Total a pagar (Anticipo 50%)</span>
                    <span className="text-2xl font-bold text-gray-900">${(amount * 0.5).toFixed(2)}</span>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="w-full bg-emerald-600 text-white py-3 px-4 rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                    Pagar Ahora (Demo)
                </button>
                <p className="text-xs text-center text-gray-500 mt-2">
                    * Este es un pago simulado para fines de demostración. No se realizará ningún cargo real.
                </p>
            </div>

            <ConfirmationModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={handlePayment}
                title="Confirmar Pago Simulado"
                message={`¿Estás seguro de realizar el pago simulado de $${(amount * 0.5).toFixed(2)} MXN? Esta acción confirmará tu reserva.`}
                confirmText="Pagar y Confirmar"
                isLoading={loading}
            />
        </>
    );
}
