/**
 * Service Module Errors
 *
 * Custom error classes for service-related operations
 *
 * @module services/errors
 */

// ============================================================================
// Service Errors
// ============================================================================

/**
 * Thrown when a service is not found
 */
export class ServiceNotFoundError extends Error {
  constructor(serviceId: string) {
    super(`Service with ID ${serviceId} not found`);
    this.name = 'ServiceNotFoundError';
  }
}

/**
 * Thrown when attempting invalid state transition
 */
export class InvalidServiceStateTransitionError extends Error {
  constructor(currentState: string, targetState: string, reason?: string) {
    const message = reason
      ? `Cannot transition service from ${currentState} to ${targetState}: ${reason}`
      : `Invalid state transition from ${currentState} to ${targetState}`;
    super(message);
    this.name = 'InvalidServiceStateTransitionError';
  }
}

/**
 * Thrown when trying to perform unauthorized action on service
 */
export class UnauthorizedServiceActionError extends Error {
  constructor(action: string, reason?: string) {
    const message = reason
      ? `Unauthorized to ${action}: ${reason}`
      : `You are not authorized to ${action}`;
    super(message);
    this.name = 'UnauthorizedServiceActionError';
  }
}

/**
 * Thrown when service publication requirements are not met
 */
export class ServicePublicationRequirementsNotMetError extends Error {
  constructor(public readonly missingRequirements: string[]) {
    super(`Service cannot be published. Missing requirements: ${missingRequirements.join(', ')}`);
    this.name = 'ServicePublicationRequirementsNotMetError';
  }
}

/**
 * Thrown when attempting to delete service with active bookings
 */
export class ServiceHasActiveBookingsError extends Error {
  constructor(serviceId: string, bookingCount: number) {
    super(`Cannot delete service ${serviceId}: has ${bookingCount} active booking(s)`);
    this.name = 'ServiceHasActiveBookingsError';
  }
}

// ============================================================================
// Category Errors
// ============================================================================

/**
 * Thrown when a category is not found
 */
export class CategoryNotFoundError extends Error {
  constructor(categoryId: string) {
    super(`Category with ID ${categoryId} not found`);
    this.name = 'CategoryNotFoundError';
  }
}

/**
 * Thrown when category slug already exists
 */
export class CategorySlugAlreadyExistsError extends Error {
  constructor(slug: string) {
    super(`Category with slug "${slug}" already exists`);
    this.name = 'CategorySlugAlreadyExistsError';
  }
}

/**
 * Thrown when attempting to create circular category hierarchy
 */
export class CircularCategoryHierarchyError extends Error {
  constructor(categoryId: string, parentId: string) {
    super(`Cannot set ${parentId} as parent of ${categoryId}: would create circular hierarchy`);
    this.name = 'CircularCategoryHierarchyError';
  }
}

// ============================================================================
// Image Upload Errors
// ============================================================================

/**
 * Thrown when image upload limit is exceeded
 */
export class ImageLimitExceededError extends Error {
  constructor(serviceId: string, maxImages: number) {
    super(`Service ${serviceId} has reached maximum image limit of ${maxImages}`);
    this.name = 'ImageLimitExceededError';
  }
}

/**
 * Thrown when invalid image format is provided
 */
export class InvalidImageFormatError extends Error {
  constructor(providedType: string, allowedTypes: readonly string[]) {
    super(`Invalid image format "${providedType}". Allowed: ${allowedTypes.join(', ')}`);
    this.name = 'InvalidImageFormatError';
  }
}

/**
 * Thrown when image file size exceeds limit
 */
export class ImageSizeExceededError extends Error {
  constructor(providedSize: number, maxSize: number) {
    super(
      `Image size ${Math.round(providedSize / 1024 / 1024)}MB exceeds maximum of ${Math.round(maxSize / 1024 / 1024)}MB`
    );
    this.name = 'ImageSizeExceededError';
  }
}

/**
 * Thrown when image metadata is not found
 */
export class ServiceImageNotFoundError extends Error {
  constructor(imageId: string) {
    super(`Service image with ID ${imageId} not found`);
    this.name = 'ServiceImageNotFoundError';
  }
}

/**
 * Thrown when S3 upload fails
 */
export class S3UploadFailedError extends Error {
  constructor(reason: string, public readonly retryable: boolean = true) {
    super(`S3 upload failed: ${reason}`);
    this.name = 'S3UploadFailedError';
  }
}

// ============================================================================
// Error Type Guards
// ============================================================================

/**
 * Check if error is a service-related error
 */
export function isServiceError(error: unknown): error is Error {
  return (
    error instanceof ServiceNotFoundError ||
    error instanceof InvalidServiceStateTransitionError ||
    error instanceof UnauthorizedServiceActionError ||
    error instanceof ServicePublicationRequirementsNotMetError ||
    error instanceof ServiceHasActiveBookingsError
  );
}

/**
 * Check if error is a category-related error
 */
export function isCategoryError(error: unknown): error is Error {
  return (
    error instanceof CategoryNotFoundError ||
    error instanceof CategorySlugAlreadyExistsError ||
    error instanceof CircularCategoryHierarchyError
  );
}

/**
 * Check if error is an image-related error
 */
export function isImageError(error: unknown): error is Error {
  return (
    error instanceof ImageLimitExceededError ||
    error instanceof InvalidImageFormatError ||
    error instanceof ImageSizeExceededError ||
    error instanceof ServiceImageNotFoundError ||
    error instanceof S3UploadFailedError
  );
}
