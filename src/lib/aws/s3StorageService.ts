/**
 * AWS S3 Storage Service (Abstraction Layer)
 *
 * This file defines the interface for S3 storage operations.
 * The actual implementation will be completed once AWS resources are provisioned.
 *
 * @module lib/aws/s3StorageService
 *
 * TODO: Implement actual AWS SDK integration
 * TODO: Add retry logic with exponential backoff
 * TODO: Add telemetry/logging for upload operations
 * TODO: Implement cleanup job for orphaned files
 *
 * ENVIRONMENT VARIABLES REQUIRED (document in .env.example, DO NOT add to code yet):
 * - AWS_REGION: AWS region (e.g., 'us-west-2')
 * - AWS_ACCESS_KEY_ID: IAM user access key
 * - AWS_SECRET_ACCESS_KEY: IAM user secret key
 * - AWS_S3_BUCKET_MEDIA: S3 bucket name for media storage (e.g., 'reparaya-media-dev')
 * - AWS_S3_PRESIGNED_URL_EXPIRY_SECONDS: Presigned URL expiry time (default: 3600)
 * - AWS_S3_MAX_IMAGE_SIZE_MB: Max image file size in MB (default: 10)
 * - AWS_S3_MAX_IMAGES_PER_SERVICE: Max images per service (default: 5)
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Metadata for requesting a presigned upload URL
 */
export interface PresignedUploadRequest {
  /** Destination bucket (e.g., 'reparaya-media-dev') */
  bucket: string;
  /** S3 object key (path within bucket) */
  key: string;
  /** MIME type (e.g., 'image/jpeg') */
  contentType: string;
  /** File size in bytes (for validation) */
  fileSizeBytes: number;
  /** Expiry time in seconds (default: 3600) */
  expirySeconds?: number;
}

/**
 * Response containing presigned upload URL
 */
export interface PresignedUploadResponse {
  /** Presigned PUT URL for client-side upload */
  uploadUrl: string;
  /** S3 object key (for confirmation after upload) */
  s3Key: string;
  /** Expiry time in seconds */
  expiresIn: number;
}

/**
 * Metadata for deleting an S3 object
 */
export interface DeleteObjectRequest {
  /** Source bucket */
  bucket: string;
  /** S3 object key to delete */
  key: string;
}

/**
 * Result of S3 object deletion
 */
export interface DeleteObjectResponse {
  /** Whether deletion succeeded */
  success: boolean;
  /** S3 object key that was deleted */
  deletedKey: string;
}

/**
 * Metadata for checking if an object exists
 */
export interface ObjectExistsRequest {
  /** Source bucket */
  bucket: string;
  /** S3 object key to check */
  key: string;
}

/**
 * Result of object existence check
 */
export interface ObjectExistsResponse {
  /** Whether object exists */
  exists: boolean;
  /** Object metadata if exists */
  metadata?: {
    size: number;
    lastModified: Date;
    contentType: string;
  };
}

// ============================================================================
// Storage Service Interface
// ============================================================================

/**
 * Abstract interface for S3 storage operations
 *
 * This interface defines the contract for S3 operations. Implementations
 * can use AWS SDK, mocks for testing, or alternative storage providers.
 */
export interface IStorageService {
  /**
   * Generate a presigned PUT URL for direct client-side upload
   *
   * @param request - Upload request metadata
   * @returns Presigned upload URL and metadata
   * @throws {S3UploadFailedError} If URL generation fails
   *
   * @example
   * ```ts
   * const response = await storageService.generatePresignedUploadUrl({
   *   bucket: 'reparaya-media-dev',
   *   key: 'contractor-services/user-123/service-456/uuid-789.jpg',
   *   contentType: 'image/jpeg',
   *   fileSizeBytes: 3145728,
   *   expirySeconds: 3600,
   * });
   * console.log(response.uploadUrl); // Use for client-side upload
   * ```
   */
  generatePresignedUploadUrl(request: PresignedUploadRequest): Promise<PresignedUploadResponse>;

  /**
   * Delete an object from S3
   *
   * @param request - Deletion request metadata
   * @returns Deletion result
   * @throws {S3UploadFailedError} If deletion fails
   *
   * @example
   * ```ts
   * const result = await storageService.deleteObject({
   *   bucket: 'reparaya-media-dev',
   *   key: 'contractor-services/user-123/service-456/uuid-789.jpg',
   * });
   * console.log(result.success); // true
   * ```
   */
  deleteObject(request: DeleteObjectRequest): Promise<DeleteObjectResponse>;

