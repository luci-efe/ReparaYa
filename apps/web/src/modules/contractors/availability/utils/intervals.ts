/**
 * Interval Utilities
 *
 * Provides functions for manipulating time intervals
 */

import { TimeInterval } from '../types';

/**
 * Check if two time intervals overlap
 *
 * @param a - First interval
 * @param b - Second interval
 * @returns true if intervals overlap, false otherwise
 */
export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/**
 * Subtract one interval from another
 *
 * Returns the remaining intervals after removing the toSubtract interval from base.
 * Can return 0, 1, or 2 intervals depending on the overlap.
 *
 * @param base - Base interval to subtract from
 * @param toSubtract - Interval to remove
 * @returns Array of remaining intervals
 */
export function subtractInterval(base: TimeInterval, toSubtract: TimeInterval): TimeInterval[] {
  if (!intervalsOverlap(base, toSubtract)) {
    return [base];
  }

  const result: TimeInterval[] = [];

  // Parte antes de la intersección
  if (base.startTime < toSubtract.startTime) {
    result.push({ startTime: base.startTime, endTime: toSubtract.startTime });
  }

  // Parte después de la intersección
  if (base.endTime > toSubtract.endTime) {
    result.push({ startTime: toSubtract.endTime, endTime: base.endTime });
  }

  return result;
}

/**
 * Calculate duration of an interval in minutes
 *
 * @param interval - Time interval
 * @returns Duration in minutes
 */
export function calculateDurationMinutes(interval: TimeInterval): number {
  const [startHour, startMin] = interval.startTime.split(':').map(Number);
  const [endHour, endMin] = interval.endTime.split(':').map(Number);
  return (endHour * 60 + endMin) - (startHour * 60 + startMin);
}
