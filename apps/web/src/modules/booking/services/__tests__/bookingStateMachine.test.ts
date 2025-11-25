import { BookingStatus } from '@prisma/client';
import { canTransition, getValidTransitions } from '../bookingStateMachine';

describe('Booking State Machine', () => {
    describe('canTransition', () => {
        it('should allow valid transitions', () => {
            expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED)).toBe(true);
            expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.ON_ROUTE)).toBe(true);
            expect(canTransition(BookingStatus.ON_ROUTE, BookingStatus.ON_SITE)).toBe(true);
            expect(canTransition(BookingStatus.ON_SITE, BookingStatus.IN_PROGRESS)).toBe(true);
            expect(canTransition(BookingStatus.IN_PROGRESS, BookingStatus.COMPLETED)).toBe(true);
        });

        it('should allow cancellation from appropriate states', () => {
            expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.CANCELLED)).toBe(true);
            expect(canTransition(BookingStatus.CONFIRMED, BookingStatus.CANCELLED)).toBe(true);
        });

        it('should deny invalid transitions', () => {
            expect(canTransition(BookingStatus.PENDING_PAYMENT, BookingStatus.COMPLETED)).toBe(false);
            expect(canTransition(BookingStatus.COMPLETED, BookingStatus.PENDING_PAYMENT)).toBe(false);
            expect(canTransition(BookingStatus.CANCELLED, BookingStatus.CONFIRMED)).toBe(false);
        });
    });

    describe('getValidTransitions', () => {
        it('should return correct next states for PENDING_PAYMENT', () => {
            const transitions = getValidTransitions(BookingStatus.PENDING_PAYMENT);
            expect(transitions).toContain(BookingStatus.CONFIRMED);
            expect(transitions).toContain(BookingStatus.CANCELLED);
            expect(transitions).not.toContain(BookingStatus.COMPLETED);
        });

        it('should return empty array for terminal states', () => {
            expect(getValidTransitions(BookingStatus.COMPLETED)).toEqual([]);
            expect(getValidTransitions(BookingStatus.CANCELLED)).toEqual([]);
        });
    });
});
