/**
 * Exception types for contractor availability (holidays, closures)
 * @module contractors/availability/types/exception
 */

import type { ExceptionType, TimeInterval } from "./common";

/**
 * DTO for creating an availability exception
 */
export interface CreateExceptionDTO {
  /** Type of exception */
  type: ExceptionType;
  /** Date for ONE_OFF exception (ISO 8601 date string) */
  date?: string;
  /** Month for RECURRING exception (1-12) */
  recurringMonth?: number;
  /** Day for RECURRING exception (1-31) */
  recurringDay?: number;
  /** Whether this is a full-day closure */
  isFullDayClosure: boolean;
  /** Custom intervals if not a full-day closure */
  customIntervals?: TimeInterval[];
  /** Optional reason for the exception */
  reason?: string;
}

/**
 * Response DTO for availability exception
 */
export interface ExceptionResponseDTO {
  /** Exception ID */
  id: string;
  /** Contractor profile ID */
  contractorProfileId: string;
  /** Type of exception */
  type: ExceptionType;
  /** Date for ONE_OFF exception */
  date: string | null;
  /** Month for RECURRING exception */
  recurringMonth: number | null;
  /** Day for RECURRING exception */
  recurringDay: number | null;
  /** Whether this is a full-day closure */
  isFullDayClosure: boolean;
  /** Custom intervals if not a full-day closure */
  customIntervals: TimeInterval[] | null;
  /** Reason for the exception */
  reason: string | null;
  /** Creation timestamp */
  createdAt: string; // ISO 8601
  /** Last update timestamp */
  updatedAt: string; // ISO 8601
}

/**
 * Filters for listing exceptions
 */
export interface ExceptionListFilters {
  /** Filter by exception type */
  type?: ExceptionType;
  /** Start date for filtering ONE_OFF exceptions */
  startDate?: string; // ISO 8601
  /** End date for filtering ONE_OFF exceptions */
  endDate?: string; // ISO 8601
}

/**
 * Internal exception entity (from database)
 */
export interface ExceptionEntity {
  id: string;
  contractorProfileId: string;
  type: "ONE_OFF" | "RECURRING";
  date: Date | null;
  recurringMonth: number | null;
  recurringDay: number | null;
  isFullDayClosure: boolean;
  customIntervals: unknown | null; // JSON - will be parsed to TimeInterval[]
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
