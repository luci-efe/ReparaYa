import { useQuery } from '@tanstack/react-query';
import { ConversationPreviewDTO } from '@/modules/messaging/types';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ConversationListProps {
    role: 'client' | 'contractor';
}

export function ConversationList({ role }: ConversationListProps) {
    const { data: conversations, isLoading } = useQuery<ConversationPreviewDTO[]>({
        queryKey: ['conversations'],
        queryFn: async () => {
            const res = await fetch('/api/users/me/messages');
            if (!res.ok) throw new Error('Failed to fetch conversations');
            return res.json();
        },
    });

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                ))}
            </div>
        );
    }

    if (!conversations || conversations.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-500">No tienes conversaciones activas.</p>
            </div>
        );
    }

    const basePath = role === 'client' ? '/clients/bookings' : '/contractors/bookings';

    return (
        <div className="space-y-4">
            {conversations.map((conv) => (
                <Link
                    key={conv.bookingId}
                    href={`${basePath}/${conv.bookingId}?tab=chat`}
                    className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                {conv.otherPartyAvatarUrl ? (
                                    <img src={conv.otherPartyAvatarUrl} alt={conv.otherPartyName} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-gray-500 text-sm font-medium">
                                        {conv.otherPartyName.charAt(0)}
                                    </span>
                                )}
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900">{conv.otherPartyName}</h3>
                                <p className="text-xs text-blue-600 font-medium mt-0.5">
                                    <span className="text-gray-500 font-normal">Servicio: </span>
                                    {conv.serviceTitle}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true, locale: es })}
                            </span>
                        </div>
                    </div>

                    <div className="mt-3 pl-13">
                        <p className="text-sm text-gray-600 line-clamp-1">
                            {conv.lastMessage?.text || 'Sin mensajes'}
                        </p>
                    </div>
                </Link>
            ))}
        </div>
    );
}
