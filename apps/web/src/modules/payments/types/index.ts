import { Payment, PaymentStatus, PaymentType } from '@prisma/client';

export type { PaymentStatus, PaymentType };

export interface PaymentDTO {
    id: string;
    bookingId: string;
    type: PaymentType;
    amount: number;
    currency: string;
    status: PaymentStatus;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreatePaymentDTO {
    bookingId: string;
    type: PaymentType;
    amount: number;
    currency?: string;
    metadata?: any;
}
