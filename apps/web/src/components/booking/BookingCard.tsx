import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BookingStatusBadge } from './BookingStatusBadge';
import { BookingStatus } from '@/modules/booking/types';

interface BookingCardProps {
    booking: {
        id: string;
        scheduledDate: string | Date;
        status: BookingStatus;
        service?: {
            title: string;
        };
        contractor?: {
            firstName: string;
            lastName: string;
            contractorProfile?: {
                businessName: string;
            } | null;
        };
        client?: {
            firstName: string;
            lastName: string;
        };
    };
    role: 'CLIENT' | 'CONTRACTOR';
}

export function BookingCard({ booking, role }: BookingCardProps) {
    const date = new Date(booking.scheduledDate);
    const otherPartyName = role === 'CLIENT'
        ? (booking.contractor?.contractorProfile?.businessName || `${booking.contractor?.firstName || ''} ${booking.contractor?.lastName || ''}`)
        : `${booking.client?.firstName || ''} ${booking.client?.lastName || ''}`;

    const detailLink = role === 'CLIENT'
        ? `/clients/bookings/${booking.id}`
        : `/contractors/bookings/${booking.id}`;

    return (
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-semibold text-gray-900">{booking.service?.title || 'Servicio'}</h3>
                    <p className="text-sm text-gray-500">{otherPartyName}</p>
                </div>
                <BookingStatusBadge status={booking.status} />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{format(date, 'PPPP p', { locale: es })}</span>
            </div>

            <Link
                href={detailLink}
                className="block w-full text-center py-2 px-4 bg-gray-50 text-emerald-600 font-medium rounded-md hover:bg-emerald-50 transition-colors"
            >
                Ver Detalles
            </Link>
        </div>
    );
}
