import { BookingStatus } from '../../../src/modules/booking/types';
import { BookingService } from '../../../src/modules/booking/services/bookingService';
import { PrismaClient } from '@prisma/client';

// Create a fresh Prisma client for tests instead of using the singleton
// This ensures we have a proper connection for CI environments
const testPrisma = new PrismaClient({
    log: ['error'],
});

const bookingService = new BookingService();

// Helper to check if database is connected and properly configured
async function isDatabaseConnected(): Promise<boolean> {
    try {
        await testPrisma.$connect();
        await testPrisma.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.warn('Database connection check failed:', error);
        return false;
    }
}

describe('Contractor Booking Flow Integration', () => {
    let contractorId: string;
    let clientId: string;
    let serviceId: string;
    let availabilityId: string;
    let bookingId: string;
    let dbConnected = false;

    beforeAll(async () => {
        // Check database connection first
        dbConnected = await isDatabaseConnected();
        if (!dbConnected) {
            console.warn('Skipping integration tests: Database not available');
            return;
        }

        // Setup test data
        // Create contractor
        const contractor = await testPrisma.user.create({
            data: {
                clerkUserId: 'test_contractor_' + Date.now(),
                email: 'contractor_' + Date.now() + '@test.com',
                firstName: 'Test',
                lastName: 'Contractor',
                role: 'CONTRACTOR',
                contractorProfile: {
                    create: {
                        businessName: 'Test Business',
                        description: 'Test Description',
                        specialties: ['Plumbing'],
                    }
                }
            }
        });
        contractorId = contractor.id;

        // Create client
        const client = await testPrisma.user.create({
            data: {
                clerkUserId: 'test_client_' + Date.now(),
                email: 'client_' + Date.now() + '@test.com',
                firstName: 'Test',
                lastName: 'Client',
                role: 'CLIENT',
            }
        });
        clientId = client.id;

        // Create service
        const category = await testPrisma.category.findFirst() || await testPrisma.category.create({
            data: { name: 'Test Cat', description: 'Test', slug: 'test-cat-' + Date.now() }
        });

        const service = await testPrisma.service.create({
            data: {
                contractorId,
                categoryId: category.id,
                title: 'Test Service',
                description: 'Test Description',
                basePrice: 100,
                durationMinutes: 60,
                status: 'ACTIVE',
            }
        });
        serviceId = service.id;

        // Create availability
        const availability = await testPrisma.availability.create({
            data: {
                serviceId,
                date: new Date(),
                startTime: new Date(),
                endTime: new Date(Date.now() + 3600000),
                status: 'AVAILABLE',
            }
        });
        availabilityId = availability.id;
    });

    afterAll(async () => {
        // Only cleanup if database was connected and resources were created
        if (!dbConnected) {
            return;
        }
        
        try {
            // Cleanup in order of dependencies
            if (bookingId) {
                await testPrisma.booking.deleteMany({ where: { id: bookingId } });
            }
            if (availabilityId) {
                await testPrisma.availability.deleteMany({ where: { id: availabilityId } });
            }
            if (serviceId) {
                await testPrisma.service.deleteMany({ where: { id: serviceId } });
            }
            if (contractorId || clientId) {
                await testPrisma.user.deleteMany({ where: { id: { in: [contractorId, clientId].filter(Boolean) } } });
            }
        } catch (error) {
            console.error('Error during test cleanup:', error);
        } finally {
            // Disconnect prisma client to prevent resource leaks
            await testPrisma.$disconnect();
        }
    });

    it('should create a booking in PENDING_APPROVAL status', async () => {
        if (!dbConnected) {
            console.warn('Test skipped: Database not available');
            return;
        }
        
        const booking = await bookingService.createBooking({
            serviceId,
            slotId: availabilityId,
            scheduledDate: new Date(),
            address: 'Test Address',
            notes: 'Test Notes',
        }, clientId);

        expect(booking).toBeDefined();
        expect(booking.status).toBe(BookingStatus.PENDING_APPROVAL);
        bookingId = booking.id;
    });

    it('should allow contractor to approve booking', async () => {
        if (!dbConnected) {
            console.warn('Test skipped: Database not available');
            return;
        }
        
        const updatedBooking = await bookingService.approveBooking(bookingId, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.PENDING_PAYMENT);
    });

    it('should allow contractor to advance state to CONFIRMED (simulating payment)', async () => {
        if (!dbConnected) {
            console.warn('Test skipped: Database not available');
            return;
        }
        
        // Manually advance for test purposes since payment flow is separate
        const updatedBooking = await bookingService.advanceState(bookingId, BookingStatus.CONFIRMED, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should allow contractor to mark as ON_ROUTE', async () => {
        if (!dbConnected) {
            console.warn('Test skipped: Database not available');
            return;
        }
        
        const updatedBooking = await bookingService.advanceState(bookingId, BookingStatus.ON_ROUTE, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.ON_ROUTE);
    });

    it('should allow contractor to mark as ON_SITE', async () => {
        if (!dbConnected) {
            console.warn('Test skipped: Database not available');
            return;
        }
        
        const updatedBooking = await bookingService.advanceState(bookingId, BookingStatus.ON_SITE, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.ON_SITE);
    });

    it('should allow contractor to mark as IN_PROGRESS', async () => {
        if (!dbConnected) {
            console.warn('Test skipped: Database not available');
            return;
        }
        
        const updatedBooking = await bookingService.advanceState(bookingId, BookingStatus.IN_PROGRESS, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.IN_PROGRESS);
    });

    it('should allow contractor to complete booking', async () => {
        if (!dbConnected) {
            console.warn('Test skipped: Database not available');
            return;
        }
        
        const updatedBooking = await bookingService.completeBooking(bookingId, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.COMPLETED);
    });

    it('should record state history correctly', async () => {
        if (!dbConnected) {
            console.warn('Test skipped: Database not available');
            return;
        }
        
        const booking = await testPrisma.booking.findUnique({
            where: { id: bookingId },
            include: { stateHistory: true }
        });

        expect(booking?.stateHistory.length).toBeGreaterThan(0);
        // Verify sequence
        const history = booking?.stateHistory.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        expect(history?.[0].fromState).toBe(BookingStatus.PENDING_APPROVAL);
        // ... verify other transitions
    });
});
