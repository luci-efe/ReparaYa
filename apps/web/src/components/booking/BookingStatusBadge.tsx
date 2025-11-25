import { BookingStatus } from '@/modules/booking/types';

interface BookingStatusBadgeProps {
    status: BookingStatus;
}

const statusConfig: Record<BookingStatus, { label: string; color: string }> = {
    [BookingStatus.PENDING_APPROVAL as BookingStatus]: { label: 'Esperando Confirmación', color: 'bg-amber-100 text-amber-800' },
    [BookingStatus.PENDING_PAYMENT]: { label: 'Pendiente de Pago', color: 'bg-yellow-100 text-yellow-800' },
    [BookingStatus.CONFIRMED]: { label: 'Confirmada', color: 'bg-blue-100 text-blue-800' },
    [BookingStatus.ON_ROUTE]: { label: 'En Camino', color: 'bg-indigo-100 text-indigo-800' },
    [BookingStatus.ON_SITE]: { label: 'En Sitio', color: 'bg-purple-100 text-purple-800' },
    [BookingStatus.IN_PROGRESS]: { label: 'En Progreso', color: 'bg-orange-100 text-orange-800' },
    [BookingStatus.COMPLETED]: { label: 'Completada', color: 'bg-green-100 text-green-800' },
    [BookingStatus.CANCELLED]: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
    [BookingStatus.DISPUTED]: { label: 'En Disputa', color: 'bg-red-100 text-red-800' },
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
}
