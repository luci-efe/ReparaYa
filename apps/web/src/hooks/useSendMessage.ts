import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageDTO } from '@/modules/messaging/types';
import { v4 as uuidv4 } from 'uuid';
import { useUser } from '@clerk/nextjs';

export function useSendMessage(bookingId: string) {
    const queryClient = useQueryClient();
    const { user } = useUser();

    return useMutation({
        mutationFn: async (text: string) => {
            const res = await fetch(`/api/bookings/${bookingId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText || 'Failed to send message');
            }

            return res.json();
        },
        onMutate: async (text) => {
            await queryClient.cancelQueries({ queryKey: ['messages', bookingId] });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const previousMessages = queryClient.getQueryData<any>(['messages', bookingId]);

            if (user) {
                const optimisticMessage: MessageDTO = {
                    id: uuidv4(),
                    bookingId,
                    senderId: user.id,
                    text,
                    createdAt: new Date(),
                    sender: {
                        id: user.id,
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        avatarUrl: user.imageUrl,
                    },
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                queryClient.setQueryData<any>(['messages', bookingId], (old: any) => {
                    if (!old) return { pages: [{ messages: [optimisticMessage] }], pageParams: [] };

                    const newPages = [...old.pages];
                    // Add to the first page (newest messages)
                    if (newPages.length > 0) {
                        newPages[0] = {
                            ...newPages[0],
                            messages: [optimisticMessage, ...newPages[0].messages],
                        };
                    }

                    return {
                        ...old,
                        pages: newPages,
                    };
                });
            }

            return { previousMessages };
        },
        onError: (err, newTodo, context) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(['messages', bookingId], context.previousMessages);
            }
        },
        onSuccess: (data: MessageDTO) => {
            // The realtime subscription might also trigger an update.
            // We should replace the optimistic message with the real one.
            // But since we invalidate in realtime hook, maybe we just let that handle it?
            //
            // If we rely on invalidation, we might see a flicker.
            // Ideally we replace the temp ID with real ID.

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            queryClient.setQueryData<any>(['messages', bookingId], (old: any) => {
                if (!old) return old;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const newPages = old.pages.map((page: any) => ({
                    ...page,
                    messages: page.messages.map((msg: MessageDTO) =>
                        msg.text === data.text && msg.createdAt.getTime() === new Date(data.createdAt).getTime() // Weak match
                            ? data
                            : msg
                    ),
                }));

                return {
                    ...old,
                    pages: newPages,
                };
            });

            queryClient.invalidateQueries({ queryKey: ['messages', bookingId] });
        },
    });
}
