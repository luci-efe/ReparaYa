/**
 * Zod validation schemas for weekly schedule
 * @module contractors/availability/validators/schedule
 */

import { z } from "zod";

/**
 * Time format regex (HH:mm)
 */
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Day of week enum
 */
export const dayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

/**
 * Time interval schema
 */
export const timeIntervalSchema = z
  .object({
    startTime: z
      .string()
      .regex(timeRegex, "Time must be in HH:mm format (e.g., 08:00)"),
    endTime: z
      .string()
      .regex(timeRegex, "Time must be in HH:mm format (e.g., 18:00)"),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Start time must be before end time",
  });

/**
 * Weekly rule schema (single day)
 */
export const weeklyRuleSchema = z.object({
  dayOfWeek: dayOfWeekEnum,
  intervals: z.array(timeIntervalSchema),
});

/**
 * Create schedule schema
 * TODO: Add timezone validation using Intl.supportedValuesOf('timeZone')
 * TODO: Add overlap detection refinement for intervals within same day
 */
export const createScheduleSchema = z.object({
  timezone: z.string().min(1).max(50),
  slotGranularityMinutes: z.enum([15, 30, 60]).optional().default(30),
  weeklyRules: z.array(weeklyRuleSchema),
});

/**
 * Update schedule schema (partial)
 */
export const updateScheduleSchema = createScheduleSchema.partial();

// Inferred types
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type TimeInterval = z.infer<typeof timeIntervalSchema>;
export type WeeklyRule = z.infer<typeof weeklyRuleSchema>;
export type DayOfWeek = z.infer<typeof dayOfWeekEnum>;
