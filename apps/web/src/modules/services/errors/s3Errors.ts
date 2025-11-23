/**
 * Custom error classes for S3 operations
 *
 * These errors provide better context and handling for S3-specific failures
 * in the image upload workflow.
 */

/**
 * Base class for S3 operation errors
 */
export class S3OperationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'S3OperationError';

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when S3 upload fails
 */
export class S3UploadFailedError extends S3OperationError {
  constructor(message = 'Failed to upload image to S3', cause?: Error) {
    super(message, cause);
    this.name = 'S3UploadFailedError';
  }
}

/**
 * Thrown when generating presigned URL fails
 */
export class PresignedUrlGenerationError extends S3OperationError {
  constructor(message = 'Failed to generate presigned URL', cause?: Error) {
    super(message, cause);
    this.name = 'PresignedUrlGenerationError';
  }
}

/**
 * Thrown when S3 object deletion fails
 */
export class S3DeleteFailedError extends S3OperationError {
  constructor(message = 'Failed to delete image from S3', cause?: Error) {
    super(message, cause);
    this.name = 'S3DeleteFailedError';
  }
}

/**
 * Thrown when S3 object verification fails
 */
export class S3ObjectNotFoundError extends S3OperationError {
  constructor(message = 'S3 object not found', cause?: Error) {
    super(message, cause);
    this.name = 'S3ObjectNotFoundError';
  }
}

/**
 * Thrown when image size limit is exceeded
 */
export class ImageSizeLimitExceededError extends Error {
  constructor(
    public readonly maxSizeMB: number,
    public readonly actualSizeBytes: number
  ) {
    super(
      `Image size (${(actualSizeBytes / 1024 / 1024).toFixed(2)} MB) exceeds the maximum allowed size of ${maxSizeMB} MB`
    );
    this.name = 'ImageSizeLimitExceededError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when invalid MIME type is provided
 */
export class InvalidMimeTypeError extends Error {
  constructor(
    public readonly providedMimeType: string,
    public readonly allowedMimeTypes: readonly string[]
  ) {
    super(
      `Invalid MIME type "${providedMimeType}". Allowed types: ${allowedMimeTypes.join(', ')}`
    );
    this.name = 'InvalidMimeTypeError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Thrown when user doesn't own the resource
 */
export class UnauthorizedResourceAccessError extends Error {
  constructor(
    public readonly resourceType: string,
    public readonly resourceId: string,
    public readonly userId: string
  ) {
    super(`User ${userId} is not authorized to access ${resourceType} ${resourceId}`);
    this.name = 'UnauthorizedResourceAccessError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
