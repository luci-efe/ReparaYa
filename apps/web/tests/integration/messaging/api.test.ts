import { NextRequest } from 'next/server';
import { POST, GET } from '../../../app/api/bookings/[id]/messages/route';
import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

jest.mock('isomorphic-dompurify', () => ({
    sanitize: (text: string) => text,
}));

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
        booking: {
            findUnique: jest.fn(),
        },
        message: {
            create: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
    },
}));

describe('Messaging API Integration', () => {
    const mockUserId = '123e4567-e89b-12d3-a456-426614174001';
    const mockBookingId = '123e4567-e89b-12d3-a456-426614174000';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => { });
        (auth as jest.Mock).mockReturnValue({ userId: 'clerk-user-1' });
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: mockUserId, clerkUserId: 'clerk-user-1' });
    });

    describe('POST /api/bookings/[id]/messages', () => {
        it('should create a message successfully', async () => {
            (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
                id: mockBookingId,
                clientId: mockUserId,
                contractorId: 'other-user',
                status: 'CONFIRMED',
                updatedAt: new Date(),
            });

            // Mock message creation
            (prisma.message.create as jest.Mock).mockResolvedValue({
                id: 'msg-1',
                bookingId: mockBookingId,
                senderId: mockUserId,
                text: 'Hello',
                createdAt: new Date(),
                sender: { firstName: 'Test', lastName: 'User', role: 'CLIENT' },
            });

            // Mock count for rate limit
            (prisma.message.count as jest.Mock).mockResolvedValue(0);

            const req = new NextRequest(`http://localhost/api/bookings/${mockBookingId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ text: 'Hello' }),
            });

            const res = await POST(req, { params: { id: mockBookingId } });

            expect(res.status).toBe(201);
            const data = await res.json();
            expect(data.text).toBe('Hello');
        });

        it('should return 403 if user is not a participant', async () => {
            (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
                id: mockBookingId,
                clientId: 'other-client',
                contractorId: 'other-contractor',
                status: 'CONFIRMED',
                updatedAt: new Date(),
            });

            const req = new NextRequest(`http://localhost/api/bookings/${mockBookingId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ text: 'Hello' }),
            });

            const res = await POST(req, { params: { id: mockBookingId } });

            expect(res.status).toBe(403);
        });

        it('should return 429 if rate limit exceeded', async () => {
            (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
                id: mockBookingId,
                clientId: mockUserId,
                contractorId: 'other-user',
                status: 'CONFIRMED',
                updatedAt: new Date(),
            });

            (prisma.message.count as jest.Mock).mockResolvedValue(10);

            const req = new NextRequest(`http://localhost/api/bookings/${mockBookingId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ text: 'Hello' }),
            });

            const res = await POST(req, { params: { id: mockBookingId } });

            expect(res.status).toBe(429);
        });

        it('should return 403 if messaging window is expired', async () => {
            (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
                id: mockBookingId,
                clientId: mockUserId,
                contractorId: 'other-user',
                status: 'COMPLETED',
                updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
            });

            (prisma.message.count as jest.Mock).mockResolvedValue(0);

            const req = new NextRequest(`http://localhost/api/bookings/${mockBookingId}/messages`, {
                method: 'POST',
                body: JSON.stringify({ text: 'Hello' }),
            });

            const res = await POST(req, { params: { id: mockBookingId } });

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/bookings/[id]/messages', () => {
        it('should return messages list', async () => {
            (prisma.booking.findUnique as jest.Mock).mockResolvedValue({
                id: mockBookingId,
                clientId: mockUserId,
                contractorId: 'other-user',
                status: 'CONFIRMED',
                updatedAt: new Date(),
            });

            (prisma.message.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 'msg-1',
                    bookingId: mockBookingId,
                    senderId: mockUserId,
                    text: 'Hello',
                    createdAt: new Date(),
                    sender: { firstName: 'Test', lastName: 'User', role: 'CLIENT' },
                },
            ]);

            const req = new NextRequest(`http://localhost/api/bookings/${mockBookingId}/messages`, {
                method: 'GET',
            });

            const res = await GET(req, { params: { id: mockBookingId } });

            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.messages).toHaveLength(1);
            expect(data.messagingWindow.status).toBe('OPEN');
        });
    });
});
