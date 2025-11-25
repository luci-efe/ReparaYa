import { BookingStatus } from '../types';

export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
    [BookingStatus.PENDING_APPROVAL as BookingStatus]: [BookingStatus.PENDING_PAYMENT, BookingStatus.CANCELLED],
    [BookingStatus.PENDING_PAYMENT]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
    [BookingStatus.CONFIRMED]: [BookingStatus.ON_ROUTE, BookingStatus.CANCELLED],
    [BookingStatus.ON_ROUTE]: [BookingStatus.ON_SITE, BookingStatus.CANCELLED],
    [BookingStatus.ON_SITE]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
    [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED, BookingStatus.DISPUTED],
    [BookingStatus.COMPLETED]: [BookingStatus.DISPUTED],
    [BookingStatus.CANCELLED]: [],
    [BookingStatus.DISPUTED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED], // Resolved to completed or cancelled
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
    const allowed = VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}

export function getValidTransitions(from: BookingStatus): BookingStatus[] {
    return VALID_TRANSITIONS[from] || [];
}
