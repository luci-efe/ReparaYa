import { prisma } from '@/lib/db';
import { Payment, PaymentStatus, PaymentType } from '@prisma/client';
import { CreatePaymentDTO } from '../types';

export class PaymentRepository {
    async create(data: CreatePaymentDTO): Promise<Payment> {
        return prisma.payment.create({
            data: {
                bookingId: data.bookingId,
                type: data.type,
                amount: data.amount,
                currency: data.currency || 'MXN',
                status: PaymentStatus.PENDING,
                metadata: data.metadata,
            },
        });
    }

    async findByBookingId(bookingId: string): Promise<Payment[]> {
        return prisma.payment.findMany({
            where: { bookingId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateStatus(id: string, status: PaymentStatus, metadata?: any): Promise<Payment> {
        return prisma.payment.update({
            where: { id },
            data: {
                status,
                metadata: metadata ? metadata : undefined,
            },
        });
    }
}
