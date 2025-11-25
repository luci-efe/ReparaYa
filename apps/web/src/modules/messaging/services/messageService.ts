import { prisma } from '@/lib/db';
import { messageRepository } from '../repositories/messageRepository';
import { sanitizationService } from './sanitizationService';
import { timeWindowService } from './timeWindowService';
import { createMessageSchema, getMessagesSchema } from '../validators/messageSchemas';
import {
    MessageDTO,
    MessageListDTO,
    MessagesResponseDTO,
    CreateMessageDTO,
    ConversationPreviewDTO,
} from '../types';
import {
    UnauthorizedMessageAccessError,
    MessageNotFoundError,
    RateLimitExceededError,
} from '../errors';

export class MessageService {
    async sendMessage(userId: string, data: CreateMessageDTO): Promise<MessageDTO> {
        // 1. Validate input
        const validatedData = createMessageSchema.parse(data);

        // 2. Check rate limit (Simple implementation: 10 msgs/min)
        // In a real app, use Redis or a proper rate limiter.
        // Here we can check the last 10 messages from this user in this booking.
        // For MVP/Prototype, we might skip strict rate limiting or do a simple DB check.
        // Let's do a simple DB check.
        const recentMessages = await prisma.message.count({
            where: {
                senderId: userId,
                createdAt: {
                    gte: new Date(Date.now() - 60 * 1000), // Last minute
                },
            },
        });

        if (recentMessages >= 10) {
            throw new RateLimitExceededError();
        }

        // 3. Get Booking and verify access
        const booking = await prisma.booking.findUnique({
            where: { id: validatedData.bookingId },
        });

        if (!booking) {
            throw new MessageNotFoundError('Reserva no encontrada');
        }

        if (booking.clientId !== userId && booking.contractorId !== userId) {
            throw new UnauthorizedMessageAccessError();
        }

        // 4. Check time window
        const windowStatus = timeWindowService.getWindowStatus(booking);
        timeWindowService.ensureMessagingAvailable(booking);

        // 5. Sanitize content
        const sanitizedText = sanitizationService.sanitizeText(validatedData.text);
        if (!sanitizationService.validateLinks(sanitizedText)) {
            throw new Error('El mensaje contiene enlaces no permitidos. Solo se permiten enlaces https://');
        }

        // 6. Create message
        const message = await messageRepository.create(
            validatedData.bookingId,
            userId,
            sanitizedText
        );

        // 7. Send notification (Async - fire and forget)
        // notificationService.notifyNewMessage(message);

        return message;
    }

    async getMessages(
        userId: string,
        bookingId: string,
        options: { cursor?: string; limit?: number }
    ): Promise<MessagesResponseDTO> {
        // 1. Validate input
        const validatedOptions = getMessagesSchema.parse({ bookingId, ...options });

        // 2. Verify access
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new MessageNotFoundError('Reserva no encontrada');
        }

        if (booking.clientId !== userId && booking.contractorId !== userId) {
            throw new UnauthorizedMessageAccessError();
        }

        // 3. Fetch messages
        const messageList = await messageRepository.findByBookingId(bookingId, {
            cursor: validatedOptions.cursor,
            limit: validatedOptions.limit,
        });

        // 4. Get window status
        const windowStatus = timeWindowService.getWindowStatus(booking);
        const remainingTime = timeWindowService.getTimeRemaining(booking);

        return {
            ...messageList,
            messagingWindow: {
                status: windowStatus,
                remainingTime,
            },
        };
    }

    async getConversations(userId: string): Promise<ConversationPreviewDTO[]> {
        return messageRepository.getConversationsForUser(userId);
    }

    async getUnreadCount(userId: string): Promise<number> {
        return messageRepository.countUnread(userId);
    }
}

export const messageService = new MessageService();
