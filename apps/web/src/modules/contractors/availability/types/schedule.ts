/**
 * Schedule types for contractor weekly availability
 * @module contractors/availability/types/schedule
 */

import type { IanaTimezone, SlotGranularity, WeeklyRule } from "./common";

/**
 * DTO for creating a weekly schedule
 */
export interface CreateScheduleDTO {
  /** IANA timezone (e.g., "America/Mexico_City") */
  timezone: IanaTimezone;
  /** Slot granularity in minutes (15, 30, or 60) */
  slotGranularityMinutes?: SlotGranularity;
  /** Weekly rules defining availability for each day */
  weeklyRules: WeeklyRule[];
}

/**
 * DTO for updating a weekly schedule (partial)
 */
export type UpdateScheduleDTO = Partial<CreateScheduleDTO>;

/**
 * Response DTO for weekly schedule
 */
export interface ScheduleResponseDTO {
  /** Schedule ID */
  id: string;
  /** Contractor profile ID */
  contractorProfileId: string;
  /** IANA timezone */
  timezone: IanaTimezone;
  /** Slot granularity in minutes */
  slotGranularityMinutes: SlotGranularity;
  /** Weekly rules */
  weeklyRules: WeeklyRule[];
  /** Creation timestamp */
  createdAt: string; // ISO 8601
  /** Last update timestamp */
  updatedAt: string; // ISO 8601
}

/**
 * Internal schedule entity (from database)
 */
export interface ScheduleEntity {
  id: string;
  contractorProfileId: string;
  timezone: string;
  slotGranularityMinutes: number;
  weeklyRules: unknown; // JSON - will be parsed to WeeklyRule[]
  createdAt: Date;
  updatedAt: Date;
}
