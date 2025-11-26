/**
 * Timezone Utilities
 *
 * Dependencies: date-fns, date-fns-tz
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { parse, format } from 'date-fns';

/**
 * Convert local date/time in contractor's timezone to UTC
 *
 * @param dateStr - Date in "YYYY-MM-DD" format
 * @param timeStr - Time in "HH:MM" format
 * @param timezone - IANA timezone (e.g., "America/Mexico_City")
 * @returns Date object in UTC
 */
export function convertToUTC(dateStr: string, timeStr: string, timezone: string): Date {
  const localDateTimeStr = `${dateStr} ${timeStr}`;
  const localDateTime = parse(localDateTimeStr, 'yyyy-MM-dd HH:mm', new Date());
  return fromZonedTime(localDateTime, timezone);
}

/**
 * Convert UTC date to local date/time in contractor's timezone
 *
 * @param utcDate - Date object in UTC
 * @param timezone - IANA timezone
 * @returns Object with date and time strings in local timezone
 */
export function convertFromUTC(utcDate: Date, timezone: string): { date: string; time: string } {
  const zonedDate = toZonedTime(utcDate, timezone);
  return {
    date: format(zonedDate, 'yyyy-MM-dd'),
    time: format(zonedDate, 'HH:mm'),
  };
}

/**
 * Validate that timezone is a valid IANA timezone
 *
 * @param timezone - Timezone string to validate
 * @returns true if valid, false otherwise
 */
export function validateTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
