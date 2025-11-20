/**
 * Slot types for generated available time slots
 * @module contractors/availability/types/slot
 */

import type { IanaTimezone } from "./common";

/**
 * Generated available time slot
 */
export interface AvailableSlot {
  /** Date of the slot */
  date: string; // ISO 8601 date
  /** Start time in HH:mm format (contractor's local timezone) */
  startTime: string;
  /** End time in HH:mm format (contractor's local timezone) */
  endTime: string;
  /** Start time in UTC (ISO 8601) */
  startTimeUTC: string;
  /** End time in UTC (ISO 8601) */
  endTimeUTC: string;
  /** Duration in minutes */
  durationMinutes: number;
}

/**
 * Parameters for slot generation
 */
export interface SlotGenerationParams {
  /** Contractor profile ID */
  contractorProfileId: string;
  /** Start date for slot generation (ISO 8601) */
  startDate: string;
  /** End date for slot generation (ISO 8601) */
  endDate: string;
  /** Optional service duration to filter compatible slots (in minutes) */
  serviceDurationMinutes?: number;
  /** Optional service ID (fetches duration automatically) */
  serviceId?: string;
}

/**
 * Response DTO for slot generation
 */
export interface SlotGenerationResponseDTO {
  /** Array of available slots */
  slots: AvailableSlot[];
  /** Contractor's timezone */
  timezone: IanaTimezone;
  /** Total number of slots generated */
  total: number;
  /** Timestamp when slots were generated (for caching) */
  generatedAt: string; // ISO 8601
}
