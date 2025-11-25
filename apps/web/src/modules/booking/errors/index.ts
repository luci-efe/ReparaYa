export class BookingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BookingError';
    }
}

export class BookingNotFoundError extends BookingError {
    constructor(id: string) {
        super(`No se encontró la reserva con ID: ${id}`);
        this.name = 'BookingNotFoundError';
    }
}

export class InvalidStateTransitionError extends BookingError {
    constructor(from: string, to: string) {
        super(`Transición de estado inválida: de ${from} a ${to}`);
        this.name = 'InvalidStateTransitionError';
    }
}

export class SlotNotAvailableError extends BookingError {
    constructor() {
        super('El horario seleccionado ya no está disponible');
        this.name = 'SlotNotAvailableError';
    }
}

export class DuplicateBookingError extends BookingError {
    constructor() {
        super('Ya existe una reserva para este horario');
        this.name = 'DuplicateBookingError';
    }
}

export class UnauthorizedBookingAccessError extends BookingError {
    constructor() {
        super('No tienes permiso para acceder a esta reserva');
        this.name = 'UnauthorizedBookingAccessError';
    }
}
