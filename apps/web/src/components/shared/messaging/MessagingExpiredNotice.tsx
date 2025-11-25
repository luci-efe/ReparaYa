import { MessagingWindowStatus } from '@/modules/messaging/types';
import Link from 'next/link';

interface MessagingExpiredNoticeProps {
    status: MessagingWindowStatus;
    message: string;
}

export function MessagingExpiredNotice({ status, message }: MessagingExpiredNoticeProps) {
    if (status === MessagingWindowStatus.OPEN) {
        return null;
    }

    return (
        <div className="bg-gray-50 p-4 text-center border-t text-sm text-gray-600">
            <p className="font-medium mb-1">{message}</p>
            {status === MessagingWindowStatus.EXPIRED && (
                <p>
                    Si necesitas ayuda adicional, por favor contacta a{' '}
                    <Link href="/support" className="text-blue-600 hover:underline">
                        soporte
                    </Link>
                    .
                </p>
            )}
        </div>
    );
}
