/**
 * Weekly Rule Validators (Zod Schemas)
 *
 * TODO: Implement full validation with overlap detection
 */

import { z } from 'zod';

/**
 * Helper to parse "HH:MM" time string to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const parts = time.split(':');
  if (parts.length !== 2) {
    return 0; // Return 0 for invalid format (should not happen due to regex validation)
  }
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

  // Validate that conversion succeeded and values are in valid ranges
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 0; // Return 0 for invalid values (should not happen due to regex validation)
  }

  return hours * 60 + minutes;
}

const timeIntervalSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato debe ser HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato debe ser HH:MM'),
}).refine(
  (data) => parseTimeToMinutes(data.startTime) < parseTimeToMinutes(data.endTime),
  { message: 'startTime debe ser anterior a endTime' }
);

export const createWeeklyRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6, 'dayOfWeek debe estar entre 0-6'),
  intervals: z.array(timeIntervalSchema).min(1, 'Debe haber al menos un intervalo'),
}).refine(
  (data) => {
    // Validar que no haya traslapes entre intervalos
    const sorted = [...data.intervals].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 0; i < sorted.length - 1; i++) {
      if (parseTimeToMinutes(sorted[i].endTime) > parseTimeToMinutes(sorted[i + 1].startTime)) {
        return false;
      }
    }
    return true;
  },
  { message: 'Los intervalos no deben traslaparse' }
);

export const updateWeeklyRuleSchema = z.object({
  intervals: z.array(timeIntervalSchema).optional(),
  enabled: z.boolean().optional(),
}).refine(
  (data) => {
    // Validar traslapes solo si intervals está presente
    if (data.intervals) {
      const sorted = [...data.intervals].sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < sorted.length - 1; i++) {
        if (parseTimeToMinutes(sorted[i].endTime) > parseTimeToMinutes(sorted[i + 1].startTime)) {
          return false;
        }
      }
    }
    return true;
  },
  { message: 'Los intervalos no deben traslaparse' }
);

