export class MessageNotFoundError extends Error {
    constructor(message = 'Mensaje no encontrado') {
        super(message);
        this.name = 'MessageNotFoundError';
    }
}

export class MessagingWindowExpiredError extends Error {
    constructor(message = 'La ventana de mensajería ha expirado') {
        super(message);
        this.name = 'MessagingWindowExpiredError';
    }
}

export class UnauthorizedMessageAccessError extends Error {
    constructor(message = 'No tienes permiso para acceder a estos mensajes') {
        super(message);
        this.name = 'UnauthorizedMessageAccessError';
    }
}

export class RateLimitExceededError extends Error {
    constructor(message = 'Has excedido el límite de mensajes. Por favor espera un momento.') {
        super(message);
        this.name = 'RateLimitExceededError';
    }
}

export class MessageTooLongError extends Error {
    constructor(message = 'El mensaje es demasiado largo') {
        super(message);
        this.name = 'MessageTooLongError';
    }
}

export class InvalidLinkError extends Error {
    constructor(message = 'El mensaje contiene enlaces no permitidos. Solo se permiten enlaces https://') {
        super(message);
        this.name = 'InvalidLinkError';
    }
}
