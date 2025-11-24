/**
 * AWS S3 Configuration for ReparaYa
 *
 * This module centralizes all S3-related configuration constants
 * used across the application for image upload functionality.
 *
 * Environment variables required:
 * - AWS_S3_BUCKET_MEDIA: S3 bucket name for media storage
 * - AWS_REGION: AWS region for S3 operations
 */

/**
 * Image size and count limits
 */
export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
export const MAX_IMAGES_PER_SERVICE = 5;

/**
 * Presigned URL expiry time (1 hour)
 * This gives users enough time to complete the upload
 */
export const PRESIGNED_URL_EXPIRY_SECONDS = 3600;

/**
 * S3 key prefix for contractor service images
 * Structure: contractor-services/{contractorId}/{serviceId}/{uuid}.{ext}
 */
export const CONTRACTOR_SERVICE_PREFIX = 'contractor-services/';

/**
 * S3 bucket name from environment
 */
export function getS3BucketName(): string {
  const bucket = process.env.AWS_S3_BUCKET_MEDIA;

  if (!bucket) {
    throw new Error(
      'AWS_S3_BUCKET_MEDIA environment variable is not configured. ' +
      'Please set it in your .env file.'
    );
  }

  return bucket;
}

/**
 * AWS region from environment
 */
export function getAwsRegion(): string {
  const region = process.env.AWS_REGION;

  if (!region) {
    throw new Error(
      'AWS_REGION environment variable is not configured. ' +
      'Please set it in your .env file.'
    );
  }

  return region;
}

/**
 * Allowed MIME types for images
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/**
 * MIME type to file extension mapping
 */
export const MIME_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Build S3 URL from bucket and key
 */
export function buildS3Url(key: string): string {
  const bucket = getS3BucketName();
  const region = getAwsRegion();
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Extract key from S3 URL
 */
export function extractS3Key(url: string): string | null {
  const regex = /\.s3\.[a-z0-9-]+\.amazonaws\.com\/(.+)$/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Validate if a URL is a valid S3 URL for our bucket
 */
export function isValidS3Url(url: string): boolean {
  const bucket = getS3BucketName();
  const regex = new RegExp(`^https://${bucket}\\.s3\\.[a-z0-9-]+\\.amazonaws\\.com/.+$`);
  return regex.test(url);
}
