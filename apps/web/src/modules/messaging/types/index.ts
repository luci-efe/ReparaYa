export enum MessagingWindowStatus {
    NOT_STARTED = 'NOT_STARTED',
    OPEN = 'OPEN',
    EXPIRED = 'EXPIRED',
}

export interface MessageDTO {
    id: string;
    bookingId: string;
    senderId: string;
    text: string;
    createdAt: Date;
    sender: {
        id: string;
        firstName: string;
        lastName: string;
        avatarUrl: string | null;
    };
}

export interface CreateMessageDTO {
    bookingId: string;
    senderId: string;
    text: string;
}

export interface MessageListDTO {
    messages: MessageDTO[];
    nextCursor?: string;
}

export interface MessagesResponseDTO extends MessageListDTO {
    messagingWindow: {
        status: MessagingWindowStatus;
        remainingTime?: number;
    };
}

export interface ConversationPreviewDTO {
    bookingId: string;
    serviceTitle: string;
    otherPartyName: string;
    otherPartyAvatarUrl: string | null;
    lastMessage: {
        text: string;
        createdAt: Date;
        isRead: boolean; // Derived from unread count logic
    } | null;
    unreadCount: number;
    updatedAt: Date;
}
