/**
 * Errores custom para el módulo de servicios de contratistas
 */

/**
 * Error lanzado cuando un servicio no es encontrado
 */
export class ServiceNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Servicio ${identifier} no encontrado`);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Error lanzado cuando se intenta una transición de estado inválida
 */
export class InvalidVisibilityStatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidVisibilityStatusError';
  }
}

/**
 * Error lanzado cuando un usuario intenta realizar una acción no autorizada
 * sobre un servicio
 */
export class UnauthorizedServiceActionError extends Error {
  constructor(action: string) {
    super(`Acción no autorizada: ${action}`);
    this.name = 'UnauthorizedServiceActionError';
  }
}

/**
 * Error lanzado cuando un usuario no tiene permiso para acceder a un servicio
 */
export class UnauthorizedServiceAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedServiceAccessError';
  }
}

/**
 * Error lanzado cuando se intenta una transición de estado inválida
 */
export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly fromStatus: string,
    public readonly toStatus: string,
    message: string
  ) {
    super(message);
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Error lanzado cuando no se cumplen los requisitos de publicación
 */
export class PublicationRequirementsNotMetError extends Error {
  constructor(public readonly violations: string[]) {
    super(`Requisitos de publicación no cumplidos: ${violations.join(', ')}`);
    this.name = 'PublicationRequirementsNotMetError';
  }
}

/**
 * Error lanzado cuando una imagen de servicio no es encontrada
 */
export class ServiceImageNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Imagen de servicio ${identifier} no encontrada`);
    this.name = 'ServiceImageNotFoundError';
  }
}

/**
 * Error lanzado cuando se excede el límite de imágenes por servicio
 */
export class MaxImagesExceededError extends Error {
  constructor(serviceId: string, maxImages: number) {
    super(`El servicio ${serviceId} ya tiene el máximo de ${maxImages} imágenes permitidas`);
    this.name = 'MaxImagesExceededError';
  }
}

/**
 * Error lanzado cuando una categoría de servicio no es encontrada
 */
export class ServiceCategoryNotFoundError extends Error {
  constructor(categoryId: string) {
    super(`Categoría de servicio ${categoryId} no encontrada`);
    this.name = 'ServiceCategoryNotFoundError';
  }
}

// Re-export S3 errors for convenience
export * from './s3Errors';
