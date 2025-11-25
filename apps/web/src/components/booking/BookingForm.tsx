'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBookingSchema } from '@/modules/booking/validators';
import { z } from 'zod';

type BookingFormOutput = z.output<typeof createBookingSchema>;
type BookingFormInput = z.input<typeof createBookingSchema>;

interface Address {
    id: string;
    addressLine1: string;
    city: string;
    isDefault: boolean;
}

interface BookingFormProps {
    serviceId: string;
    slotId: string;
    scheduledDate: Date;
    onSuccess: (bookingId: string) => void;
    onCancel: () => void;
}

export function BookingForm({ serviceId, slotId, scheduledDate, onSuccess, onCancel }: BookingFormProps) {
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(true);

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<BookingFormInput, unknown, BookingFormOutput>({
        resolver: zodResolver(createBookingSchema),
        defaultValues: {
            serviceId,
            slotId,
            scheduledDate: scheduledDate,
            address: '',
            notes: '',
        },
    });

    // Fetch user addresses
    useEffect(() => {
        fetch('/api/clients/me/addresses')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setAddresses(data as Address[]);
                    // Set default address if available
                    const defaultAddr = data.find((a: Address) => a.isDefault);
                    if (defaultAddr) {
                        setValue('address', `${defaultAddr.addressLine1}, ${defaultAddr.city}`);
                    } else if (data.length > 0) {
                        setValue('address', `${data[0].addressLine1}, ${data[0].city}`);
                    }
                }
                setLoadingAddresses(false);
            })
            .catch(err => {
                console.error('Error fetching addresses:', err);
                setLoadingAddresses(false);
            });
    }, [setValue]);

    const onSubmit = async (data: BookingFormOutput) => {
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Error al crear la reserva');
            }

            const booking = await res.json();
            onSuccess(booking.id);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                {loadingAddresses ? (
                    <div className="animate-pulse h-10 bg-gray-100 rounded-md"></div>
                ) : addresses.length > 0 ? (
                    <select
                        {...register('address')}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    >
                        <option value="">Selecciona una dirección</option>
                        {addresses.map((addr) => (
                            <option key={addr.id} value={`${addr.addressLine1}, ${addr.city}`}>
                                {addr.addressLine1}, {addr.city} {addr.isDefault ? '(Predeterminada)' : ''}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        {...register('address')}
                        type="text"
                        placeholder="Calle, número, colonia..."
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                )}
                {errors.address && (
                    <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                )}
                {addresses.length === 0 && !loadingAddresses && (
                    <p className="text-xs text-gray-500 mt-1">No tienes direcciones guardadas. Se usará la ingresada manualmente.</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales</label>
                <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Instrucciones especiales para el profesional..."
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
                />
                {errors.notes && (
                    <p className="text-red-500 text-xs mt-1">{errors.notes.message}</p>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                >
                    {isSubmitting ? 'Confirmando...' : 'Confirmar Reserva'}
                </button>
            </div>
        </form>
    );
}
