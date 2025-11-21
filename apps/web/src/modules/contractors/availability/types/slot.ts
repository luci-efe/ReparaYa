/**
 * Available Slot Types & DTOs
 *
 * Represents computed available time slots.
 */

export interface AvailableSlotDTO {
  date: string;           // Format: "YYYY-MM-DD"
  startTime: string;      // Format: "HH:MM" (in contractor's timezone)
  endTime: string;        // Format: "HH:MM" (in contractor's timezone)
  durationMinutes: number;
  timezone: string;       // IANA timezone (e.g., "America/Mexico_City")
}

export interface GenerateSlotsQuery {
  startDate: string;      // Format: "YYYY-MM-DD"
  endDate: string;        // Format: "YYYY-MM-DD"
  serviceId?: string;     // Optional UUID to filter by service duration
}
