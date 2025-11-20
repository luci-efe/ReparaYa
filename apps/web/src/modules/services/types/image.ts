/**
 * Service Image Types and DTOs
 *
 * Type definitions for service image management including
 * upload flow, metadata, and S3 storage information.
 *
 * @module services/types/image
 */

// ============================================================================
// Service Image DTOs
// ============================================================================

/**
 * Service image metadata
 * Complete image record with S3 storage details
 */
export interface ServiceImageDTO {
  id: string;
  serviceId: string;
  s3Url: string;
  s3Key: string;
  order: number;  // Display order (0-4)
  width: number | null;
  height: number | null;
  altText: string | null;
  uploadedAt: Date;
}

/**
 * Public-safe image DTO
 * Sanitized for public catalog display
 */
export interface PublicImageDTO {
  url: string;
  altText: string | null;
  width?: number;
  height?: number;
}

/**
 * Input for requesting presigned upload URL
 * Client sends this to initiate upload flow
 */
export interface RequestUploadUrlDTO {
  fileName: string;
  fileType: string;  // MIME type: image/jpeg, image/png, image/webp
  fileSize: number;  // Bytes
}

/**
 * Response for presigned upload URL request
 * Server provides temporary S3 upload credentials
 */
export interface PresignedUploadUrlDTO {
  uploadUrl: string;  // Presigned PUT URL
  s3Key: string;      // S3 object key for confirmation
  expiresIn: number;  // Seconds until URL expires
}

/**
 * Input for confirming successful image upload
 * Client confirms upload after PUT to S3 succeeds
 */
export interface ConfirmImageUploadDTO {
  s3Key: string;
  s3Url: string;
  width?: number;
  height?: number;
  altText?: string;
}

/**
 * Input for updating image metadata
 * Allows editing order, alt text after upload
 */
export interface UpdateImageDTO {
  order?: number;
  altText?: string;
}

/**
 * Image upload validation result
 * Used internally for validation checks
 */
export interface ImageUploadValidation {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// Image Validation Constants
// ============================================================================

/**
 * Allowed MIME types for service images
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/**
 * Type for allowed MIME types
 */
export type AllowedImageMimeType = typeof ALLOWED_IMAGE_MIME_TYPES[number];

/**
 * Maximum file size for uploaded images (10 MB)
 */
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Maximum number of images per service
 */
export const MAX_IMAGES_PER_SERVICE = 5;

/**
 * Recommended minimum dimensions for images
 * Enforced client-side for quality assurance
 */
export const MIN_IMAGE_WIDTH = 800;
export const MIN_IMAGE_HEIGHT = 600;

/**
 * S3 key pattern structure
 * contractor-services/{contractorId}/{serviceId}/{uuid}.{ext}
 */
export interface S3KeyComponents {
  contractorId: string;
  serviceId: string;
  uuid: string;
  extension: string;
}