  /**
   * Check if an object exists in S3
   *
   * @param request - Existence check request
   * @returns Existence result with optional metadata
   *
   * @example
   * ```ts
   * const result = await storageService.objectExists({
   *   bucket: 'reparaya-media-dev',
   *   key: 'contractor-services/user-123/service-456/uuid-789.jpg',
   * });
   * if (result.exists) {
   *   console.log('File size:', result.metadata?.size);
   * }
   * ```
   */
  objectExists(request: ObjectExistsRequest): Promise<ObjectExistsResponse>;

  /**
   * Build S3 object key (path) for a service image
   *
   * @param contractorId - Contractor user ID
   * @param serviceId - Service UUID
   * @param fileName - Original file name (will be sanitized and add UUID)
   * @returns S3 object key (e.g., 'contractor-services/user-123/service-456/uuid.jpg')
   *
   * @example
   * ```ts
   * const key = storageService.buildServiceImageKey(
   *   'user-123',
   *   'service-456',
   *   'my-photo.jpg'
   * );
   * console.log(key); // contractor-services/user-123/service-456/f47ac10b.jpg
   * ```
   */
  buildServiceImageKey(contractorId: string, serviceId: string, fileName: string): string;

  /**
   * Build full public URL for an S3 object
   *
   * @param bucket - S3 bucket name
   * @param key - S3 object key
   * @returns Full public URL (or CloudFront URL if CDN configured)
   *
   * @example
   * ```ts
   * const url = storageService.buildPublicUrl(
   *   'reparaya-media-dev',
   *   'contractor-services/user-123/service-456/f47ac10b.jpg'
   * );
   * console.log(url); // https://reparaya-media-dev.s3.us-west-2.amazonaws.com/...
   * ```
   */
  buildPublicUrl(bucket: string, key: string): string;
}

// ============================================================================
// TODO: AWS SDK Implementation
// ============================================================================

/**
 * AWS S3 Storage Service Implementation
 *
 * TODO: Implement this class once AWS resources are provisioned
 *
 * Implementation checklist:
 * - [ ] Install @aws-sdk/client-s3 (already installed)
 * - [ ] Install @aws-sdk/s3-request-presigner
 * - [ ] Configure S3Client with credentials from env vars
 * - [ ] Implement generatePresignedUploadUrl using PutObjectCommand + getSignedUrl
 * - [ ] Implement deleteObject using DeleteObjectCommand
 * - [ ] Implement objectExists using HeadObjectCommand
 * - [ ] Add retry logic with exponential backoff (3 retries)
 * - [ ] Add request timeout (5 seconds)
 * - [ ] Add logging/telemetry for all operations
 * - [ ] Validate MIME types and file sizes
 * - [ ] Sanitize file names (remove special chars, preserve extension)
 * - [ ] Generate UUID for unique file names
 * - [ ] Handle AWS SDK errors and map to custom errors
 */
export class S3StorageService implements IStorageService {
  // TODO: Inject S3Client via constructor
  // private s3Client: S3Client;

  constructor() {
    // TODO: Initialize S3Client
    // this.s3Client = new S3Client({
    //   region: process.env.AWS_REGION || 'us-west-2',
    //   credentials: {
    //     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    //     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    //   },
    // });

    throw new Error('S3StorageService not yet implemented. See TODO comments in this file.');
  }

  async generatePresignedUploadUrl(
    request: PresignedUploadRequest
  ): Promise<PresignedUploadResponse> {
    // TODO: Implement presigned URL generation
    // const command = new PutObjectCommand({
    //   Bucket: request.bucket,
    //   Key: request.key,
    //   ContentType: request.contentType,
    // });
    // const url = await getSignedUrl(this.s3Client, command, {
    //   expiresIn: request.expirySeconds || 3600,
    // });
    // return { uploadUrl: url, s3Key: request.key, expiresIn: request.expirySeconds || 3600 };

    throw new Error('generatePresignedUploadUrl not yet implemented');
  }

