import { z } from 'zod';
import { BookingStatus } from '../types';

export const createBookingSchema = z.object({
    serviceId: z.string().uuid(),
    slotId: z.string(), // Can be UUID (existing) or composite key (generated)
    scheduledDate: z.string().or(z.date()).transform((val) => new Date(val)),
    address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
    notes: z.string().optional(),
});

export const updateBookingStatusSchema = z.object({
    status: z.nativeEnum(BookingStatus),
    notes: z.string().optional(),
});
