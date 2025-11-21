/**
 * Weekly Rule Types & DTOs
 *
 * Represents recurring availability rules by day of week.
 */

export interface TimeInterval {
  startTime: string; // Format: "HH:MM" (24-hour)
  endTime: string;   // Format: "HH:MM" (24-hour)
}

export interface CreateWeeklyRuleDTO {
  dayOfWeek: number; // 0-6 (0=Sunday, 1=Monday, ..., 6=Saturday)
  intervals: TimeInterval[];
}

export interface UpdateWeeklyRuleDTO {
  intervals?: TimeInterval[];
  enabled?: boolean;
}

export interface WeeklyRuleResponseDTO {
  id: string;
  contractorProfileId: string;
  dayOfWeek: number;
  intervals: TimeInterval[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
