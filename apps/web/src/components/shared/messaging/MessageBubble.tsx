import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MessageBubbleProps {
    text: string;
    createdAt: Date | string;
    isSentByMe: boolean;
    senderName: string;
    isSending?: boolean;
}

export function MessageBubble({
    text,
    createdAt,
    isSentByMe,
    senderName,
    isSending = false,
}: MessageBubbleProps) {
    return (
        <div
            className={`flex w-full mb-2 ${isSentByMe ? 'justify-end' : 'justify-start'
                }`}
        >
            <div
                className={`max-w-[75%] relative px-4 py-2 shadow-sm ${isSentByMe
                    ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm'
                    } ${isSending ? 'opacity-70' : ''}`}
            >
                {!isSentByMe && (
                    <p className="text-[11px] font-bold mb-1 text-gray-500">{senderName}</p>
                )}
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{text}</p>
                <div
                    className={`text-[10px] mt-1 flex items-center gap-1 ${isSentByMe ? 'text-blue-100 justify-end' : 'text-gray-400 justify-end'
                        }`}
                >
                    {format(new Date(createdAt), 'HH:mm', { locale: es })}
                    {isSending && (
                        <span className="animate-spin h-2 w-2 border-2 border-current border-t-transparent rounded-full" />
                    )}
                </div>
            </div>
        </div>
    );
}
