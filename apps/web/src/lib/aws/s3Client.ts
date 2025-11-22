import { S3Client } from '@aws-sdk/client-s3';
import { getAwsRegion } from './s3Config';

/**
 * AWS S3 Client for ReparaYa
 *
 * This module provides a configured S3Client instance for all S3 operations.
 *
 * Environment variables required:
 * - AWS_REGION: AWS region for S3 operations
 * - AWS_ACCESS_KEY_ID: AWS access key ID
 * - AWS_SECRET_ACCESS_KEY: AWS secret access key
 *
 * The client is configured with credentials from environment variables
 * and uses the region specified in s3Config.
 */

/**
 * Singleton S3Client instance
 */
let s3ClientInstance: S3Client | null = null;

/**
 * Get or create S3Client instance
 *
 * This function ensures only one S3Client instance exists (singleton pattern)
 * and validates that all required environment variables are set.
 *
 * @returns Configured S3Client instance
 * @throws Error if AWS credentials are not configured
 */
export function getS3Client(): S3Client {
  if (s3ClientInstance) {
    return s3ClientInstance;
  }

  const region = getAwsRegion();
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS credentials are not configured. ' +
      'Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.'
    );
  }

  s3ClientInstance = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientInstance;
}

/**
 * Reset S3Client instance (useful for testing)
 */
export function resetS3Client(): void {
  s3ClientInstance = null;
}

/**
 * Export default instance getter
 */
export default getS3Client;
