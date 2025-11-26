import { ConversationPreviewDTO } from '@/modules/messaging/types';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConversationPreviewCardProps {
    conversation: ConversationPreviewDTO;
    role: 'CLIENT' | 'CONTRACTOR';
}

export function ConversationPreviewCard({ conversation, role }: ConversationPreviewCardProps) {
    const basePath = role === 'CLIENT' ? '/clients' : '/contractors';
    const href = `${basePath}/bookings/${conversation.bookingId}?tab=chat`;

    return (
        <Link href={href} className="block">
            <div className="bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                            {conversation.otherPartyAvatarUrl ? (
                                <img
                                    src={conversation.otherPartyAvatarUrl}
                                    alt={conversation.otherPartyName}
                                    className="h-10 w-10 rounded-full object-cover"
                                />
                            ) : (
                                conversation.otherPartyName.charAt(0)
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">
                                {conversation.otherPartyName}
                            </h3>
                            <p className="text-sm text-gray-500">{conversation.serviceTitle}</p>
                        </div>
                    </div>
                    {conversation.lastMessage && (
                        <span className="text-xs text-gray-400">
                            {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                                addSuffix: true,
                                locale: es,
                            })}
                        </span>
                    )}
                </div>

                <div className="mt-3 flex justify-between items-center">
                    <p className="text-sm text-gray-600 truncate max-w-[80%]">
                        {conversation.lastMessage ? conversation.lastMessage.text : 'Sin mensajes'}
                    </p>
                    {conversation.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {conversation.unreadCount}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
