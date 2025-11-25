import { BookingRepository } from '../repositories/bookingRepository';
import { canTransition } from './bookingStateMachine';
import { CreateBookingDTO, UpdateBookingStatusDTO, BookingPricingDetails } from '../types';
import { BookingNotFoundError, InvalidStateTransitionError, SlotNotAvailableError } from '../errors';
import { Booking, BookingStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

export class BookingService {
    private repository: BookingRepository;

    constructor() {
        this.repository = new BookingRepository();
    }

    async createBooking(data: CreateBookingDTO, clientId: string): Promise<Booking> {
        // 1. Validate slot availability
        // 1. Validate slot availability
        let availability = await prisma.availability.findUnique({
            where: { id: data.slotId }, // Assuming slotId is availabilityId
            include: { service: true },
        });

        // If not found, check if it's a generated slot key (YYYY-MM-DD-HH:MM)
        if (!availability) {
            const compositeKeyRegex = /^\d{4}-\d{2}-\d{2}-\d{2}:\d{2}$/;
            if (compositeKeyRegex.test(data.slotId)) {
                // It's a generated slot! Create the availability record.
                const datePart = data.slotId.slice(0, 10);
                const timePart = data.slotId.slice(11);

                // Fetch service to get duration
                const service = await prisma.service.findUnique({
                    where: { id: data.serviceId },
                });

                if (!service) {
                    throw new Error('Service not found');
                }

                // Calculate start and end times
                // Note: We need to be careful with timezones here. 
                // The input strings are date and time. We should construct the Date objects.
                // Ideally we should use the contractor's timezone, but for now we'll assume local/UTC as per the input.
                // The slotGeneratorService returns date/time strings.

                const startDateTime = new Date(`${datePart}T${timePart}:00`);
                const endDateTime = new Date(startDateTime.getTime() + service.durationMinutes * 60000);

                // Create Availability
                availability = await prisma.availability.create({
                    data: {
                        serviceId: data.serviceId,
                        date: new Date(datePart),
                        startTime: startDateTime,
                        endTime: endDateTime,
                        status: 'AVAILABLE',
                    },
                    include: { service: true }
                });

                // Update data.slotId to the new UUID so subsequent steps use the real ID
                data.slotId = availability.id;
            } else {
                throw new SlotNotAvailableError();
            }
        }

        if (availability.status !== 'AVAILABLE') {
            throw new SlotNotAvailableError();
        }

        const service = availability.service;

        // 2. Calculate pricing
        const pricing = this.calculatePricing(Number(service.basePrice));

        // 3. Create booking
        const booking = await this.repository.create({
            ...data,
            clientId,
            contractorId: service.contractorId,
            availabilityId: data.slotId,
            status: 'PENDING_APPROVAL' as BookingStatus, // Explicitly set initial status
            ...pricing,
        });

        // 4. Update availability status
        await prisma.availability.update({
            where: { id: data.slotId },
            data: {
                status: 'BOOKED',
                bookingId: booking.id,
            },
        });

        return booking;
    }

    async getBookingById(id: string, userId: string): Promise<Booking> {
        const booking = await this.repository.findById(id);
        if (!booking) {
            throw new BookingNotFoundError(id);
        }

        // Authorization check
        if (booking.clientId !== userId && booking.contractorId !== userId) {
            // TODO: Check if user is admin
            throw new Error('Unauthorized');
        }

        return booking;
    }

    async getClientBookings(clientId: string): Promise<Booking[]> {
        return this.repository.findByClientId(clientId);
    }

    async getContractorBookings(contractorId: string): Promise<Booking[]> {
        return this.repository.findByContractorId(contractorId);
    }

    async updateBookingStatus(
        id: string,
        data: UpdateBookingStatusDTO,
        userId: string
    ): Promise<Booking> {
        const booking = await this.repository.findById(id);
        if (!booking) {
            throw new BookingNotFoundError(id);
        }

        // Authorization logic:
        // - Contractor can update to any valid state
        // - Client can only cancel
        const isContractor = booking.contractorId === userId;
        const isClient = booking.clientId === userId;
        const isCancellation = data.status === BookingStatus.CANCELLED;

        if (!isContractor) {
            if (!(isClient && isCancellation)) {
                throw new Error('Unauthorized');
            }
        }

        // Validate transition
        if (!canTransition(booking.status, data.status)) {
            throw new InvalidStateTransitionError(booking.status, data.status);
        }

        return this.repository.updateStatus(id, data, userId, booking.status);
    }

    async approveBooking(id: string, contractorId: string): Promise<Booking> {
        const booking = await this.repository.findById(id);
        if (!booking) {
            throw new BookingNotFoundError(id);
        }

        if (booking.contractorId !== contractorId) {
            throw new Error('Unauthorized');
        }

        if (booking.status !== BookingStatus.PENDING_APPROVAL) {
            throw new InvalidStateTransitionError(booking.status, BookingStatus.PENDING_PAYMENT);
        }

        return this.repository.updateStatus(
            id,
            { status: BookingStatus.PENDING_PAYMENT },
            contractorId,
            booking.status
        );
    }

    private calculatePricing(basePrice: number): BookingPricingDetails {
        const commissionRate = 0.10; // 10% commission
        // Tax rate (16% VAT) can be applied when needed

        // Simplified logic:
        // Final Price = Base Price
        // Commission = Base Price * 0.10
        // Contractor Payout = Base Price - Commission
        // Anticipo = 50% of Final Price
        // Liquidacion = 50% of Final Price

        const finalPrice = basePrice;
        const comisionAmount = basePrice * commissionRate;
        const contractorPayoutAmount = basePrice - comisionAmount;
        const anticipoAmount = finalPrice * 0.5;
        const liquidacionAmount = finalPrice * 0.5;

        return {
            basePrice,
            finalPrice,
            anticipoAmount,
            liquidacionAmount,
            comisionAmount,
            contractorPayoutAmount,
        };
    }
}
