import { BookingDetail } from '@/components/contractors/bookings/BookingDetail';

export default function BookingDetailPage({ params }: { params: { id: string } }) {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Detalles de la Reserva</h1>
            </div>
            <BookingDetail bookingId={params.id} />
        </div>
    );
}
