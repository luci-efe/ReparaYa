import { useBookingMessages } from '@/hooks/useBookingMessages';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useInternalUser } from '@/hooks/useInternalUser';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

interface ChatContainerProps {
    bookingId: string;
    className?: string;
}

export function ChatContainer({ bookingId, className = '' }: ChatContainerProps) {
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        status
    } = useBookingMessages(bookingId);

    const { mutateAsync: sendMessage } = useSendMessage(bookingId);

    const { data: internalUser } = useInternalUser();

    // Flatten pages
    const messages = data?.pages.flatMap((page) => page.messages) || [];

    if (status === 'pending') {
        return (
            <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
                <p className="text-red-500">Error al cargar los mensajes.</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-full bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
            <div className="flex-1 overflow-hidden relative">
                <MessageList
                    messages={messages}
                    isLoading={isFetchingNextPage}
                    hasMore={hasNextPage}
                    onLoadMore={fetchNextPage}
                    currentUserId={internalUser?.id}
                />
            </div>
            <MessageInput onSend={async (text) => { await sendMessage(text); }} />
        </div>
    );
}
