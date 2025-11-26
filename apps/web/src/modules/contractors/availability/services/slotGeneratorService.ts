/**
 * Slot Generator Service
 *
 * Generates available time slots for contractors by combining:
 * 1. Weekly recurrence rules
 * 2. Date-specific exceptions
 * 3. Manual blocks (vacations, etc.)
 * 4. Confirmed bookings
 */

import { eachDayOfInterval, getDay, parseISO, format, differenceInWeeks } from 'date-fns';
import { AvailableSlotDTO, TimeInterval } from '../types';
import { weeklyRuleRepository } from '../repositories/weeklyRuleRepository';
import { exceptionRepository } from '../repositories/exceptionRepository';
import { blockRepository } from '../repositories/blockRepository';
import { BookingRepository } from '@/modules/booking/repositories/bookingRepository';
import { contractorProfileRepository } from '@/modules/contractors/repositories/contractorProfileRepository';
import { subtractInterval, calculateDurationMinutes } from '../utils/intervals';
import { convertFromUTC } from '../utils/timezone';
import { prisma } from '@/lib/db';

export const slotGeneratorService = {
  /**
   * Generate available slots for a contractor in a date range
   *
   * @param contractorId - Contractor profile ID
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD, max 8 weeks from startDate)
   * @param serviceId - Optional service ID to filter by duration
   * @returns Array of available slots
   */
  async generateSlots(
    contractorId: string,
    startDate: string,
    endDate: string,
    serviceId?: string
  ): Promise<AvailableSlotDTO[]> {
    // 1. Validate date range (max 8 weeks)
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const weeksDiff = differenceInWeeks(end, start);

    if (weeksDiff > 8) {
      throw new Error('El rango máximo es 8 semanas');
    }

    // 2. Get contractor and timezone
    const contractor = await contractorProfileRepository.findById(contractorId);
    if (!contractor) {
      throw new Error('Contratista no encontrado');
    }

    // Get timezone from service location
    const location = await prisma.contractorServiceLocation.findUnique({
      where: { contractorProfileId: contractorId },
    });

    if (!location || !location.timezone) {
      throw new Error('El contratista no tiene zona horaria configurada');
    }

    const timezone = location.timezone;

    // 3. Get all availability data for the range
    const weeklyRules = await weeklyRuleRepository.findByContractor(contractorId);
    const exceptions = await exceptionRepository.findByDateRange(contractorId, startDate, endDate);
    const blocks = await blockRepository.findByDateRange(contractorId, start, end);

    // Get confirmed bookings
    let confirmedBookings: Array<{ startDateTime: Date; endDateTime: Date }> = [];
    try {
      const bookingRepository = new BookingRepository();
      confirmedBookings = await bookingRepository.getConfirmedBookings(contractorId, start, end);
    } catch (error) {
      console.error('Error fetching confirmed bookings:', error);
      // Continue without filtering bookings if error occurs
    }

    // Get service duration if provided
    let serviceDuration: number | undefined;
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { durationMinutes: true },
      });
      if (service) {
        serviceDuration = service.durationMinutes;
      }
    }

    // 4. Generate slots for each day
    const days = eachDayOfInterval({ start, end });
    const slots: AvailableSlotDTO[] = [];

    for (const day of days) {
      const dayOfWeek = getDay(day); // 0 = Sunday, 6 = Saturday
      const dateStr = format(day, 'yyyy-MM-dd');

      // 4a. Get base intervals (from exception or weekly rule)
      let baseIntervals: TimeInterval[] = [];

      // Check if there's an exception for this date
      const exception = exceptions.find(
        (e) => format(new Date(e.date), 'yyyy-MM-dd') === dateStr
      );

      if (exception) {
        if (exception.type === 'BLOCKED') {
          // Entire day is blocked, skip
          continue;
        }
        // Use exception intervals
        baseIntervals = exception.intervals as TimeInterval[];
      } else {
        // Use weekly rule for this day
        const rule = weeklyRules.find((r) => r.dayOfWeek === dayOfWeek && r.enabled);
        if (rule) {
          baseIntervals = rule.intervals as TimeInterval[];
        }
      }

      // If no intervals, skip this day
      if (baseIntervals.length === 0) {
        continue;
      }

      // 4b. Subtract blocks that intersect this day
      let availableIntervals = [...baseIntervals];

      for (const block of blocks) {
        const blockStart = new Date(block.startDateTime);
        const blockEnd = new Date(block.endDateTime);

        // Check if block intersects with this day
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        if (blockStart <= dayEnd && blockEnd >= dayStart) {
          // Convert block to time interval for this day
          const blockInterval = this._convertDateTimeToTimeInterval(
            blockStart,
            blockEnd,
            day,
            timezone
          );

          if (blockInterval) {
            // Subtract block from all intervals
            availableIntervals = availableIntervals.flatMap((interval) =>
              subtractInterval(interval, blockInterval)
            );
          }
        }
      }

      // 4c. Subtract confirmed bookings
      for (const booking of confirmedBookings) {
        const bookingStart = new Date(booking.startDateTime);
        const bookingEnd = new Date(booking.endDateTime);

        // Check if booking intersects with this day
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        if (bookingStart <= dayEnd && bookingEnd >= dayStart) {
          // Convert booking to time interval for this day
          const bookingInterval = this._convertDateTimeToTimeInterval(
            bookingStart,
            bookingEnd,
            day,
            timezone
          );

          if (bookingInterval) {
            // Subtract booking from all intervals
            availableIntervals = availableIntervals.flatMap((interval) =>
              subtractInterval(interval, bookingInterval)
            );
          }
        }
      }

      // 4d. Filter by service duration if provided
      if (serviceDuration) {
        availableIntervals = availableIntervals.filter(
          (interval) => calculateDurationMinutes(interval) >= serviceDuration
        );
      }

      // 4e. Convert intervals to discrete slots (15-minute intervals)
      // If serviceDuration is not provided, we just return the intervals (or default to 15 min slots?)
      // The requirement says "choose in intervals of 15 minutes".
      // We'll generate slots every 15 minutes that fit the service duration.

      const duration = serviceDuration || 60; // Default to 60 min if not specified (shouldn't happen for booking)
      const stepMinutes = 15;

      for (const interval of availableIntervals) {
        // Parse start and end times
        // Interval times are strings "HH:mm"
        const intervalStart = new Date(`${dateStr}T${interval.startTime}:00`);
        const intervalEnd = new Date(`${dateStr}T${interval.endTime}:00`);

        // Handle case where end time is "24:00" -> next day 00:00
        if (interval.endTime === '24:00') {
          intervalEnd.setDate(intervalEnd.getDate() + 1);
          intervalEnd.setHours(0, 0, 0, 0);
        }

        let currentSlotStart = new Date(intervalStart);

        while (true) {
          const currentSlotEnd = new Date(currentSlotStart.getTime() + duration * 60000);

          if (currentSlotEnd > intervalEnd) {
            break;
          }

          // Add this slot
          slots.push({
            date: dateStr,
            startTime: format(currentSlotStart, 'HH:mm'),
            endTime: format(currentSlotEnd, 'HH:mm'),
            durationMinutes: duration,
            timezone,
          });

          // Advance by step (15 mins)
          currentSlotStart = new Date(currentSlotStart.getTime() + stepMinutes * 60000);
        }
      }
    }

    return slots;
  },

  /**
   * Helper: Convert UTC datetime range to time interval for a specific day
   * Handles blocks/bookings that span multiple days or partial days
   */
  _convertDateTimeToTimeInterval(
    startDateTime: Date,
    endDateTime: Date,
    targetDay: Date,
    timezone: string
  ): TimeInterval | null {
    // Convert UTC times to contractor's timezone
    const localStart = convertFromUTC(startDateTime, timezone);
    const localEnd = convertFromUTC(endDateTime, timezone);

    const targetDateStr = format(targetDay, 'yyyy-MM-dd');

    // Check if the block/booking affects this specific day
    const startsBeforeOrOnDay = localStart.date <= targetDateStr;
    const endsAfterOrOnDay = localEnd.date >= targetDateStr;

    if (!startsBeforeOrOnDay || !endsAfterOrOnDay) {
      // Doesn't affect this day
      return null;
    }

    // Determine the effective start and end times for this day
    let effectiveStartTime: string;
    let effectiveEndTime: string;

    if (localStart.date === targetDateStr) {
      // Starts on this day
      effectiveStartTime = localStart.time;
    } else {
      // Starts before this day, so entire day from 00:00
      effectiveStartTime = '00:00';
    }

    if (localEnd.date === targetDateStr) {
      // Ends on this day
      effectiveEndTime = localEnd.time;
    } else {
      // Ends after this day, so entire day until 24:00
      effectiveEndTime = '24:00';
    }

    return {
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
    };
  },
};
