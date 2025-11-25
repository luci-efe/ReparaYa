import { MessageService } from '../services/messageService';
import { z } from 'zod';
import { messageRepository } from '../repositories/messageRepository';
import { sanitizationService } from '../services/sanitizationService';
import { timeWindowService } from '../services/timeWindowService';
import { prisma } from '@/lib/db';
import {
    UnauthorizedMessageAccessError,
    MessagingWindowExpiredError,
    RateLimitExceededError,
    MessageTooLongError
} from '../errors';

// Mock dependencies
// Mock dependencies
jest.mock('../repositories/messageRepository', () => ({
    messageRepository: {
        create: jest.fn(),
        findByBookingId: jest.fn(),
        countUnread: jest.fn(),
        getConversationsForUser: jest.fn(),
    },
}));

jest.mock('../services/sanitizationService', () => ({
    sanitizationService: {
        sanitizeText: jest.fn(),
        validateLinks: jest.fn(),
        truncateText: jest.fn(),
    },
}));

jest.mock('../services/timeWindowService', () => ({
    __esModule: true,
    timeWindowService: {
        ensureMessagingAvailable: jest.fn(),
        isMessagingAvailable: jest.fn(),
        getWindowStatus: jest.fn(),
    },
}));

jest.mock('@/lib/db', () => ({
    prisma: {
        booking: {
            findUnique: jest.fn(),
        },
        message: {
            count: jest.fn().mockResolvedValue(0),
        },
    },
}));

describe('MessageService', () => {
    let service: MessageService;

    beforeEach(() => {
        service = new MessageService();
        jest.clearAllMocks();
        console.log('timeWindowService mock:', timeWindowService);
    });

    describe('sendMessage', () => {
        const mockBooking = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            clientId: '123e4567-e89b-12d3-a456-426614174001',
            contractorId: '123e4567-e89b-12d3-a456-426614174002',
            status: 'CONFIRMED',
        };

        const mockDto = {
            bookingId: '123e4567-e89b-12d3-a456-426614174000',
            senderId: '123e4567-e89b-12d3-a456-426614174001',
            text: 'Hello',
        };

        it('should send message successfully', async () => {
            (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
            (timeWindowService.ensureMessagingAvailable as jest.Mock).mockReturnValue(true);
            (sanitizationService.sanitizeText as jest.Mock).mockReturnValue('Hello');
            (sanitizationService.validateLinks as jest.Mock).mockReturnValue(true);
            (messageRepository.create as jest.Mock).mockResolvedValue({ id: 'msg-1', ...mockDto });

            const result = await service.sendMessage('123e4567-e89b-12d3-a456-426614174001', mockDto);

            expect(result).toBeDefined();
            expect(messageRepository.create).toHaveBeenCalledWith(
                '123e4567-e89b-12d3-a456-426614174000',
                '123e4567-e89b-12d3-a456-426614174001',
                'Hello'
            );
        });

        it('should throw UnauthorizedMessageAccessError if user is not part of booking', async () => {
            (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);

            await expect(service.sendMessage('other-user', mockDto))
                .rejects.toThrow(UnauthorizedMessageAccessError);
        });

        it('should throw MessagingWindowExpiredError if window is closed', async () => {
            (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
            (timeWindowService.ensureMessagingAvailable as jest.Mock).mockImplementation(() => {
                throw new MessagingWindowExpiredError('Expired');
            });

            await expect(service.sendMessage('123e4567-e89b-12d3-a456-426614174001', mockDto))
                .rejects.toThrow(MessagingWindowExpiredError);
        });

        it('should throw MessageTooLongError if text is too long', async () => {
            (prisma.booking.findUnique as jest.Mock).mockResolvedValue(mockBooking);
            (timeWindowService.ensureMessagingAvailable as jest.Mock).mockReturnValue(true);
            (sanitizationService.truncateText as jest.Mock).mockReturnValue('Truncated...');
            // Actually messageService checks length before truncate? 
            // Let's check implementation. 
            // It calls sanitize, then validateLinks, then checks length > 1000.

            const longText = 'a'.repeat(2001);
            (sanitizationService.sanitizeText as jest.Mock).mockReturnValue(longText);

            await expect(service.sendMessage('123e4567-e89b-12d3-a456-426614174001', { ...mockDto, text: longText }))
                .rejects.toThrow(/El mensaje no puede exceder/);
        });
    });
});
