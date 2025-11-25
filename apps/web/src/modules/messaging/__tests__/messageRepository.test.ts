import { messageRepository } from '../repositories/messageRepository';
import { prisma } from '../../../lib/db';

// Mock prisma
jest.mock('../../../lib/db', () => ({
    prisma: {
        message: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
        booking: {
            findMany: jest.fn(),
        },
    },
}));

describe('messageRepository', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a message', async () => {
            const mockMessage = { id: '1', text: 'hello' };
            (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

            const result = await messageRepository.create('booking-1', 'user-1', 'hello');
            expect(prisma.message.create).toHaveBeenCalledWith({
                data: {
                    bookingId: 'booking-1',
                    senderId: 'user-1',
                    text: 'hello',
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            avatarUrl: true,
                        },
                    },
                },
            });
            expect(result).toEqual(mockMessage);
        });
    });

    describe('findByBookingIdDesc', () => {
        it('should return paginated messages in chronological order', async () => {
            const mockMessages = [
                { id: '2', text: 'world', createdAt: new Date('2023-01-02'), sender: { firstName: 'A', lastName: 'B', role: 'CLIENT' } },
                { id: '1', text: 'hello', createdAt: new Date('2023-01-01'), sender: { firstName: 'A', lastName: 'B', role: 'CLIENT' } },
            ];
            // findMany returns desc order (newest first)
            (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

            const result = await messageRepository.findByBookingId('booking-1', { limit: 10 });

            // Result should be descending (newest first)
            expect(result.messages[0].id).toBe('2');
            expect(result.messages[1].id).toBe('1');
            expect(result.nextCursor).toBeUndefined();
        });
    });
});
