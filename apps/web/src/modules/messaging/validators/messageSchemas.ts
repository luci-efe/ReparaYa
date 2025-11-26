import { z } from 'zod';

export const createMessageSchema = z.object({
    bookingId: z.string().uuid(),
    text: z.string().min(1, 'El mensaje no puede estar vacío').max(2000, 'El mensaje no puede exceder los 2000 caracteres'),
});

export const getMessagesSchema = z.object({
    bookingId: z.string().uuid(),
    cursor: z.string().optional(),
    limit: z.number().min(1).max(50).default(20),
});
