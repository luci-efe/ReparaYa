/**
 * Overlap detection utilities for time intervals
 * @module contractors/availability/utils/overlapDetection
 *
 * TODO: Implement overlap detection algorithms
 * TODO: Add comprehensive tests for various overlap scenarios
 */

import type { TimeInterval } from "../types";

/**
 * Check if two time intervals overlap
 *
 * @param interval1 - First time interval
 * @param interval2 - Second time interval
 * @returns True if intervals overlap, false otherwise
 *
 * @example
 * detectIntervalOverlap(
 *   { startTime: "08:00", endTime: "10:00" },
 *   { startTime: "09:00", endTime: "11:00" }
 * ) // true (partial overlap)
 *
 * detectIntervalOverlap(
 *   { startTime: "08:00", endTime: "10:00" },
 *   { startTime: "10:00", endTime: "12:00" }
 * ) // false (adjacent, no overlap)
 */
export function detectIntervalOverlap(
  interval1: TimeInterval,
  interval2: TimeInterval
): boolean {
  // TODO: Implement overlap detection
  // Overlap occurs if: start1 < end2 AND start2 < end1
  throw new Error("Not implemented");
}

/**
 * Find overlapping intervals in an array of time intervals
 *
 * @param intervals - Array of time intervals
 * @returns Array of tuples representing overlapping interval pairs (indices)
 *
 * @example
 * detectDayIntervalOverlaps([
 *   { startTime: "08:00", endTime: "12:00" },
 *   { startTime: "11:00", endTime: "15:00" }, // overlaps with first
 *   { startTime: "16:00", endTime: "18:00" }
 * ])
 * // Returns: [[0, 1]]
 */
export function detectDayIntervalOverlaps(
  intervals: TimeInterval[]
): [number, number][] {
  // TODO: Implement O(n²) or O(n log n) overlap detection
  throw new Error("Not implemented");
}

/**
 * Merge overlapping time intervals
 * Useful for combining adjacent or overlapping availability slots
 *
 * @param intervals - Array of time intervals (may overlap)
 * @returns Array of merged non-overlapping intervals
 *
 * @example
 * mergeIntervals([
 *   { startTime: "08:00", endTime: "10:00" },
 *   { startTime: "09:00", endTime: "12:00" },
 *   { startTime: "14:00", endTime: "16:00" }
 * ])
 * // Returns: [
 * //   { startTime: "08:00", endTime: "12:00" },
 * //   { startTime: "14:00", endTime: "16:00" }
 * // ]
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  // TODO: Implement interval merging algorithm
  // 1. Sort intervals by startTime
  // 2. Merge overlapping intervals
  throw new Error("Not implemented");
}
