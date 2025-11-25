'use client';

import { useState, useEffect } from 'react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface Slot {
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    timezone: string;
}

interface AvailabilitySlotPickerProps {
    serviceId: string;
    onSelectSlot: (slotId: string, date: Date) => void;
}

export function AvailabilitySlotPicker({ serviceId, onSelectSlot }: AvailabilitySlotPickerProps) {
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/services/${serviceId}/slots`)
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setSlots(data);
                } else {
                    console.error('Invalid slots data:', data);
                    setSlots([]);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error('Error fetching slots:', err);
                setSlots([]);
                setLoading(false);
            });
    }, [serviceId]);

    // Group slots by date
    const slotsByDate = slots.reduce((acc, slot) => {
        const dateKey = slot.date;
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(slot);
        return acc;
    }, {} as Record<string, Slot[]>);

    // Get next 7 days from available slots
    const dates = Object.keys(slotsByDate).sort().slice(0, 7);

    // Select first date by default if not selected
    useEffect(() => {
        if (!selectedDate && dates.length > 0) {
            setSelectedDate(new Date(dates[0] + 'T00:00:00'));
        }
    }, [dates, selectedDate]);

    const handleSlotClick = (slot: Slot) => {
        const slotKey = `${slot.date}-${slot.startTime}`;
        setSelectedSlotKey(slotKey);

        // Construct full date object
        const dateTimeStr = `${slot.date}T${slot.startTime}:00`;
        const date = new Date(dateTimeStr);

        // The slot generator does not provide a unique slot ID, but each slot is uniquely identified by its date and startTime.
        // Therefore, we use the composite key `${slot.date}-${slot.startTime}` as the slot ID, which is guaranteed to be unique for each slot.
        // This approach ensures compatibility with the parent component's expectations for a slotId.
        onSelectSlot(slotKey, date);
    };

    if (loading) return <div className="animate-pulse h-40 bg-gray-100 rounded-lg"></div>;

    if (slots.length === 0) {
        return (
            <div className="text-center p-6 bg-gray-50 rounded-lg text-gray-500">
                No hay horarios disponibles para los próximos días.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Horarios Disponibles</h3>

            <div className="flex gap-2 overflow-x-auto pb-2">
                {dates.map((dateStr) => {
                    const date = new Date(dateStr + 'T00:00:00');
                    const isSelected = selectedDate && isSameDay(selectedDate, date);
                    const hasSlots = slotsByDate[dateStr]?.length > 0;

                    return (
                        <button
                            key={dateStr}
                            onClick={() => setSelectedDate(date)}
                            disabled={!hasSlots}
                            className={`flex flex-col items-center justify-center p-3 rounded-lg min-w-[80px] border transition-colors ${isSelected
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                : 'bg-white border-gray-200 hover:border-emerald-300'
                                } ${!hasSlots ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <span className="text-xs font-medium uppercase">{format(date, 'EEE', { locale: es })}</span>
                            <span className="text-lg font-bold">{format(date, 'd')}</span>
                        </button>
                    );
                })}
            </div>

            {selectedDate && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                    {slotsByDate[format(selectedDate, 'yyyy-MM-dd')]?.map((slot) => {
                        const slotKey = `${slot.date}-${slot.startTime}`;
                        return (
                            <button
                                key={slotKey}
                                onClick={() => handleSlotClick(slot)}
                                className={`py-2 px-3 text-sm rounded-md border transition-all ${selectedSlotKey === slotKey
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400'
                                    }`}
                            >
                                {slot.startTime}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
