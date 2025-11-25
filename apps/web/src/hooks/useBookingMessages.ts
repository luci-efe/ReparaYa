import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { realtime, MessagePayload } from '@/lib/supabase/realtime';
import { MessageListDTO } from '@/modules/messaging/types';

const MESSAGES_PER_PAGE = 20;

export function useBookingMessages(bookingId: string) {
    const queryClient = useQueryClient();
    const queryKey = useMemo(() => ['messages', bookingId], [bookingId]);

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
        const handleNewMessage = (_payload: MessagePayload) => {
            // Invalidate query to refetch with full sender data.
            // Supabase realtime payload lacks relations (sender name/avatar),
            // so we refetch to get complete MessageDTO.
            // Note: Current user's sent messages are handled via optimistic updates in useSendMessage.
            queryClient.invalidateQueries({ queryKey });
        };

        const channel = realtime.subscribeToBookingMessages(bookingId, handleNewMessage);

        return () => {
            realtime.unsubscribe(channel);
        };
    }, [bookingId, queryClient, queryKey]);

    return query;
}
