import { prisma } from '@/lib/db';
import { Booking, BookingStatus } from '@prisma/client';
import { CreateBookingDTO, UpdateBookingStatusDTO } from '../types';

export class BookingRepository {
    async create(data: CreateBookingDTO & {
        clientId: string;
        contractorId: string;
        availabilityId: string;
        basePrice: number;
        finalPrice: number;
        anticipoAmount: number;
        liquidacionAmount: number;
        comisionAmount: number;
        contractorPayoutAmount: number;
        status?: BookingStatus;
    }): Promise<Booking> {
        const initialStatus = data.status || BookingStatus.PENDING_APPROVAL;
        return prisma.booking.create({
            data: {
                serviceId: data.serviceId,
                clientId: data.clientId,
                contractorId: data.contractorId,
                availabilityId: data.availabilityId,
                scheduledDate: data.scheduledDate,
                address: data.address,
                notes: data.notes,
                basePrice: data.basePrice,
                finalPrice: data.finalPrice,
                anticipoAmount: data.anticipoAmount,
                liquidacionAmount: data.liquidacionAmount,
                comisionAmount: data.comisionAmount,
                contractorPayoutAmount: data.contractorPayoutAmount,
                status: initialStatus,
                stateHistory: {
                    create: {
                        fromState: initialStatus,
                        toState: initialStatus,
                        changedBy: data.clientId,
                        notes: 'Reserva creada',
                    },
                },
            },
            include: {
                service: true,
                client: true,
                contractor: true,
                availability: true,
            },
        });
    }

    async findById(id: string): Promise<Booking | null> {
        return prisma.booking.findUnique({
            where: { id },
            include: {
                service: true,
                client: true,
                contractor: true,
                availability: true,
                stateHistory: {
                    orderBy: { createdAt: 'desc' },
                },
                payments: true,
            },
        });
    }

    async findByClientId(clientId: string): Promise<Booking[]> {
        return prisma.booking.findMany({
            where: { clientId },
            include: {
                service: true,
                contractor: true,
            },
            orderBy: { scheduledDate: 'desc' },
        });
    }

    async findByContractorId(contractorId: string): Promise<Booking[]> {
        return prisma.booking.findMany({
            where: { contractorId },
            include: {
                service: true,
                client: true,
            },
            orderBy: { scheduledDate: 'asc' },
        });
    }

    async updateStatus(
        id: string,
        data: UpdateBookingStatusDTO,
        changedBy: string,
        currentStatus: BookingStatus
    ): Promise<Booking> {
        return prisma.$transaction(async (tx) => {
            const booking = await tx.booking.update({
                where: { id },
                data: {
                    status: data.status,
                    stateHistory: {
                        create: {
                            fromState: currentStatus,
                            toState: data.status,
                            changedBy: changedBy,
                            notes: data.notes,
                        },
                    },
                },
                include: {
                    service: true,
                    client: true,
                    contractor: true,
                },
            });

            return booking;
        });
    }
    async getConfirmedBookings(
        contractorId: string,
        start: Date,
        end: Date
    ): Promise<Array<{ startDateTime: Date; endDateTime: Date }>> {
        const bookings = await prisma.booking.findMany({
            where: {
                contractorId,
                scheduledDate: {
                    gte: start,
                    lte: end,
                },
                status: {
                    notIn: [BookingStatus.CANCELLED, BookingStatus.DISPUTED],
                },
            },
            include: {
                service: {
                    select: {
                        durationMinutes: true,
                    },
                },
            },
        });

        return bookings.map((booking) => {
            const startDateTime = new Date(booking.scheduledDate);
            const endDateTime = new Date(startDateTime.getTime() + booking.service.durationMinutes * 60000);
            return { startDateTime, endDateTime };
        });
    }
}
