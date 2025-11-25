import { prisma } from '../../../src/lib/db';
import { BookingStatus } from '../../../src/modules/booking/types';
import { BookingService } from '../../../src/modules/booking/services/bookingService';

const bookingService = new BookingService();

describe('Contractor Booking Flow Integration', () => {
    let contractorId: string;
    let clientId: string;
    let serviceId: string;
    let availabilityId: string;
    let bookingId: string;

    beforeAll(async () => {
        // Setup test data
        // Create contractor
        const contractor = await prisma.user.create({
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
        const client = await prisma.user.create({
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
        const category = await prisma.category.findFirst() || await prisma.category.create({
            data: { name: 'Test Cat', description: 'Test', slug: 'test-cat-' + Date.now() }
        });

        const service = await prisma.service.create({
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
        const availability = await prisma.availability.create({
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
        // Cleanup
        await prisma.booking.deleteMany({ where: { id: bookingId } });
        await prisma.availability.deleteMany({ where: { id: availabilityId } });
        await prisma.service.deleteMany({ where: { id: serviceId } });
        await prisma.user.deleteMany({ where: { id: { in: [contractorId, clientId] } } });
    });

    it('should create a booking in PENDING_APPROVAL status', async () => {
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
        const updatedBooking = await bookingService.approveBooking(bookingId, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.PENDING_PAYMENT);
    });

    it('should allow contractor to advance state to CONFIRMED (simulating payment)', async () => {
        // Manually advance for test purposes since payment flow is separate
        const updatedBooking = await bookingService.advanceState(bookingId, BookingStatus.CONFIRMED, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.CONFIRMED);
    });

    it('should allow contractor to mark as ON_ROUTE', async () => {
        const updatedBooking = await bookingService.advanceState(bookingId, BookingStatus.ON_ROUTE, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.ON_ROUTE);
    });

    it('should allow contractor to mark as ON_SITE', async () => {
        const updatedBooking = await bookingService.advanceState(bookingId, BookingStatus.ON_SITE, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.ON_SITE);
    });

    it('should allow contractor to mark as IN_PROGRESS', async () => {
        const updatedBooking = await bookingService.advanceState(bookingId, BookingStatus.IN_PROGRESS, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.IN_PROGRESS);
    });

    it('should allow contractor to complete booking', async () => {
        const updatedBooking = await bookingService.completeBooking(bookingId, contractorId);
        expect(updatedBooking.status).toBe(BookingStatus.COMPLETED);
    });

    it('should record state history correctly', async () => {
        const booking = await prisma.booking.findUnique({
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
