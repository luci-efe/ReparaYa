/**
 * Zod validation schemas for availability exceptions
 * @module contractors/availability/validators/exception
 */

import { z } from "zod";
import { timeIntervalSchema } from "./schedule";

/**
 * Exception type enum
 */
export const exceptionTypeEnum = z.enum(["ONE_OFF", "RECURRING"]);

/**
 * Create exception schema
 * TODO: Add custom refinements for date/recurringMonth/recurringDay validation
 */
export const createExceptionSchema = z.object({
  type: exceptionTypeEnum,
  date: z.string().date().optional(),
  recurringMonth: z.number().int().min(1).max(12).optional(),
  recurringDay: z.number().int().min(1).max(31).optional(),
  isFullDayClosure: z.boolean(),
  customIntervals: z.array(timeIntervalSchema).optional(),
  reason: z.string().max(200).optional(),
});

// Inferred types
export type CreateExceptionInput = z.infer<typeof createExceptionSchema>;
export type ExceptionType = z.infer<typeof exceptionTypeEnum>;
