/**
 * Zod validation schemas for manual blockouts
 * @module contractors/availability/validators/blockout
 */

import { z } from "zod";

/**
 * Time format regex (HH:mm)
 */
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Create blockout schema
 * TODO: Add validation for future dates (at least 1 hour from now)
 */
export const createBlockoutSchema = z
  .object({
    date: z.string().date(),
    startTime: z
      .string()
      .regex(timeRegex, "Time must be in HH:mm format (e.g., 14:00)"),
    endTime: z
      .string()
      .regex(timeRegex, "Time must be in HH:mm format (e.g., 16:00)"),
    reason: z.string().max(200).optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Start time must be before end time",
  });

// Inferred types
export type CreateBlockoutInput = z.infer<typeof createBlockoutSchema>;
