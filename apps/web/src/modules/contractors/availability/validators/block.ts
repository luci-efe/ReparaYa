/**
 * Block Validators (Zod Schemas)
 *
 * TODO: Implement full validation
 */

import { z } from 'zod';

export const createBlockSchema = z.object({
  // Accept both full ISO8601 (2025-11-29T10:00:00.000Z) and simplified (2025-11-29T10:00)
  startDateTime: z.string().refine(
    (val) => {
      // Accept ISO8601 full format or YYYY-MM-DDTHH:mm format
      const iso8601Full = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)?$/;
      const simplified = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
      return iso8601Full.test(val) || simplified.test(val);
    },
    { message: 'Debe ser formato ISO8601 o YYYY-MM-DDTHH:mm' }
  ),
  endDateTime: z.string().refine(
    (val) => {
      const iso8601Full = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)?$/;
      const simplified = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
      return iso8601Full.test(val) || simplified.test(val);
    },
    { message: 'Debe ser formato ISO8601 o YYYY-MM-DDTHH:mm' }
  ),
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
