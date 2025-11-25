import { PaymentStatus, PaymentType, Prisma } from '@prisma/client';

export type { PaymentStatus, PaymentType };

export interface PaymentDTO {
    id: string;
    bookingId: string;
    type: PaymentType;
    amount: number;
    currency: string;
    status: PaymentStatus;
    metadata?: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatePaymentDTO {
    bookingId: string;
    type: PaymentType;
    amount: number;
    currency?: string;
    metadata?: Prisma.InputJsonValue;
}
