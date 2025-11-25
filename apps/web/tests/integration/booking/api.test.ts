// NOTE: These imports use relative paths because Jest's moduleNameMapper
// doesn't support the app directory path aliases used by Next.js
// See: https://github.com/vercel/next.js/issues/35634
import { POST } from '../../../app/api/bookings/route';
import { GET as GET_ME } from '../../../app/api/bookings/me/route';
import { bookingService } from '@/modules/booking/services/bookingService';

jest.mock('@/modules/booking/services/bookingService');
jest.mock('@/lib/db', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
        booking: {
            findMany: jest.fn(),
        },
    },
}));
jest.mock('@clerk/nextjs/server', () => ({
    auth: () => ({ userId: 'user_123' }),
    currentUser: () => Promise.resolve({ id: 'user_123', firstName: 'Test', lastName: 'User' }),
}));

// TODO: Re-enable when contractor service visibility feature is complete
// These tests depend on the booking demo which requires contractor service visibility
describe.skip('Booking API Integration', () => {
    beforeEach(() => {
        const { prisma } = require('@/lib/db');
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'local_user_123',
            clerkUserId: 'user_123',
        });
    });

    describe('POST /api/bookings', () => {
        it('should create a booking successfully', async () => {
            const mockBooking = { id: 'booking_123', status: 'PENDING_PAYMENT' };
            (bookingService.createBooking as jest.Mock).mockResolvedValue(mockBooking);

            const request = new Request('http://localhost:3000/api/bookings', {
                method: 'POST',
                body: JSON.stringify({
                    serviceId: 'service_123',
                    slotId: 'slot_123',
                    scheduledDate: new Date().toISOString(),
                    address: '123 Test St',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data).toEqual(mockBooking);
            expect(bookingService.createBooking).toHaveBeenCalled();
        });

        it('should return 400 for invalid input', async () => {
            const request = new Request('http://localhost:3000/api/bookings', {
                method: 'POST',
                body: JSON.stringify({
                    // Missing required fields
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });

    describe('GET /api/bookings/me', () => {
        it('should return user bookings', async () => {
            const { prisma } = require('@/lib/db');
            const mockBookings = [
                { id: 'booking_123', clientId: 'local_user_123', status: 'PENDING_APPROVAL' },
            ];
            (prisma.booking.findMany as jest.Mock).mockResolvedValue(mockBookings);

            const request = new Request('http://localhost:3000/api/bookings/me', {
                method: 'GET',
            });

            const response = await GET_ME(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(Array.isArray(data)).toBe(true);
        });
    });
});
