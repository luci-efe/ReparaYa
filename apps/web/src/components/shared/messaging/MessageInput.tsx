import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

interface MessageInputProps {
    onSend: (text: string) => Promise<void>;
    disabled?: boolean;
    placeholder?: string;
}

export function MessageInput({
    onSend,
    disabled = false,
    placeholder = 'Escribe un mensaje...',
}: MessageInputProps) {
    const [text, setText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [text]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!text.trim() || isSending || disabled) return;

        const messageToSend = text.trim();
        setIsSending(true);
        setText(''); // Optimistic clear

        try {
            await onSend(messageToSend);
            // Keep cleared
        } catch (error) {
            console.error('Failed to send message:', error);
            setText(messageToSend); // Restore on error
            alert('Error al enviar el mensaje. Por favor intenta de nuevo.');
        } finally {
            setIsSending(false);
            if (textareaRef.current) {
                textareaRef.current.focus();
                adjustHeight();
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="border-t border-gray-200 bg-white p-4">
            <form
                onSubmit={handleSubmit}
                className="flex items-end gap-2 max-w-4xl mx-auto"
            >
                <div className="flex-1 relative">
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled || isSending}
                        placeholder={placeholder}
                        rows={1}
                        className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        style={{ minHeight: '44px' }}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 pointer-events-none">
                        {text.length}/2000
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={!text.trim() || isSending || disabled}
                    className="rounded-full bg-blue-600 p-3 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    <PaperAirplaneIcon className="h-5 w-5" />
                    <span className="sr-only">Enviar</span>
                </button>
            </form>
        </div>
    );
}
