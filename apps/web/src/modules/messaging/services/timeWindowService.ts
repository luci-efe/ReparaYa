import { Booking, BookingStatus } from '@prisma/client';
import { MessagingWindowExpiredError } from '../errors';
import { MessagingWindowStatus } from '../types';

export class TimeWindowService {
    private readonly WINDOW_HOURS = 2;

    /**
     * Checks if messaging is available for a given booking.
     * Messaging is available if:
     * - Booking is in an active state (CONFIRMED, ON_ROUTE, ON_SITE, IN_PROGRESS)
     * - OR Booking is COMPLETED and within 2 hours of completion (using updatedAt as proxy for completion time)
     */
    isMessagingAvailable(booking: Booking): boolean {
        const status = this.getWindowStatus(booking);
        return status === MessagingWindowStatus.OPEN;
    }

    /**
     * Gets the current status of the messaging window.
     */
    getWindowStatus(booking: Booking): MessagingWindowStatus {
        const activeStates: BookingStatus[] = [
            'CONFIRMED',
            'ON_ROUTE',
            'ON_SITE',
            'IN_PROGRESS',
            'PENDING_APPROVAL',
            'PENDING_PAYMENT',
        ];

        if (activeStates.includes(booking.status)) {
            return MessagingWindowStatus.OPEN;
        }

        if (booking.status === 'COMPLETED') {
            const completionTime = new Date(booking.updatedAt).getTime();
            const now = Date.now();
            const windowDuration = this.WINDOW_HOURS * 60 * 60 * 1000;

            if (now - completionTime <= windowDuration) {
                return MessagingWindowStatus.OPEN;
            } else {
                return MessagingWindowStatus.EXPIRED;
            }
        }

        // For other states (CANCELLED, DISPUTED, PENDING_APPROVAL, PENDING_PAYMENT if not included)
        // The proposal didn't explicitly exclude them but listed the INCLUDED ones.
        // "Messaging available when: ..." implies others are NOT available.
        return MessagingWindowStatus.NOT_STARTED; // Or EXPIRED, or CLOSED.
    }

    /**
     * Returns the time remaining for messaging in a COMPLETED booking.
     * Returns 0 if expired or not applicable.
     */
    getTimeRemaining(booking: Booking): number {
        if (booking.status !== 'COMPLETED') return 0;

        const completionTime = new Date(booking.updatedAt).getTime();
        const now = Date.now();
        const windowDuration = this.WINDOW_HOURS * 60 * 60 * 1000;
        const remaining = windowDuration - (now - completionTime);

        return remaining > 0 ? remaining : 0;
    }

    /**
     * Throws if messaging is not available.
     */
    ensureMessagingAvailable(booking: Booking): void {
        if (!this.isMessagingAvailable(booking)) {
            throw new MessagingWindowExpiredError();
        }
    }
}

export const timeWindowService = new TimeWindowService();
