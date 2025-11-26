export class RatingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RatingError';
    }
}

export class RatingNotFoundError extends RatingError {
    constructor(id: string) {
        super(`Rating with ID ${id} not found`);
        this.name = 'RatingNotFoundError';
    }
}

export class DuplicateRatingError extends RatingError {
    constructor(bookingId: string) {
        super(`Rating for booking ${bookingId} already exists`);
        this.name = 'DuplicateRatingError';
    }
}

export class BookingNotCompletedError extends RatingError {
    constructor(bookingId: string) {
        super(`Booking ${bookingId} is not completed`);
        this.name = 'BookingNotCompletedError';
    }
}

export class RatingNotAuthorizedError extends RatingError {
    constructor(message: string = 'Not authorized to perform this action') {
        super(message);
        this.name = 'RatingNotAuthorizedError';
    }
}

export class RatingVisibilityError extends RatingError {
    constructor(message: string = 'Rating is not visible yet') {
        super(message);
        this.name = 'RatingVisibilityError';
    }
}
