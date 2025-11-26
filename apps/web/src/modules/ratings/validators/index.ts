import { z } from 'zod';

export const createClientRatingSchema = z.object({
    bookingId: z.string().uuid(),
    serviceId: z.string().uuid(),
    contractorId: z.string().uuid(),
    stars: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
});

export const createContractorRatingSchema = z.object({
    bookingId: z.string().uuid(),
    contractorId: z.string().uuid(),
    stars: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
});

export const ratingQuerySchema = z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
});
