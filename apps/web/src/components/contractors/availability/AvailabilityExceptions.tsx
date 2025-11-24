'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExceptionSchema } from '@/modules/contractors/availability/validators/exception';
import { ExceptionResponseDTO, CreateExceptionDTO } from '@/modules/contractors/availability/types/exception';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AvailabilityExceptionsProps {
    exceptions: ExceptionResponseDTO[];
    onUpdate: () => void;
}

export function AvailabilityExceptions({ exceptions, onUpdate }: AvailabilityExceptionsProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const exceptionDates = exceptions.map((e) => parseISO(e.date));

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedDate(undefined);
    };

    const handleQuickDelete = async (exceptionId: string, date: string) => {
        if (!confirm(`¿Estás seguro de eliminar la excepción del ${format(parseISO(date), 'dd MMM yyyy', { locale: es })}?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/contractors/me/availability/exceptions/${exceptionId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('Error al eliminar la excepción');
            }

            onUpdate();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Error al eliminar la excepción');
        }
    };

    return (
        <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Excepciones y Feriados</h2>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        onDayClick={handleDayClick}
                        modifiers={{ exception: exceptionDates }}
                        modifiersStyles={{
                            exception: {
                                fontWeight: 'bold',
                                border: '2px solid #3b82f6',
                                color: '#1d4ed8'
                            }
                        }}
                        locale={es}
                        className="border rounded-lg p-4 shadow-sm w-fit mx-auto"
                    />
                </div>
                <div className="flex-1 space-y-4">
                    <h3 className="font-medium text-gray-700">Próximas excepciones</h3>
                    {exceptions.length === 0 ? (
                        <p className="text-gray-500 italic">No hay excepciones configuradas.</p>
                    ) : (
                        <ul className="space-y-2 max-h-[300px] overflow-y-auto">
                            {exceptions
                                .sort((a, b) => a.date.localeCompare(b.date))
                                .map((ex) => (
                                    <li key={ex.id} className="p-3 bg-gray-50 rounded border flex justify-between items-center">
                                        <div>
                                            <p className="font-medium">{format(parseISO(ex.date), 'dd MMM yyyy', { locale: es })}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded ${ex.type === 'BLOCKED' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                {ex.type === 'BLOCKED' ? 'Bloqueado' : 'Disponible'}
                                            </span>
                                            {ex.reason && <p className="text-xs text-gray-500 mt-1">{ex.reason}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedDate(parseISO(ex.date));
                                                    setIsModalOpen(true);
                                                }}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                                onClick={() => handleQuickDelete(ex.id, ex.date)}
                                                aria-label={`Eliminar excepción del ${format(parseISO(ex.date), 'dd MMM yyyy', { locale: es })}`}
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                        </ul>
                    )}
                </div>
            </div>

            {isModalOpen && selectedDate && (
                <ExceptionModal
                    date={selectedDate}
                    existingException={exceptions.find((e) => e.date === format(selectedDate, 'yyyy-MM-dd'))}
                    onClose={closeModal}
                    onSuccess={() => {
                        closeModal();
                        onUpdate();
                    }}
                />
            )}
        </Card>
    );
}

interface ExceptionModalProps {
    date: Date;
    existingException?: ExceptionResponseDTO;
    onClose: () => void;
    onSuccess: () => void;
}

function ExceptionModal({ date, existingException, onClose, onSuccess }: ExceptionModalProps) {
    const [error, setError] = useState<string | null>(null);
    const dateStr = format(date, 'yyyy-MM-dd');

    const {
        register,
        control,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<CreateExceptionDTO>({
        resolver: zodResolver(createExceptionSchema),
        defaultValues: {
            date: dateStr,
            type: existingException?.type || 'BLOCKED',
            reason: existingException?.reason || '',
            intervals: existingException?.intervals || [],
        },
    });

    const type = watch('type');

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'intervals',
    });

    const onSubmit = async (data: CreateExceptionDTO) => {
        setError(null);
        try {
            // If intervals are empty and type is AVAILABLE, we might want to prevent submission or default to something.
            // But schema allows empty intervals? Let's check schema. Schema says intervals array.
            // If BLOCKED, intervals are ignored usually, but let's send empty array.

            const payload = {
                ...data,
                intervals: data.type === 'BLOCKED' ? [] : data.intervals,
            };

            const res = await fetch('/api/contractors/me/availability/exceptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Error al guardar excepción');
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        }
    };

    const handleDelete = async () => {
        if (!existingException) return;
        if (!confirm('¿Estás seguro de eliminar esta excepción?')) return;

        try {
            const res = await fetch(`/api/contractors/me/availability/exceptions/${existingException.id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Error al eliminar');
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">
                    Excepción para {format(date, 'dd MMMM yyyy', { locale: es })}
                </h3>

                {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <input type="hidden" {...register('date')} />

                    <div>
                        <label className="block text-sm font-medium mb-1">Tipo</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    value="BLOCKED"
                                    {...register('type')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                Bloquear día completo
                            </label>
                            <label className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    value="AVAILABLE"
                                    {...register('type')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                Horario especial
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Motivo (Opcional)</label>
                        <Input {...register('reason')} placeholder="Ej: Feriado, Cita médica..." />
                    </div>

                    {type === 'AVAILABLE' && (
                        <div className="space-y-2 border-t pt-4">
                            <h4 className="font-medium text-sm">Intervalos disponibles</h4>
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2">
                                    <Input type="time" {...register(`intervals.${index}.startTime`)} />
                                    <span>-</span>
                                    <Input type="time" {...register(`intervals.${index}.endTime`)} />
                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="text-red-500 hover:text-red-700 px-2"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => append({ startTime: '09:00', endTime: '17:00' })}
                            >
                                + Agregar intervalo
                            </Button>
                            {errors.intervals && <p className="text-red-500 text-xs">{errors.intervals.message}</p>}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                        {existingException && (
                            <Button type="button" variant="destructive" onClick={handleDelete} className="mr-auto">
                                Eliminar
                            </Button>
                        )}
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
