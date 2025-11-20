# AWS S3 Storage Service Configuration Guide

**Module:** Contractor Services Image Upload
**Version:** 1.0.0
**Status:** Phase 5 - AWS S3 Abstraction (IMPLEMENTATION PLANNING PHASE)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Interface Definitions](#interface-definitions)
4. [Environment Variables](#environment-variables)
5. [Presigned URL Flow](#presigned-url-flow)
6. [Implementation TODO](#implementation-todo)
7. [Mock Implementation](#mock-implementation)
8. [Testing Strategy](#testing-strategy)

---

## Overview

The S3 Storage Service provides a clean abstraction layer for handling AWS S3 operations, specifically for uploading and managing service images in the ReparaYa contractor services module.

### Key Features

- **Presigned URLs**: Generate time-limited, signed URLs for direct client-side uploads
- **Security**: Credentials never exposed to client; server controls all access
- **Abstraction**: Single interface for multiple implementation strategies (AWS SDK, mocks, alternative providers)
- **Type Safety**: Full TypeScript support with comprehensive JSDoc documentation
- **Testability**: Complete mock implementation included for testing without AWS calls

### Tech Stack

- **AWS SDK**: `@aws-sdk/client-s3` (v3.620.0+) - Already installed
- **Signing**: `@aws-sdk/s3-request-presigner` (v3.620.0+) - Needed for presigned URLs
- **Runtime**: Next.js 14 (Node.js runtime for API routes)
- **Language**: TypeScript

---

## Architecture

### Presigned URL Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (React)                                                  │
│                                                                 │
│ 1. User selects image file                                     │
│ 2. Frontend validates (type, size, dimensions)                │
│ 3. Requests presigned URL from backend                        │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ POST /api/services/:id/images/upload-url
                 │ { fileName, fileType, fileSize }
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Next.js API Route)                                     │
│                                                                 │
│ 4. Authenticate user (Clerk session)                           │
│ 5. Validate ownership (user owns service)                      │
│ 6. Validate image metadata (MIME, size, count limits)         │
│ 7. Generate S3 key: contractor-services/{userId}/{serviceId}/…│
│ 8. Generate presigned PUT URL (expires in 1 hour)             │
│ 9. Return URL to client                                        │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ { uploadUrl, s3Key, expiresIn }
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (React)                                                  │
│                                                                 │
│ 10. Client uploads file directly to S3 using presigned URL    │
│     PUT {uploadUrl}                                            │
│     Content-Type: image/jpeg                                   │
│     Body: file binary data                                     │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
            ┌────────────────┐
            │  AWS S3        │
            │  (Bucket)      │
            │                │
            │ 11. Stores     │
            │ object         │
            │ at key         │
            └────────────────┘
                 │
                 │ 200 OK
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT (React)                                                  │
│                                                                 │
│ 12. Upload succeeds, call /api/services/:id/images/confirm   │
│     POST with metadata (s3Key, s3Url, width, height, altText)│
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Next.js API Route)                                     │
│                                                                 │
│ 13. Verify file exists in S3 (optional)                        │
│ 14. Save image metadata to database (ServiceImage table)       │
│ 15. Return 201 Created with image record                       │
└─────────────────────────────────────────────────────────────────┘
```

### Class Hierarchy

```
IStorageService (Interface)
├── S3StorageService (AWS SDK Implementation - NOT YET IMPLEMENTED)
└── MockS3StorageService (Testing Implementation - READY)
```

---

## Interface Definitions

### `IStorageService` (Main Contract)

Located in: `src/lib/aws/s3StorageService.ts`

```typescript
export interface IStorageService {
  /**
   * Generate a presigned PUT URL for direct client-side upload
   */
  generatePresignedUploadUrl(
    request: PresignedUploadRequest
  ): Promise<PresignedUploadResponse>;

  /**
   * Delete an object from S3
   */
  deleteObject(request: DeleteObjectRequest): Promise<DeleteObjectResponse>;

  /**
   * Check if an object exists in S3
   */
  objectExists(request: ObjectExistsRequest): Promise<ObjectExistsResponse>;

  /**
   * Build S3 object key for a service image
   */
  buildServiceImageKey(
    contractorId: string,
    serviceId: string,
    fileName: string
  ): string;

  /**
   * Build full public URL for an S3 object
   */
  buildPublicUrl(bucket: string, key: string): string;
}
```

### Type Definitions

#### `PresignedUploadRequest`

```typescript
interface PresignedUploadRequest {
  bucket: string;              // e.g., 'reparaya-media-dev'
  key: string;                 // e.g., 'contractor-services/user-123/service-456/abc123.jpg'
  contentType: string;         // e.g., 'image/jpeg'
  fileSizeBytes: number;       // File size for validation
  expirySeconds?: number;      // Default: 3600 (1 hour)
}
```

#### `PresignedUploadResponse`

```typescript
interface PresignedUploadResponse {
  uploadUrl: string;    // Signed PUT URL from AWS
  s3Key: string;        // Object key (for confirmation after upload)
  expiresIn: number;    // Expiry time in seconds
}
```

#### `DeleteObjectRequest` / `DeleteObjectResponse`

```typescript
interface DeleteObjectRequest {
  bucket: string;
  key: string;
}

interface DeleteObjectResponse {
  success: boolean;
  deletedKey: string;
}
```

#### `ObjectExistsRequest` / `ObjectExistsResponse`

```typescript
interface ObjectExistsRequest {
  bucket: string;
  key: string;
}

interface ObjectExistsResponse {
  exists: boolean;
  metadata?: {
    size: number;
    lastModified: Date;
    contentType: string;
  };
}
```

---

## Environment Variables

### Required (Must be set before using real S3)

```bash
# AWS Region
AWS_REGION=us-west-2

# IAM User Credentials (from step 2 of AWS setup)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalr...

# S3 Bucket Name (changes per environment)
AWS_S3_BUCKET_MEDIA=reparaya-media-dev
```

### Optional (Can be hardcoded or made configurable)

```bash
# Presigned URL Expiry (seconds, default: 3600 = 1 hour)
AWS_S3_PRESIGNED_URL_EXPIRY_SECONDS=3600

# Image Size Limits (MB, default: 10 MB)
AWS_S3_MAX_IMAGE_SIZE_MB=10

# Images per Service (default: 5)
AWS_S3_MAX_IMAGES_PER_SERVICE=5

# S3 Key Prefix for Organization (default: contractor-services/)
AWS_S3_CONTRACTOR_SERVICE_PREFIX=contractor-services/

# CloudFront CDN Domain (optional, for CDN-based public URLs)
AWS_CLOUDFRONT_DOMAIN=d123.cloudfront.net
```

### Configuration by Environment

**Development (.env.local)**

```bash
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA_DEV_...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_MEDIA=reparaya-media-dev
AWS_S3_PRESIGNED_URL_EXPIRY_SECONDS=3600
AWS_S3_MAX_IMAGE_SIZE_MB=10
```

**Staging (.env.staging)**

```bash
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA_STAGING_...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_MEDIA=reparaya-media-staging
```

**Production (.env.production)**

```bash
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=AKIA_PROD_...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET_MEDIA=reparaya-media-prod
```

---

## Presigned URL Flow

### Step 1: Frontend Requests Upload Permission

```typescript
// Frontend: React component
async function requestUploadUrl(serviceId: string, file: File) {
  const response = await fetch(`/api/services/${serviceId}/images/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get upload URL');
  }

  return response.json(); // { uploadUrl, s3Key, expiresIn }
}
```

### Step 2: Backend Validates and Generates Presigned URL

```typescript
// Backend: API route /api/services/[id]/images/upload-url
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // 1. Authenticate user
    const user = await requireRole('CONTRACTOR');

    // 2. Validate ownership
    const service = await serviceService.getService(params.id, user.id);
    if (service.contractorId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 3. Validate request body
    const body = await request.json();
    const validated = requestUploadUrlSchema.parse(body);

    // 4. Validate image count limit
    const currentImageCount = await imageRepository.countByServiceId(params.id);
    if (currentImageCount >= 5) {
      return NextResponse.json(
        { error: 'Maximum 5 images allowed' },
        { status: 400 }
      );
    }

    // 5. Build S3 key
    const storageService = getStorageService();
    const s3Key = storageService.buildServiceImageKey(
      user.id,
      params.id,
      validated.fileName
    );

    // 6. Generate presigned URL
    const presignedUrl = await storageService.generatePresignedUploadUrl({
      bucket: process.env.AWS_S3_BUCKET_MEDIA!,
      key: s3Key,
      contentType: validated.fileType,
      fileSizeBytes: validated.fileSize,
      expirySeconds: 3600,
    });

    return NextResponse.json(presignedUrl, { status: 200 });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Step 3: Frontend Uploads Directly to S3

```typescript
// Frontend: Direct upload to S3
async function uploadFileToS3(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file to S3');
  }

  return { success: true };
}
```

### Step 4: Frontend Confirms Upload to Backend

```typescript
// Frontend: Confirm upload and save metadata
async function confirmUpload(serviceId: string, s3Key: string, file: File) {
  const s3Url = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${s3Key}`;

  const response = await fetch(`/api/services/${serviceId}/images/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      s3Key,
      s3Url,
      width: 1200,  // Get from image dimensions
      height: 900,
      altText: 'Service image',
    }),
  });

  return response.json();
}
```

---

## Implementation TODO

### Phase 1: AWS SDK Integration

- [ ] Install `@aws-sdk/s3-request-presigner` if not already present
- [ ] Create `src/lib/aws/s3Client.ts` with S3Client initialization
- [ ] Implement `S3StorageService.generatePresignedUploadUrl()`
  - [ ] Use `PutObjectCommand` with metadata
  - [ ] Use `getSignedUrl()` to generate signed URL
  - [ ] Set expiry from `expirySeconds` parameter
  - [ ] Return response with URL, key, and expiry
- [ ] Implement `S3StorageService.deleteObject()`
  - [ ] Use `DeleteObjectCommand`
  - [ ] Handle `NoSuchKey` errors gracefully
- [ ] Implement `S3StorageService.objectExists()`
  - [ ] Use `HeadObjectCommand`
  - [ ] Extract metadata (size, ContentType, LastModified)
  - [ ] Handle `NotFound` exceptions
- [ ] Implement `S3StorageService.buildServiceImageKey()`
  - [ ] Generate UUID using `crypto.randomUUID()`
  - [ ] Sanitize file extension (alphanumeric only)
  - [ ] Format: `contractor-services/{contractorId}/{serviceId}/{uuid}.{ext}`
- [ ] Implement `S3StorageService.buildPublicUrl()`
  - [ ] Support direct S3 URL: `https://{bucket}.s3.{region}.amazonaws.com/{key}`
  - [ ] Support CloudFront CDN if `AWS_CLOUDFRONT_DOMAIN` is set

### Phase 2: Error Handling & Resilience

- [ ] Add custom error classes (e.g., `S3UploadFailedError`)
- [ ] Implement retry logic with exponential backoff
  - [ ] Retry transient errors (timeout, throttle)
  - [ ] Don't retry permanent errors (auth, validation)
  - [ ] Max 3 retries
- [ ] Add request timeout (5 seconds)
- [ ] Add logging/telemetry
  - [ ] Log successful uploads (key, size, duration)
  - [ ] Log failures with error details
  - [ ] Track metrics (latency P95/P99)
- [ ] Validate environment variables on startup

### Phase 3: Validation

- [ ] Validate MIME types (only `image/jpeg`, `image/png`, `image/webp`)
- [ ] Validate file sizes (max 10 MB)
- [ ] Sanitize file names (remove special chars, preserve extension)
- [ ] Validate S3 key format

### Phase 4: Testing & Documentation

- [ ] Create unit tests for AWS SDK implementation
  - [ ] Mock AWS SDK responses
  - [ ] Test presigned URL generation
  - [ ] Test error handling
- [ ] Create integration tests against test AWS account
  - [ ] Actually upload to S3 test bucket
  - [ ] Verify files can be downloaded
  - [ ] Clean up test files
- [ ] Update JSDoc comments with actual implementation details
- [ ] Create API documentation for image upload endpoints

---

## Mock Implementation

### Location

`src/lib/aws/__mocks__/s3StorageService.ts`

### Features

- **Complete IStorageService implementation** for testing
- **In-memory storage** using Map (no actual S3 calls)
- **Realistic mock URLs** that simulate AWS responses
- **Configurable failure simulation** for testing error handling
- **Test helper methods** for assertions

### Usage Example

```typescript
import { createMockStorageService } from '@/lib/aws/__mocks__/s3StorageService';

describe('Service Image Upload', () => {
  let storage: IStorageService;

  beforeEach(() => {
    // Create fresh mock for each test
    storage = createMockStorageService('test-bucket', 'us-west-2');
  });

  it('should generate presigned upload URL', async () => {
    const response = await storage.generatePresignedUploadUrl({
      bucket: 'test-bucket',
      key: 'contractor-services/user1/service1/abc123.jpg',
      contentType: 'image/jpeg',
      fileSizeBytes: 1024 * 1024,
      expirySeconds: 3600,
    });

    expect(response.uploadUrl).toContain('test-bucket');
    expect(response.uploadUrl).toContain('abc123.jpg');
    expect(response.s3Key).toBe('contractor-services/user1/service1/abc123.jpg');
    expect(response.expiresIn).toBe(3600);
  });

  it('should simulate file upload', () => {
    const key = 'contractor-services/user1/service1/abc123.jpg';
    storage.mockUpload(key, 1024 * 1024, 'image/jpeg');

    expect(storage.hasKey(key)).toBe(true);
    expect(storage.getMockFileMetadata(key)?.size).toBe(1024 * 1024);
  });

  it('should simulate failure', async () => {
    // Configure mock to simulate failure
    storage.setFailureConfig({ shouldFailPresignedUrl: true });

    await expect(
      storage.generatePresignedUploadUrl({
        bucket: 'test-bucket',
        key: 'test.jpg',
        contentType: 'image/jpeg',
        fileSizeBytes: 1024,
      })
    ).rejects.toThrow('Mock: Presigned URL generation failed');
  });
});
```

### Helper Methods

```typescript
// Verify file was uploaded
storage.hasKey(key);

// Get file metadata
storage.getMockFileMetadata(key);

// Get all files by prefix
storage.getMockFilesByPrefix('contractor-services/user1/');

// Clear storage between tests
storage.clearMockStorage();

// Get total storage size
storage.getTotalMockStorageSize();

// Utility functions
mockStorageTestUtils.createMockUpload(contractorId, serviceId, fileName);
mockStorageTestUtils.verifyUploads(keys);
mockStorageTestUtils.reset();
```

---

## Testing Strategy

### Unit Tests

Location: `src/modules/services/__tests__/s3StorageService.test.ts`

```typescript
describe('S3StorageService', () => {
  describe('generatePresignedUploadUrl', () => {
    it('should generate URL with correct format', async () => {
      // Test URL structure, signature, expiry
    });

    it('should reject oversized files', async () => {
      // Test validation
    });

    it('should handle invalid MIME types', async () => {
      // Test validation
    });

    it('should retry on transient errors', async () => {
      // Test retry logic
    });

    it('should not retry on permanent errors', async () => {
      // Test that auth errors don't retry
    });
  });

  describe('deleteObject', () => {
    it('should delete existing object', async () => {
      // Test successful deletion
    });

    it('should handle non-existent object', async () => {
      // Test handling of NotFound
    });
  });

  describe('objectExists', () => {
    it('should return metadata for existing object', async () => {
      // Test metadata extraction
    });

    it('should return false for non-existent object', async () => {
      // Test non-existent handling
    });
  });

  describe('buildServiceImageKey', () => {
    it('should format key correctly', () => {
      const key = service.buildServiceImageKey('user1', 'service1', 'photo.jpg');
      expect(key).toMatch(/contractor-services\/user1\/service1\/[a-z0-9]+\.jpg/);
    });
  });
});
```

### Integration Tests

Location: `tests/integration/api/services-images.test.ts`

```typescript
describe('POST /api/services/:id/images/upload-url', () => {
  it('should generate presigned URL for authenticated contractor', async () => {
    // Test full flow with Clerk auth
  });

  it('should reject non-contractor users', async () => {
    // Test authorization
  });

  it('should validate service ownership', async () => {
    // Test ownership check
  });

  it('should enforce image count limit', async () => {
    // Test max 5 images per service
  });

  it('should validate MIME types', async () => {
    // Test type validation
  });

  it('should validate file sizes', async () => {
    // Test size validation
  });
});

describe('POST /api/services/:id/images/confirm', () => {
  it('should save image metadata to database', async () => {
    // Test metadata storage
  });

  it('should verify file exists in S3', async () => {
    // Test object existence check
  });
});

describe('DELETE /api/services/:id/images/:imageId', () => {
  it('should delete image from S3 and database', async () => {
    // Test deletion
  });

  it('should only allow service owner or admin', async () => {
    // Test authorization
  });
});
```

### E2E Tests

Location: `tests/e2e/services-image-upload.spec.ts`

```typescript
test('Service image upload flow', async ({ page }) => {
  // 1. Navigate to contractor dashboard
  // 2. Open service creation form
  // 3. Upload image via drag-and-drop
  // 4. Verify upload progress
  // 5. Confirm image appears in form
  // 6. Submit form
  // 7. Verify image displays on published service
});
```

---

## Next Steps

1. **Review and Approve**: Share this documentation with team
2. **Set Up AWS**: Follow steps in `docs/guias/aws-s3-integracion-imagenes.md`
3. **Implement S3StorageService**: Follow Phase 1-4 TODO items
4. **Write Tests**: Implement unit, integration, and E2E tests
5. **Update STP**: Add test cases to `/docs/md/STP-ReparaYa.md`
6. **Deploy & Monitor**: Deploy to staging, then production

---

## References

- [AWS S3 Presigned URLs Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [AWS SDK v3 for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [ReparaYa AWS S3 Integration Guide](../../../docs/guias/aws-s3-integracion-imagenes.md)
- [ReparaYa Project Architecture](../../../openspec/project.md)
