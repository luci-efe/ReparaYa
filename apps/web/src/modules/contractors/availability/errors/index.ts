/**
 * Availability Module Custom Errors
 */

export class WeeklyRuleNotFoundError extends Error {
  constructor(message = 'Regla semanal no encontrada') {
    super(message);
    this.name = 'WeeklyRuleNotFoundError';
  }
}

export class ExceptionNotFoundError extends Error {
  constructor(message = 'Excepción no encontrada') {
    super(message);
    this.name = 'ExceptionNotFoundError';
  }
}

export class BlockNotFoundError extends Error {
  constructor(message = 'Bloqueo no encontrado') {
    super(message);
    this.name = 'BlockNotFoundError';
  }
}

export class InvalidTimeRangeError extends Error {
  constructor(message = 'Rango de tiempo inválido') {
    super(message);
    this.name = 'InvalidTimeRangeError';
  }
}

export class OverlappingIntervalsError extends Error {
  constructor(message = 'Los intervalos no deben traslaparse') {
    super(message);
    this.name = 'OverlappingIntervalsError';
  }
}

export class BookingConflictError extends Error {
  constructor(message = 'No puedes bloquear un intervalo con reservas confirmadas') {
    super(message);
    this.name = 'BookingConflictError';
  }
}

export class InvalidTimezoneError extends Error {
  constructor(message = 'Zona horaria inválida') {
    super(message);
    this.name = 'InvalidTimezoneError';
  }
}

export class ContractorNotVerifiedError extends Error {
  constructor(message = 'Solo contratistas verificados pueden gestionar disponibilidad') {
    super(message);
    this.name = 'ContractorNotVerifiedError';
  }
}
