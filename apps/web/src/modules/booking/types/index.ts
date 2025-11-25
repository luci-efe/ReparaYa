import { Booking, BookingStatus, PaymentStatus, PaymentType, BookingStateHistory, Service, User, Availability, Payment } from '@prisma/client';

export { BookingStatus, PaymentStatus, PaymentType };

export interface BookingDTO {
    id: string;
    serviceId: string;
    clientId: string;
    contractorId: string;
    availabilityId: string;
    status: BookingStatus;
    scheduledDate: Date;
    address: string;
    notes?: string | null;
    basePrice: number;
    finalPrice: number;
    anticipoAmount: number;
    liquidacionAmount: number;
    comisionAmount: number;
    contractorPayoutAmount: number;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    service?: Service;
    client?: User;
    contractor?: User;
    availability?: Availability;
    stateHistory?: BookingStateHistory[];
    payments?: Payment[];
}

export interface CreateBookingDTO {
    serviceId: string;
    slotId: string; // Maps to availabilityId or used to find it
    scheduledDate: Date; // Should match slot
    address: string;
    notes?: string;
}

export interface UpdateBookingStatusDTO {
    status: BookingStatus;
    notes?: string;
}

export interface BookingPricingDetails {
    basePrice: number;
    finalPrice: number;
    anticipoAmount: number;
    liquidacionAmount: number;
    comisionAmount: number;
    contractorPayoutAmount: number;
}