  async deleteObject(request: DeleteObjectRequest): Promise<DeleteObjectResponse> {
    // TODO: Implement object deletion
    // const command = new DeleteObjectCommand({
    //   Bucket: request.bucket,
    //   Key: request.key,
    // });
    // await this.s3Client.send(command);
    // return { success: true, deletedKey: request.key };

    throw new Error('deleteObject not yet implemented');
  }

  async objectExists(request: ObjectExistsRequest): Promise<ObjectExistsResponse> {
    // TODO: Implement object existence check
    // try {
    //   const command = new HeadObjectCommand({
    //     Bucket: request.bucket,
    //     Key: request.key,
    //   });
    //   const response = await this.s3Client.send(command);
    //   return {
    //     exists: true,
    //     metadata: {
    //       size: response.ContentLength || 0,
    //       lastModified: response.LastModified || new Date(),
    //       contentType: response.ContentType || '',
    //     },
    //   };
    // } catch (error: any) {
    //   if (error.name === 'NotFound') {
    //     return { exists: false };
    //   }
    //   throw error;
    // }

    throw new Error('objectExists not yet implemented');
  }

  buildServiceImageKey(contractorId: string, serviceId: string, fileName: string): string {
    // TODO: Implement S3 key generation
    // const uuid = crypto.randomUUID().split('-')[0]; // First segment of UUID
    // const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    // const sanitizedFileName = `${uuid}.${ext}`;
    // return `contractor-services/${contractorId}/${serviceId}/${sanitizedFileName}`;

    throw new Error('buildServiceImageKey not yet implemented');
  }

  buildPublicUrl(bucket: string, key: string): string {
    // TODO: Implement public URL generation
    // Option 1: Direct S3 URL
    // const region = process.env.AWS_REGION || 'us-west-2';
    // return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    //
    // Option 2: CloudFront URL (if CDN configured)
    // const cdnDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    // if (cdnDomain) {
    //   return `https://${cdnDomain}/${key}`;
    // }

    throw new Error('buildPublicUrl not yet implemented');
  }
}

// ============================================================================
// Mock Storage Service (for Testing)
// ============================================================================

/**
 * Mock storage service for unit tests
 *
 * Use this in tests to avoid actual S3 calls
 */
export class MockStorageService implements IStorageService {
  private mockStorage: Map<string, { size: number; contentType: string; lastModified: Date }> =
    new Map();

  async generatePresignedUploadUrl(
    request: PresignedUploadRequest
  ): Promise<PresignedUploadResponse> {
    return {
      uploadUrl: `https://mock-s3.example.com/${request.key}?signature=mock`,
      s3Key: request.key,
      expiresIn: request.expirySeconds || 3600,
    };
  }

  async deleteObject(request: DeleteObjectRequest): Promise<DeleteObjectResponse> {
    this.mockStorage.delete(request.key);
    return {
      success: true,
      deletedKey: request.key,
    };
  }

  async objectExists(request: ObjectExistsRequest): Promise<ObjectExistsResponse> {
    const metadata = this.mockStorage.get(request.key);
    if (metadata) {
      return {
        exists: true,
        metadata,
      };
    }
    return { exists: false };
  }

  buildServiceImageKey(contractorId: string, serviceId: string, fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    return `contractor-services/${contractorId}/${serviceId}/mock-uuid.${ext}`;
  }

  buildPublicUrl(bucket: string, key: string): string {
    return `https://mock-cdn.example.com/${key}`;
  }

  // Test helper: simulate uploaded file
  mockUpload(key: string, size: number, contentType: string) {
    this.mockStorage.set(key, {
      size,
      contentType,
      lastModified: new Date(),
    });
  }
}

// ============================================================================
// Singleton Instance (to be replaced with DI)
// ============================================================================

/**
 * Singleton storage service instance
 *
 * TODO: Replace with dependency injection once AWS is configured
 */
let storageServiceInstance: IStorageService | null = null;

export function getStorageService(): IStorageService {
  if (!storageServiceInstance) {
    // TODO: Initialize real S3StorageService once AWS is configured
    // For now, throw error to remind implementer
    throw new Error(
      'Storage service not initialized. Please implement S3StorageService or use MockStorageService in tests.'
    );
  }
  return storageServiceInstance;
}

/**
 * Set storage service instance (for testing or initialization)
 */
export function setStorageService(service: IStorageService) {
  storageServiceInstance = service;
}
