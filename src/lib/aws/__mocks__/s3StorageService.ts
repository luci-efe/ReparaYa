/**
 * Mock Implementation of AWS S3 Storage Service
 *
 * This module provides a complete mock implementation of the IStorageService interface
 * for testing purposes. It simulates S3 operations without making actual AWS API calls.
 *
 * @module lib/aws/__mocks__/s3StorageService
 *
 * USAGE IN TESTS:
 * ```ts
 * import { createMockStorageService, mockStorageService } from '@/lib/aws/__mocks__/s3StorageService';
 *
 * describe('Service Image Upload', () => {
 *   let storage: IStorageService;
 *
 *   beforeEach(() => {
 *     storage = createMockStorageService();
 *   });
 *
 *   it('should generate presigned upload URL', async () => {
 *     const response = await storage.generatePresignedUploadUrl({
 *       bucket: 'test-bucket',
 *       key: 'contractor-services/user1/service1/abc123.jpg',
 *       contentType: 'image/jpeg',
 *       fileSizeBytes: 1024 * 1024,
 *       expirySeconds: 3600,
 *     });
 *
 *     expect(response.uploadUrl).toBeDefined();
 *     expect(response.s3Key).toBe('contractor-services/user1/service1/abc123.jpg');
 *     expect(response.expiresIn).toBe(3600);
 *   });
 * });
 * ```
 */

import {
  IStorageService,
  PresignedUploadRequest,
  PresignedUploadResponse,
  DeleteObjectRequest,
  DeleteObjectResponse,
  ObjectExistsRequest,
  ObjectExistsResponse,
} from '../s3StorageService';

/**
 * Mock file metadata stored in memory
 */
interface MockFileMetadata {
  size: number;
  contentType: string;
  lastModified: Date;
  bucket: string;
  uploadAttempts: number;
}

/**
 * Mock S3 Storage Service for Testing
 *
 * Simulates S3 operations in-memory without actual AWS API calls.
 * Useful for unit tests, integration tests, and E2E tests.
 *
 * Features:
 * - Generates realistic mock presigned URLs
 * - Tracks uploaded files in memory
 * - Simulates file deletion
 * - Simulates existence checks with metadata
 * - Builds realistic S3 keys and public URLs
 * - Can be configured to simulate failures (optional)
 * - Provides inspection methods for test assertions
 */
export class MockS3StorageService implements IStorageService {
  private mockStorage: Map<string, MockFileMetadata> = new Map();
  private mockRegion: string = 'us-west-2';
  private mockBucket: string = 'test-bucket';

  /**
   * Configuration for simulating failures
   */
  private failureConfig = {
    shouldFailPresignedUrl: false,
    shouldFailDelete: false,
    shouldFailExists: false,
  };

  constructor(bucket?: string, region?: string) {
    this.mockBucket = bucket || 'test-bucket';
    this.mockRegion = region || 'us-west-2';
  }

  /**
   * Generate a mock presigned PUT URL
   *
   * Returns a realistic mock URL that simulates what AWS would return.
   * In real implementation, this would be signed by AWS SDK.
   *
   * @param request - Upload request with bucket, key, MIME type, file size
   * @returns Mock presigned upload response
   * @throws Error if configured to simulate failure
   */
  async generatePresignedUploadUrl(
    request: PresignedUploadRequest
  ): Promise<PresignedUploadResponse> {
    if (this.failureConfig.shouldFailPresignedUrl) {
      throw new Error('Mock: Presigned URL generation failed (simulated)');
    }

    // Generate a realistic mock signed URL
    const mockSignature = Buffer.from(request.key).toString('base64');
    const mockUploadUrl = `https://${request.bucket}.s3.${this.mockRegion}.amazonaws.com/${request.key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=${mockSignature}&X-Amz-Expires=${request.expirySeconds || 3600}`;

    return {
      uploadUrl: mockUploadUrl,
      s3Key: request.key,
      expiresIn: request.expirySeconds || 3600,
    };
  }

  /**
   * Delete a mock S3 object
   *
   * @param request - Deletion request with bucket and key
   * @returns Deletion result
   * @throws Error if configured to simulate failure
   */
  async deleteObject(request: DeleteObjectRequest): Promise<DeleteObjectResponse> {
    if (this.failureConfig.shouldFailDelete) {
      throw new Error('Mock: Object deletion failed (simulated)');
    }

    this.mockStorage.delete(request.key);

    return {
      success: true,
      deletedKey: request.key,
    };
  }

