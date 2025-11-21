/**
 * Weekly Rule Validators (Zod Schemas)
 *
 * TODO: Implement full validation with overlap detection
 */

import { z } from 'zod';

const timeIntervalSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato debe ser HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato debe ser HH:MM'),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'startTime debe ser anterior a endTime' }
);

export const createWeeklyRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6, 'dayOfWeek debe estar entre 0-6'),
  intervals: z.array(timeIntervalSchema).min(1, 'Debe haber al menos un intervalo'),
});
// TODO: Add .refine() to detect overlapping intervals

export const updateWeeklyRuleSchema = z.object({
  intervals: z.array(timeIntervalSchema).optional(),
  enabled: z.boolean().optional(),
});
// TODO: Add .refine() to detect overlapping intervals if intervals provided
