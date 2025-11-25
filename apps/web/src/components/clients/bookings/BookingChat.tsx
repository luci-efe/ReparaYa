'use client';

import { ChatContainer } from '@/components/shared/messaging/ChatContainer';
import { Booking } from '@prisma/client';

interface BookingChatProps {
    booking: { id: string };
}

export function BookingChat({ booking }: BookingChatProps) {
    return (
        <div className="h-[600px]">
            <ChatContainer bookingId={booking.id} className="h-full" />
        </div>
    );
}