  /**
   * Check if a mock S3 object exists
   *
   * @param request - Existence check request
   * @returns Existence result with optional metadata
   * @throws Error if configured to simulate failure
   */
  async objectExists(request: ObjectExistsRequest): Promise<ObjectExistsResponse> {
    if (this.failureConfig.shouldFailExists) {
      throw new Error('Mock: Object existence check failed (simulated)');
    }

    const metadata = this.mockStorage.get(request.key);

    if (metadata) {
      return {
        exists: true,
        metadata: {
          size: metadata.size,
          contentType: metadata.contentType,
          lastModified: metadata.lastModified,
        },
      };
    }

    return { exists: false };
  }

  /**
   * Build S3 object key for a service image
   *
   * Format: contractor-services/{contractorId}/{serviceId}/{uuid}.{ext}
   *
   * @param contractorId - Contractor user ID
   * @param serviceId - Service UUID
   * @param fileName - Original file name
   * @returns S3 object key path
   */
  buildServiceImageKey(contractorId: string, serviceId: string, fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    // Use a deterministic UUID-like string for testing
    const mockUuid = `mock${Math.random().toString(36).substr(2, 8)}`;
    return `contractor-services/${contractorId}/${serviceId}/${mockUuid}.${ext}`;
  }

  /**
   * Build full public URL for an S3 object
   *
   * @param bucket - S3 bucket name
   * @param key - S3 object key
   * @returns Full public URL
   */
  buildPublicUrl(bucket: string, key: string): string {
    return `https://${bucket}.s3.${this.mockRegion}.amazonaws.com/${key}`;
  }

  // ============================================================================
  // Test Helper Methods (Not part of IStorageService)
  // ============================================================================

  /**
   * Simulate uploading a file (for test setup)
   *
   * This method allows tests to set up mock files without calling generatePresignedUploadUrl.
   *
   * @param key - S3 object key
   * @param size - File size in bytes
   * @param contentType - MIME type
   * @param bucket - Optional bucket name
   *
   * @example
   * ```ts
   * storage.mockUpload('contractor-services/user1/service1/abc.jpg', 1024 * 1024, 'image/jpeg');
   * const result = await storage.objectExists({ bucket: 'test', key: '...' });
   * expect(result.exists).toBe(true);
   * ```
   */
  mockUpload(key: string, size: number, contentType: string, bucket?: string): void {
    this.mockStorage.set(key, {
      size,
      contentType,
      lastModified: new Date(),
      bucket: bucket || this.mockBucket,
      uploadAttempts: 1,
    });
  }

  /**
   * Get all mock files in storage
   *
   * Useful for test assertions and cleanup.
   *
   * @returns Array of [key, metadata] pairs
   */
  getAllMockFiles(): Array<[string, MockFileMetadata]> {
    return Array.from(this.mockStorage.entries());
  }

  /**
   * Get count of mock files in storage
   *
   * @returns Number of files
   */
  getMockFileCount(): number {
    return this.mockStorage.size;
  }

  /**
   * Clear all mock files in storage
   *
   * Useful for test cleanup.
   */
  clearMockStorage(): void {
    this.mockStorage.clear();
  }

  /**
   * Get mock file metadata
   *
   * @param key - S3 object key
   * @returns File metadata or undefined
   */
  getMockFileMetadata(key: string): MockFileMetadata | undefined {
    return this.mockStorage.get(key);
  }

  /**
   * Configure failure simulation
   *
   * Allows tests to simulate S3 failures for error handling.
   *
   * @param failures - Object with boolean flags for each failure type
   *
   * @example
   * ```ts
   * storage.setFailureConfig({
   *   shouldFailPresignedUrl: true,
   *   shouldFailDelete: false,
   *   shouldFailExists: false,
   * });
   *
   * await expect(storage.generatePresignedUploadUrl(...))
   *   .rejects
   *   .toThrow('Mock: Presigned URL generation failed');
   * ```
   */
  setFailureConfig(failures: Partial<typeof this.failureConfig>): void {
    Object.assign(this.failureConfig, failures);
  }

