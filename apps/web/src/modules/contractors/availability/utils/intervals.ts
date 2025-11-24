/**
 * Interval Utilities
 *
 * TODO: Implement full interval manipulation logic
 */

import { TimeInterval } from '../types';

/**
 * Check if two time intervals overlap
 *
 * @param a - First interval
 * @param b - Second interval
 * @returns true if intervals overlap, false otherwise
 */
export function intervalsOverlap(_a: TimeInterval, _b: TimeInterval): boolean {
  // TODO: Implement overlap detection
  // Return true if a.startTime < b.endTime AND b.startTime < a.endTime
  throw new Error('Not implemented: intervalsOverlap');
}

/**
 * Subtract one interval from another
 *
 * @param base - Base interval
 * @param toSubtract - Interval to subtract
 * @returns Array of remaining intervals after subtraction
 */
export function subtractInterval(_base: TimeInterval, _toSubtract: TimeInterval): TimeInterval[] {
  // TODO: Implement interval subtraction
  // Return array of intervals (can be 0, 1, or 2 intervals)
  throw new Error('Not implemented: subtractInterval');
}

/**
 * Calculate duration of an interval in minutes
 *
 * @param interval - Time interval
 * @returns Duration in minutes
 */
export function calculateDurationMinutes(_interval: TimeInterval): number {
  // TODO: Implement duration calculation
  // Parse startTime and endTime, calculate difference in minutes
  throw new Error('Not implemented: calculateDurationMinutes');
}

/**
 * Detect overlaps in an array of intervals
 *
 * @param intervals - Array of intervals to check
 * @returns true if any overlap detected, false otherwise
 */
export function hasOverlaps(_intervals: TimeInterval[]): boolean {
  // TODO: Implement overlap detection for array
  // Sort by startTime, check adjacent intervals
  throw new Error('Not implemented: hasOverlaps');
}
