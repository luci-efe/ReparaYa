/**
 * Block Validators (Zod Schemas)
 *
 * TODO: Implement full validation
 */

import { z } from 'zod';

export const createBlockSchema = z.object({
  startDateTime: z.string().datetime({ message: 'Debe ser formato ISO8601' }),
  endDateTime: z.string().datetime({ message: 'Debe ser formato ISO8601' }),
  reason: z.string().optional(),
}).refine(
  (data) => new Date(data.startDateTime) < new Date(data.endDateTime),
  { message: 'startDateTime debe ser anterior a endDateTime' }
);
// TODO: Add validation for future dates, no overlap with confirmed bookings

export const updateBlockSchema = z.object({
  startDateTime: z.string().datetime().optional(),
  endDateTime: z.string().datetime().optional(),
  reason: z.string().optional(),
});
