'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createWeeklyRuleSchema } from '@/modules/contractors/availability/validators/weeklyRule';
import { WeeklyRuleResponseDTO, CreateWeeklyRuleDTO } from '@/modules/contractors/availability/types/weeklyRule';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AvailabilityWeeklyProps {
    rules: WeeklyRuleResponseDTO[];
    onUpdate: () => void;
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function AvailabilityWeekly({ rules, onUpdate }: AvailabilityWeeklyProps) {
    const [editingDay, setEditingDay] = useState<number | null>(null);

    const handleEdit = (dayOfWeek: number) => {
        setEditingDay(dayOfWeek);
    };

    const closeEdit = () => {
        setEditingDay(null);
    };

    return (
        <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Horarios Semanales</h2>
            <div className="space-y-4">
                {DAYS.map((dayName, index) => {
                    const rule = rules.find((r) => r.dayOfWeek === index);
                    return (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="w-1/4 font-medium">{dayName}</div>
                            <div className="flex-1">
                                {rule && rule.intervals.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {rule.intervals.map((interval, i) => (
                                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                                                {interval.startTime} - {interval.endTime}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-gray-400 italic">No disponible</span>
                                )}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(index)}>
                                {rule ? 'Editar' : 'Agregar'}
                            </Button>
                        </div>
                    );
                })}
            </div>

            {editingDay !== null && (
                <WeeklyRuleForm
                    dayOfWeek={editingDay}
                    existingRule={rules.find((r) => r.dayOfWeek === editingDay)}
                    onClose={closeEdit}
                    onSuccess={() => {
                        closeEdit();
                        onUpdate();
                    }}
                />
            )}
        </Card>
    );
}

interface WeeklyRuleFormProps {
    dayOfWeek: number;
    existingRule?: WeeklyRuleResponseDTO;
    onClose: () => void;
    onSuccess: () => void;
}

function WeeklyRuleForm({ dayOfWeek, existingRule, onClose, onSuccess }: WeeklyRuleFormProps) {
    const [error, setError] = useState<string | null>(null);
    const {
        register,
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<CreateWeeklyRuleDTO>({
        resolver: zodResolver(createWeeklyRuleSchema),
        defaultValues: {
            dayOfWeek,
            intervals: existingRule?.intervals || [{ startTime: '09:00', endTime: '17:00' }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'intervals',
    });

    const onSubmit = async (data: CreateWeeklyRuleDTO) => {
        setError(null);
        try {
            const res = await fetch('/api/contractors/me/availability/weekly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Error al guardar');
            }

            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-bold mb-4">Editar horario: {DAYS[dayOfWeek]}</h3>

                {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{error}</div>}
                {errors.root && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{errors.root.message}</div>}
                {errors.intervals?.root && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">{errors.intervals.root.message}</div>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <input type="hidden" {...register('dayOfWeek', { valueAsNumber: true })} />

                    <div className="space-y-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                                <div className="flex-1">
                                    <Input
                                        type="time"
                                        {...register(`intervals.${index}.startTime`)}
                                        className={errors.intervals?.[index]?.startTime ? 'border-red-500' : ''}
                                    />
                                </div>
                                <span>-</span>
                                <div className="flex-1">
                                    <Input
                                        type="time"
                                        {...register(`intervals.${index}.endTime`)}
                                        className={errors.intervals?.[index]?.endTime ? 'border-red-500' : ''}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="text-red-500 hover:text-red-700 px-2"
                                    aria-label="Eliminar intervalo"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => append({ startTime: '09:00', endTime: '17:00' })}
                    >
                        + Agregar intervalo
                    </Button>

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
