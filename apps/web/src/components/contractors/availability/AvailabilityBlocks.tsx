'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { BlockResponseDTO, CreateBlockDTO } from '@/modules/contractors/availability/types/block';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AvailabilityBlocksProps {
    blocks: BlockResponseDTO[];
    onUpdate: () => void;
}

export function AvailabilityBlocks({ blocks, onUpdate }: AvailabilityBlocksProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este bloqueo?')) return;
        try {
            const res = await fetch(`/api/contractors/me/availability/blocks/${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Error al eliminar');
            onUpdate();
        } catch (err) {
            alert('Error al eliminar bloqueo');
        }
    };

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Bloqueos Manuales</h2>
                <Button onClick={() => setIsModalOpen(true)} size="sm">
                    + Agregar Bloqueo
                </Button>
            </div>

            {blocks.length === 0 ? (
                <div className="bg-gray-50 rounded p-8 text-center text-gray-500 italic">
                    No tienes bloqueos configurados (vacaciones, mantenimiento, etc.)
                </div>
            ) : (
                <ul className="space-y-3">
                    {[...blocks]
                        .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
                        .map((block) => (
                            <li key={block.id} className="flex items-center justify-between p-4 bg-gray-50 rounded border">
                                <div>
                                    <p className="font-medium">
                                        {format(parseISO(block.startDateTime), 'dd MMM yyyy HH:mm', { locale: es })} -{' '}
                                        {format(parseISO(block.endDateTime), 'dd MMM yyyy HH:mm', { locale: es })}
                                    </p>
                                    {block.reason && <p className="text-sm text-gray-600 mt-1">{block.reason}</p>}
                                </div>
                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-800 hover:bg-red-50" onClick={() => handleDelete(block.id)}>
                                    Eliminar
                                </Button>
                            </li>
                        ))}
                </ul>
            )}

            {isModalOpen && (
                <BlockModal
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={() => {
                        setIsModalOpen(false);
                        onUpdate();
                    }}
                />
            )}
        </Card>
    );
}

interface BlockModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

// Helper to format Date to input datetime-local string (YYYY-MM-DDTHH:mm)
const toLocalISOString = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function BlockModal({ onClose, onSuccess }: BlockModalProps) {
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<{ startLocal: string; endLocal: string; reason: string }>({
        defaultValues: {
            startLocal: toLocalISOString(new Date()),
            endLocal: toLocalISOString(new Date(Date.now() + 3600000)), // +1 hour
            reason: '',
        },
    });

    const onSubmit = async (data: { startLocal: string; endLocal: string; reason: string }) => {
        setError(null);
        try {
            // Convert local inputs to ISO UTC strings
            const payload: CreateBlockDTO = {
                startDateTime: new Date(data.startLocal).toISOString(),
                endDateTime: new Date(data.endLocal).toISOString(),
                reason: data.reason,
            };

            // Validate manually or let backend do it? 
            // We can use the schema here too but we need to transform data first.
            // Let's just try to send.

            const res = await fetch('/api/contractors/me/availability/blocks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Error al guardar bloqueo');
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Nuevo Bloqueo</h3>

                {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Inicio</label>
                        <Input type="datetime-local" {...register('startLocal', { required: 'Requerido' })} />
                        {errors.startLocal && <p className="text-red-500 text-xs">{errors.startLocal.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Fin</label>
                        <Input type="datetime-local" {...register('endLocal', { required: 'Requerido' })} />
                        {errors.endLocal && <p className="text-red-500 text-xs">{errors.endLocal.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Motivo (Opcional)</label>
                        <Input {...register('reason')} placeholder="Ej: Vacaciones, Mantenimiento..." />
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
