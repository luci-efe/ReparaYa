/**
 * Common types for contractor availability management
 * @module contractors/availability/types/common
 */

/**
 * Days of the week
 */
export type DayOfWeek =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

/**
 * Time interval in HH:mm format
 */
export interface TimeInterval {
  /** Start time in HH:mm format (e.g., "08:00") */
  startTime: string;
  /** End time in HH:mm format (e.g., "12:00") */
  endTime: string;
}

/**
 * Weekly rule for a specific day
 */
export interface WeeklyRule {
  /** Day of the week */
  dayOfWeek: DayOfWeek;
  /** Time intervals for this day */
  intervals: TimeInterval[];
}

/**
 * Exception type for availability
 */
export enum ExceptionType {
  /** One-time exception for a specific date */
  ONE_OFF = "ONE_OFF",
  /** Recurring exception (e.g., every December 25) */
  RECURRING = "RECURRING",
}

/**
 * Slot granularity options (in minutes)
 */
export type SlotGranularity = 15 | 30 | 60;

/**
 * IANA timezone string (e.g., "America/Mexico_City")
 */
export type IanaTimezone = string;