  /**
   * Reset failure configuration
   *
   * Disables all failure simulations.
   */
  resetFailureConfig(): void {
    this.failureConfig = {
      shouldFailPresignedUrl: false,
      shouldFailDelete: false,
      shouldFailExists: false,
    };
  }

  /**
   * Verify a key was uploaded
   *
   * Test helper for assertions.
   *
   * @param key - S3 object key to check
   * @returns true if key exists in mock storage
   */
  hasKey(key: string): boolean {
    return this.mockStorage.has(key);
  }

  /**
   * Verify file was deleted
   *
   * Test helper for assertions.
   *
   * @param key - S3 object key to check
   * @returns true if key does NOT exist in mock storage
   */
  isKeyDeleted(key: string): boolean {
    return !this.mockStorage.has(key);
  }

  /**
   * Get total size of all mock files
   *
   * Useful for testing storage quota logic.
   *
   * @returns Total size in bytes
   */
  getTotalMockStorageSize(): number {
    let total = 0;
    for (const metadata of this.mockStorage.values()) {
      total += metadata.size;
    }
    return total;
  }

  /**
   * Get mock files by prefix
   *
   * Simulates listing S3 objects by prefix.
   *
   * @param prefix - S3 key prefix to filter by
   * @returns Array of matching keys
   *
   * @example
   * ```ts
   * storage.mockUpload('contractor-services/user1/service1/abc.jpg', 1024, 'image/jpeg');
   * storage.mockUpload('contractor-services/user1/service2/def.jpg', 1024, 'image/jpeg');
   * const keys = storage.getMockFilesByPrefix('contractor-services/user1/service1/');
   * expect(keys).toContain('contractor-services/user1/service1/abc.jpg');
   * ```
   */
  getMockFilesByPrefix(prefix: string): string[] {
    return Array.from(this.mockStorage.keys()).filter((key) => key.startsWith(prefix));
  }

  /**
   * Get mock MIME type for a key
   *
   * @param key - S3 object key
   * @returns MIME type or undefined
   */
  getMockMimeType(key: string): string | undefined {
    return this.mockStorage.get(key)?.contentType;
  }
}

/**
 * Factory function to create a new mock storage service instance
 *
 * @param bucket - Optional bucket name (default: 'test-bucket')
 * @param region - Optional AWS region (default: 'us-west-2')
 * @returns New MockS3StorageService instance
 *
 * @example
 * ```ts
 * const storage = createMockStorageService('my-bucket', 'us-east-1');
 * ```
 */
export function createMockStorageService(
  bucket?: string,
  region?: string
): MockS3StorageService {
  return new MockS3StorageService(bucket, region);
}

/**
 * Singleton mock storage service instance
 *
 * Useful if you want to share mock storage across tests.
 * Be sure to clear it between tests to avoid interference.
 */
export const mockStorageService = new MockS3StorageService();

/**
 * Test utilities for common mock operations
 */
export const mockStorageTestUtils = {
  /**
   * Create a mock file upload with realistic metadata
   */
  createMockUpload(
    contractorId: string,
    serviceId: string,
    fileName: string,
    sizeKb: number = 1024
  ): { key: string; size: number; contentType: string } {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `contractor-services/${contractorId}/${serviceId}/${Math.random().toString(36).substr(2, 8)}.${ext}`;
    const contentType = getContentTypeForExtension(ext);
    const size = sizeKb * 1024;

    mockStorageService.mockUpload(key, size, contentType);

    return { key, size, contentType };
  },

  /**
   * Verify multiple files were uploaded
   */
  verifyUploads(keys: string[]): boolean {
    return keys.every((key) => mockStorageService.hasKey(key));
  },

  /**
   * Get total storage used
   */
  getTotalStorageUsed(): number {
    return mockStorageService.getTotalMockStorageSize();
  },

  /**
   * Reset mock storage (call between tests)
   */
  reset(): void {
    mockStorageService.clearMockStorage();
    mockStorageService.resetFailureConfig();
  },
};

/**
 * Helper function to get MIME type from file extension
 *
 * @param ext - File extension (without dot)
 * @returns MIME type
 */
function getContentTypeForExtension(ext: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
  };

  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}
