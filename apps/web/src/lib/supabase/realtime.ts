import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './client';
import { Message } from '@prisma/client';

export type MessagePayload = RealtimePostgresChangesPayload<Message>;

export const realtime = {
    subscribeToBookingMessages(
        bookingId: string,
        onInsert: (payload: MessagePayload) => void
    ): RealtimeChannel {
        const channelName = `booking-${bookingId}`;

        return supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'Message',
                    filter: `bookingId=eq.${bookingId}`,
                },
                onInsert
            )
            .subscribe();
    },

    unsubscribe(channel: RealtimeChannel) {
        supabase.removeChannel(channel);
    },
};
