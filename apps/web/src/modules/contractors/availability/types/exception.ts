/**
 * Availability Exception Types & DTOs
 *
 * Represents date-specific overrides to weekly rules.
 */

import { TimeInterval } from './weeklyRule';

export type ExceptionType = 'AVAILABLE' | 'BLOCKED';

export interface CreateExceptionDTO {
  date: string; // Format: "YYYY-MM-DD"
  intervals: TimeInterval[];
  type: ExceptionType;
  reason?: string;
}

export interface UpdateExceptionDTO {
  intervals?: TimeInterval[];
  type?: ExceptionType;
  reason?: string;
}

export interface ExceptionResponseDTO {
  id: string;
  contractorProfileId: string;
  date: string;
  intervals: TimeInterval[];
  type: ExceptionType;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}
