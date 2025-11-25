import { BookingService } from './bookingService';
import { getValidTransitions } from './bookingStateMachine';
import { BookingStatus } from '../types';

export class DemoSimulationService {
    private bookingService: BookingService;

    constructor() {
        this.bookingService = new BookingService();
    }

    /**
     * Advances a booking to the next logical state for demo purposes.
     * This is a simplified simulation that picks the first "happy path" transition.
     */
    async advanceToNextState(bookingId: string, userId: string): Promise<BookingStatus | null> {
        const booking = await this.bookingService.getBookingById(bookingId, userId);
        const validTransitions = getValidTransitions(booking.status);

        if (validTransitions.length === 0) {
            return null; // Terminal state
        }

        // Prefer "happy path" transitions
        let nextState = validTransitions[0];

        // Specific logic for happy path
        if (booking.status === BookingStatus.PENDING_PAYMENT && validTransitions.includes(BookingStatus.CONFIRMED)) {
            nextState = BookingStatus.CONFIRMED;
        } else if (booking.status === BookingStatus.CONFIRMED && validTransitions.includes(BookingStatus.ON_ROUTE)) {
            nextState = BookingStatus.ON_ROUTE;
        } else if (booking.status === BookingStatus.ON_ROUTE && validTransitions.includes(BookingStatus.ON_SITE)) {
            nextState = BookingStatus.ON_SITE;
        } else if (booking.status === BookingStatus.ON_SITE && validTransitions.includes(BookingStatus.IN_PROGRESS)) {
            nextState = BookingStatus.IN_PROGRESS;
        } else if (booking.status === BookingStatus.IN_PROGRESS && validTransitions.includes(BookingStatus.COMPLETED)) {
            nextState = BookingStatus.COMPLETED;
        }

        await this.bookingService.updateBookingStatus(bookingId, { status: nextState, notes: 'Simulación de avance de estado' }, userId);
        return nextState;
    }

    /**
     * Simulates a time delay (e.g. for "work in progress")
     */
    async simulateDelay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
