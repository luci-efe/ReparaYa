import { createMocks } from 'node-mocks-http';
import { GET } from '../../../app/api/users/me/messages/route';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { messageService } from '@/modules/messaging';

// Mock auth
jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn(),
}));

// Mock prisma
jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
    },
}));

// Mock messageService
jest.mock('@/modules/messaging', () => ({
    messageService: {
        getConversations: jest.fn(),
    },
}));

describe('GET /api/users/me/messages', () => {
    const mockUserId = 'user-1';

    beforeEach(() => {
        jest.clearAllMocks();
        (auth as jest.Mock).mockReturnValue({ userId: 'clerk-user-1' });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: mockUserId, clerkUserId: 'clerk-user-1', role: 'CLIENT' });
    });

    it('should return conversations successfully', async () => {
        const mockConversations = [
            {
                id: 'conv-1',
                bookingId: 'booking-1',
                lastMessage: { text: 'Hello' },
                unreadCount: 1,
            },
        ];

        (messageService.getConversations as jest.Mock).mockResolvedValue(mockConversations);

        const { req } = createMocks({
            method: 'GET',
        });

        const res = await GET(req);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe('conv-1');
    });

    it('should return 401 if not authenticated', async () => {
        (auth as jest.Mock).mockReturnValue({ userId: null });

        const { req } = createMocks({
            method: 'GET',
        });

        const res = await GET(req);

        expect(res.status).toBe(401);
    });
});
