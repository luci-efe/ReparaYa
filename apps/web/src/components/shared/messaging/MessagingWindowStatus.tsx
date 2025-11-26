import { MessagingWindowStatus } from '@/modules/messaging/types';

interface MessagingWindowStatusProps {
    status: MessagingWindowStatus;
    message: string;
    expiresAt: Date | null;
}

export function MessagingWindowStatusBadge({ status, message }: MessagingWindowStatusProps) {
    let colorClass = 'bg-gray-100 text-gray-800';

    switch (status) {
        case MessagingWindowStatus.OPEN:
            colorClass = 'bg-green-100 text-green-800';
            break;

        case MessagingWindowStatus.EXPIRED:
            colorClass = 'bg-red-100 text-red-800';
            break;
        case MessagingWindowStatus.NOT_STARTED:
            colorClass = 'bg-gray-100 text-gray-800';
            break;
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
            {message}
        </span>
    );
}
