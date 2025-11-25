import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingStatus } from '@/modules/booking/types';
import { BookingStateHistory } from '@prisma/client';

interface BookingTimelineProps {
    history: BookingStateHistory[];
}

export function BookingTimeline({ history }: BookingTimelineProps) {
    if (!history || history.length === 0) return null;

    // Sort history by date descending
    const sortedHistory = [...history].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return (
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                {sortedHistory.map((event, eventIdx) => (
                    <li key={event.id}>
                        <div className="relative pb-8">
                            {eventIdx !== sortedHistory.length - 1 ? (
                                <span
                                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                    aria-hidden="true"
                                />
                            ) : null}
                            <div className="relative flex space-x-3">
                                <div>
                                    <span className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center ring-8 ring-white">
                                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                                    </span>
                                </div>
                                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            Cambio a <span className="font-medium text-gray-900">{formatStatus(event.toState)}</span>
                                        </p>
                                        {event.notes && (
                                            <p className="mt-1 text-sm text-gray-500 italic">&quot;{event.notes}&quot;</p>
                                        )}
                                    </div>
                                    <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                        <time dateTime={event.createdAt.toString()}>
                                            {format(new Date(event.createdAt), 'PP p', { locale: es })}
                                        </time>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function formatStatus(status: BookingStatus): string {
    const map: Record<BookingStatus, string> = {
        PENDING_APPROVAL: 'Pendiente de Aprobación',
        PENDING_PAYMENT: 'Pendiente de Pago',
        CONFIRMED: 'Confirmada',
        ON_ROUTE: 'En Camino',
        ON_SITE: 'En Sitio',
        IN_PROGRESS: 'En Progreso',
        COMPLETED: 'Completada',
        CANCELLED: 'Cancelada',
        DISPUTED: 'En Disputa',
    };
    return map[status] || status;
}
