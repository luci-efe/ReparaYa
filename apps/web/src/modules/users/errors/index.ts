/**
 * Errores custom para el módulo de usuarios
 */

/**
 * Error lanzado cuando un usuario no es encontrado
 */
export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`Usuario con ID ${userId} no encontrado`);
    this.name = 'UserNotFoundError';
  }
}

/**
 * Error lanzado cuando una dirección no es encontrada
 */
export class AddressNotFoundError extends Error {
  constructor(addressId: string) {
    super(`Dirección con ID ${addressId} no encontrada`);
    this.name = 'AddressNotFoundError';
  }
}

/**
 * Error lanzado cuando un usuario intenta realizar una acción prohibida
 */
export class ForbiddenActionError extends Error {
  constructor(action: string) {
    super(`Acción no permitida: ${action}`);
    this.name = 'ForbiddenActionError';
  }
}

/**
 * Error lanzado cuando se intenta eliminar la única dirección de un usuario
 * Regla de negocio BR-001: Usuario debe tener al menos una dirección
 */
export class CannotDeleteLastAddressError extends Error {
  constructor() {
    super('No puedes eliminar la única dirección de tu perfil');
    this.name = 'CannotDeleteLastAddressError';
  }
}
