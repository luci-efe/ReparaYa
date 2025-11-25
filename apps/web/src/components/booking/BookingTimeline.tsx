import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingStatus } from '@/modules/booking/types';

interface BookingTimelineProps {
    history: {
        id: string;
        toState: BookingStatus;
        createdAt: string | Date;
        notes?: string | null;
    }[];
}

const stateLabels: Record<BookingStatus, string> = {
    [BookingStatus.PENDING_APPROVAL as BookingStatus]: 'Esperando Confirmación',
    [BookingStatus.PENDING_PAYMENT]: 'Pendiente de Pago',
    [BookingStatus.CONFIRMED]: 'Confirmada',
    [BookingStatus.ON_ROUTE]: 'Profesional en Camino',
    [BookingStatus.ON_SITE]: 'Profesional en Sitio',
    [BookingStatus.IN_PROGRESS]: 'Trabajo Iniciado',
    [BookingStatus.COMPLETED]: 'Trabajo Completado',
    [BookingStatus.CANCELLED]: 'Cancelada',
    [BookingStatus.DISPUTED]: 'En Disputa',
};

export function BookingTimeline({ history }: BookingTimelineProps) {
    return (
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                {history.map((event, eventIdx) => (
                    <li key={event.id}>
                        <div className="relative pb-8">
                            {eventIdx !== history.length - 1 ? (
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
                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {stateLabels[event.toState] || event.toState}
                                        </p>
                                        {event.notes && (
                                            <p className="text-sm text-gray-500 mt-1">{event.notes}</p>
                                        )}
                                    </div>
                                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                        <time dateTime={new Date(event.createdAt).toISOString()}>
                                            {format(new Date(event.createdAt), 'p', { locale: es })}
                                        </time>
                                        <div className="text-xs">
                                            {format(new Date(event.createdAt), 'P', { locale: es })}
                                        </div>
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
