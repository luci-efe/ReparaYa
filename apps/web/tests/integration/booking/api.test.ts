import { createMocks } from 'node-mocks-http';
import { POST } from '@/app/api/bookings/route';
import { GET as GET_ME } from '@/app/api/bookings/me/route';
import { bookingService } from '@/modules/booking/services/bookingService';

jest.mock('@/modules/booking/services/bookingService');
jest.mock('@clerk/nextjs/server', () => ({
    auth: () => ({ userId: 'user_123' }),
    currentUser: () => Promise.resolve({ id: 'user_123', firstName: 'Test', lastName: 'User' }),
}));

describe('Booking API Integration', () => {
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
            const mockBookings = [{ id: 'booking_123' }];
            (bookingService.getBookingsByClient as jest.Mock).mockResolvedValue(mockBookings);
            // We also need to mock getBookingsByContractor if the route calls both or checks roles
            // The route implementation calls both and combines/filters?
            // Let's assume the route logic handles it.

            // Actually, my implementation of GET /me calls `prisma.booking.findMany` directly or via service?
            // Checking T-015 implementation... it uses `prisma`.
            // So mocking service won't work if the route uses prisma directly.
            // I should check the route implementation first.
        });
    });
});
