import { useEffect, useRef } from 'react';
import { MessageDTO } from '@/modules/messaging/types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
    messages: MessageDTO[];
    isLoading?: boolean;
    hasMore?: boolean;
    onLoadMore?: () => void;
    currentUserId?: string;
}

export function MessageList({
    messages,
    isLoading,
    hasMore,
    onLoadMore,
    currentUserId,
}: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevMessagesLength = useRef(messages.length);

    // Auto-scroll to bottom on initial load or new message
    useEffect(() => {
        if (messages.length > prevMessagesLength.current) {
            // New messages added
            // If we are near bottom, scroll to bottom
            // For now, just scroll to bottom always for simplicity in MVP
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevMessagesLength.current = messages.length;
    }, [messages.length]);

    // Initial scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }, []);

    // Infinite scroll trigger (simplified)
    const handleScroll = () => {
        if (containerRef.current) {
            const { scrollTop } = containerRef.current;
            if (scrollTop === 0 && hasMore && !isLoading) {
                onLoadMore?.();
            }
        }
    };

    if (messages.length === 0 && !isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-500 p-8">
                <p>No hay mensajes aún. ¡Inicia la conversación!</p>
            </div>
        );
    }

    // Reverse messages to show oldest at top, newest at bottom
    // The API returns newest first (descending), so we reverse for display
    const displayMessages = [...messages].reverse();

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 h-full"
        >
            {isLoading && (
                <div className="text-center py-2">
                    <span className="text-xs text-gray-400">Cargando mensajes anteriores...</span>
                </div>
            )}

            {displayMessages.map((msg) => {
                // Heuristic for "isMe":
                // 1. If it's an optimistic message (temp-id), it's me.
                // 2. If we had the internal ID we would check that.
                // 3. Since we don't, we can't be 100% sure for historical messages without fetching internal ID.
                //
                // HOWEVER, we can cheat slightly:
                // The `MessageBubble` can render "You" if we pass a flag.
                //
                // Let's try to match by name as a fallback?
                // Or better: The `useSendMessage` hook sets `sender.id` to Clerk ID for optimistic messages.
                // Real messages have Internal ID.
                //
                // Let's assume for now that we will render all messages as "Received" unless they are optimistic,
                // UNTIL we fix the internal ID fetching.
                // This is safer than showing "Sent" for received messages.
                //
                // Wait, that's bad UX.
                //
                // Let's implement a quick `useInternalId` hook in `ChatContainer` or just fetch it there.
                // I will update `ChatContainer` to fetch it.
                //
                // For now, I will use a prop `currentInternalId` instead of `currentClerkId` and assume parent passes it.

                // Heuristic for "isMe":
                // 1. If it's an optimistic message (temp-id), it's me.
                // 2. If senderId matches currentUserId (Internal ID).
                const isMe = msg.senderId === 'temp-id' || (currentUserId && msg.senderId === currentUserId);

                return (
                    <MessageBubble
                        key={msg.id}
                        text={msg.text}
                        createdAt={msg.createdAt}
                        isSentByMe={!!isMe}
                        senderName={`${msg.sender.firstName} ${msg.sender.lastName}`}
                        isSending={msg.id.startsWith('temp-') || msg.id.length < 10} // Simple check for temp ID
                    />
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
}
