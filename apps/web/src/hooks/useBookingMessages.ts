import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { realtime, MessagePayload } from '@/lib/supabase/realtime';
import { MessageListDTO, MessageDTO } from '@/modules/messaging/types';

const MESSAGES_PER_PAGE = 20;

export function useBookingMessages(bookingId: string) {
    const queryClient = useQueryClient();
    const queryKey = ['messages', bookingId];

    const query = useInfiniteQuery<MessageListDTO>({
        queryKey,
        queryFn: async ({ pageParam }) => {
            const params = new URLSearchParams();
            params.set('limit', MESSAGES_PER_PAGE.toString());
            if (pageParam) {
                params.set('cursor', pageParam as string);
            }

            const res = await fetch(`/api/bookings/${bookingId}/messages?${params.toString()}`);
            if (!res.ok) {
                throw new Error('Failed to fetch messages');
            }
            return res.json();
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: Infinity, // Rely on realtime updates
    });

    useEffect(() => {
        const handleNewMessage = (payload: MessagePayload) => {
            const newMessage = payload.new;

            // We need to fetch the sender info because Supabase payload only has raw table data
            // Or we can optimistically add it if we know it's the current user, 
            // but for incoming messages from others we might need to fetch or just show "Loading..."
            // 
            // Actually, the best way is to invalidate the query or manually update cache.
            // Since we want instant updates, let's try to update cache.
            // But `payload.new` lacks `sender` relation.
            //
            // Option 1: Invalidate query (easiest, but triggers refetch)
            // Option 2: Fetch single message details
            // Option 3: Just append what we have and let UI handle missing sender?
            //
            // Let's go with Option 1 for simplicity and correctness first, 
            // or maybe we can do a hybrid: append immediately, then invalidate to get full data.
            //
            // However, the proposal says: "On INSERT event: call queryClient.setQueryData to append new message"
            //
            // If we only have `payload.new`, we don't have the sender name/avatar.
            // The UI might break if it expects `sender` object.
            //
            // Let's check `MessageDTO`. It requires `sender`.
            //
            // So we should probably invalidate the query to fetch the full message with relation.
            // OR we can fetch the single message from API.
            //
            // Let's try invalidating first. It's fast enough usually.
            // But to be "Realtime" and "Optimistic", we want it instant.
            //
            // If the message is from CURRENT USER, we likely already have it via optimistic update in useSendMessage.
            // So this realtime event is mostly for INCOMING messages.
            //
            // For incoming messages, we can invalidate.

            queryClient.invalidateQueries({ queryKey });
        };

        const channel = realtime.subscribeToBookingMessages(bookingId, handleNewMessage);

        return () => {
            realtime.unsubscribe(channel);
        };
    }, [bookingId, queryClient, queryKey]);

    return query;
}
