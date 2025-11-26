import { ClientBookingDetail } from '@/components/clients/bookings/ClientBookingDetail';

export default function ClientBookingDetailPage({ params }: { params: { id: string } }) {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">Detalles de mi Reserva</h1>
            </div>
            <ClientBookingDetail bookingId={params.id} />
        </div>
    );
}
