/**
 * Exception Validators (Zod Schemas)
 *
 * TODO: Implement full validation
 */

import { z } from 'zod';

const timeIntervalSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato debe ser HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato debe ser HH:MM'),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'startTime debe ser anterior a endTime' }
);

export const createExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato debe ser YYYY-MM-DD'),
  intervals: z.array(timeIntervalSchema),
  type: z.enum(['AVAILABLE', 'BLOCKED']),
  reason: z.string().optional(),
});
// TODO: Add validation for future dates, overlap detection

export const updateExceptionSchema = z.object({
  intervals: z.array(timeIntervalSchema).optional(),
  type: z.enum(['AVAILABLE', 'BLOCKED']).optional(),
  reason: z.string().optional(),
});
