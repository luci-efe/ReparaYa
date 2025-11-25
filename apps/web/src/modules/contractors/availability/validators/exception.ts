/**
 * Exception Validators (Zod Schemas)
 */

import { z } from 'zod';
import { intervalsOverlap } from '../utils/intervals';

const timeIntervalSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato debe ser HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato debe ser HH:MM'),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'startTime debe ser anterior a endTime' }
);

/**
 * Checks if any intervals in the array overlap with each other
 */
function hasOverlappingIntervals(intervals: { startTime: string; endTime: string }[]): boolean {
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      if (intervalsOverlap(intervals[i], intervals[j])) {
        return true;
      }
    }
  }
  return false;
}

export const createExceptionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato debe ser YYYY-MM-DD'),
  intervals: z.array(timeIntervalSchema),
  type: z.enum(['AVAILABLE', 'BLOCKED']),
  reason: z.string().optional(),
}).refine(
  (data) => {
    // BLOCKED type can have empty intervals (full day blocked)
    // AVAILABLE type must have at least one interval
    if (data.type === 'AVAILABLE' && data.intervals.length === 0) {
      return false;
    }
    return true;
  },
  { 
    message: 'Excepciones de tipo AVAILABLE deben tener al menos un intervalo',
    path: ['intervals'],
  }
).refine(
  (data) => !hasOverlappingIntervals(data.intervals),
  {
    message: 'Los intervalos no deben traslaparse',
    path: ['intervals'],
  }
);

export const updateExceptionSchema = z.object({
  intervals: z.array(timeIntervalSchema).optional(),
  type: z.enum(['AVAILABLE', 'BLOCKED']).optional(),
  reason: z.string().optional(),
}).refine(
  (data) => {
    if (data.intervals && data.intervals.length > 0) {
      return !hasOverlappingIntervals(data.intervals);
    }
    return true;
  },
  {
    message: 'Los intervalos no deben traslaparse',
    path: ['intervals'],
  }
);
