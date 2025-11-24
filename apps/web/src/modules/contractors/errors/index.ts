/**
 * Errores custom para el módulo de contratistas
 */

/**
 * Error lanzado cuando un perfil de contratista no es encontrado
 */
export class ContractorProfileNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Perfil de contratista ${identifier} no encontrado`);
    this.name = 'ContractorProfileNotFoundError';
  }
}

/**
 * Error lanzado cuando se intenta crear un perfil duplicado
 * Regla de negocio: Un usuario solo puede tener un perfil de contratista
 */
export class ContractorProfileAlreadyExistsError extends Error {
  constructor(userId: string) {
    super(`El usuario ${userId} ya tiene un perfil de contratista`);
    this.name = 'ContractorProfileAlreadyExistsError';
  }
}

/**
 * Error lanzado cuando se intenta una transición de estado inválida
 */
export class InvalidVerificationStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidVerificationStatusError';
  }
}

/**
 * Error lanzado cuando un usuario intenta realizar una acción no autorizada
 * sobre un perfil de contratista
 */
export class UnauthorizedContractorActionError extends Error {
  constructor(action: string) {
    super(`Acción no autorizada: ${action}`);
    this.name = 'UnauthorizedContractorActionError';
  }
}

/**
 * Error lanzado cuando una ubicación de contratista no es encontrada
 */
export class LocationNotFoundError extends Error {
  constructor(contractorProfileId: string) {
    super(`Ubicación para el perfil de contratista ${contractorProfileId} no encontrada`);
    this.name = 'LocationNotFoundError';
  }
}

/**
 * Error lanzado cuando se intenta crear una ubicación duplicada
 * Regla de negocio: Un contratista solo puede tener una ubicación
 */
export class LocationAlreadyExistsError extends Error {
  constructor(contractorProfileId: string) {
    super(`El perfil de contratista ${contractorProfileId} ya tiene una ubicación registrada`);
    this.name = 'LocationAlreadyExistsError';
  }
}

/**
 * Error lanzado cuando la geocodificación falla
 */
export class GeocodingFailedError extends Error {
  constructor(message: string) {
    super(`Fallo en geocodificación: ${message}`);
    this.name = 'GeocodingFailedError';
  }
}
