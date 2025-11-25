import { TimeWindowService } from '../services/timeWindowService';
import { Booking, BookingStatus, Prisma } from '@prisma/client';
import { MessagingWindowExpiredError } from '../errors';
import { MessagingWindowStatus } from '../types';

describe('TimeWindowService', () => {
    const service = new TimeWindowService();

    const mockBooking = (status: BookingStatus, updatedAt: Date): Booking => ({
        id: '1',
        status,
        updatedAt,
        createdAt: new Date(),
        clientId: 'client1',
        contractorId: 'contractor1',
        serviceId: 'service1',
        scheduledDate: new Date(),
        address: '123 St',
        latitude: 0,
        longitude: 0,
        description: 'Test',
        photos: [],
        basePrice: 100 as any,
        finalPrice: 100 as any,
        comisionAmount: 10 as any,
        contractorPayoutAmount: 90 as any,
        notes: null,
        stateHistory: [],
    } as unknown as Booking); // Cast to unknown to avoid Decimal import issues in test if not needed

    // Mock Prisma.Decimal for the test if needed, or just use simple object
    // Since we cast to Booking, we might need to be careful if service uses Decimal methods.
    // TimeWindowService only checks status and dates, so Decimal is not used.

    describe('isMessagingAvailable', () => {
        it('should allow messaging for active statuses', () => {
            const activeStatuses: BookingStatus[] = ['CONFIRMED', 'ON_ROUTE', 'ON_SITE', 'IN_PROGRESS'];

            activeStatuses.forEach(status => {
                const booking = mockBooking(status, new Date());
                expect(service.isMessagingAvailable(booking)).toBe(true);
            });
        });

        it('should allow messaging for COMPLETED/CANCELLED within window', () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const booking = mockBooking('COMPLETED', oneHourAgo);

            expect(service.isMessagingAvailable(booking)).toBe(true);
        });

        it('should deny messaging for COMPLETED/CANCELLED after window', () => {
            const now = new Date();
            const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
            const booking = mockBooking('COMPLETED', threeHoursAgo);

            expect(service.isMessagingAvailable(booking)).toBe(false);
        });
    });

    describe('ensureMessagingAvailable', () => {
        it('should throw error if window is expired', () => {
            const now = new Date();
            const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
            const booking = mockBooking('COMPLETED', threeHoursAgo);

            expect(() => service.ensureMessagingAvailable(booking)).toThrow(MessagingWindowExpiredError);
        });

        it('should not throw if window is open', () => {
            const booking = mockBooking('CONFIRMED', new Date());
            expect(() => service.ensureMessagingAvailable(booking)).not.toThrow();
        });
    });

    describe('getWindowStatus', () => {
        it('should return OPEN for active booking', () => {
            const booking = mockBooking('CONFIRMED', new Date());
            expect(service.getWindowStatus(booking)).toBe(MessagingWindowStatus.OPEN);
        });

        it('should return EXPIRED for old completed booking', () => {
            const now = new Date();
            const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
            const booking = mockBooking('COMPLETED', threeHoursAgo);
            expect(service.getWindowStatus(booking)).toBe(MessagingWindowStatus.EXPIRED);
        });
    });
});
