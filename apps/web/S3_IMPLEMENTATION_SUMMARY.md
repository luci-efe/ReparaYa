# AWS S3 Image Upload Implementation Summary

## Overview

This document summarizes the implementation of AWS S3 image upload functionality with presigned URLs for the ReparaYa contractor services module.

## Files Created/Modified

### 1. AWS Configuration & Client

#### `/apps/web/src/lib/aws/s3Config.ts`
**Purpose:** Centralized S3 configuration and constants

**Exports:**
- `MAX_IMAGE_SIZE_MB` = 10
- `MAX_IMAGE_SIZE_BYTES` = 10,485,760 (10 MB)
- `MAX_IMAGES_PER_SERVICE` = 5
- `PRESIGNED_URL_EXPIRY_SECONDS` = 3600 (1 hour)
- `CONTRACTOR_SERVICE_PREFIX` = 'contractor-services/'
- `ALLOWED_IMAGE_MIME_TYPES` = ['image/jpeg', 'image/png', 'image/webp']
- `MIME_TYPE_TO_EXTENSION` mapping object
- `getS3BucketName()`: Gets bucket from `AWS_S3_BUCKET_MEDIA` env var
- `getAwsRegion()`: Gets region from `AWS_REGION` env var
- `buildS3Url(key)`: Constructs full S3 URL from key
- `extractS3Key(url)`: Extracts key from S3 URL
- `isValidS3Url(url)`: Validates S3 URL format

#### `/apps/web/src/lib/aws/s3Client.ts`
**Purpose:** Singleton S3Client instance manager

**Exports:**
- `getS3Client()`: Returns configured S3Client (singleton pattern)
- `resetS3Client()`: Resets instance (useful for testing)

**Required Environment Variables:**
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

#### `/apps/web/src/lib/aws/index.ts`
**Purpose:** Barrel export for AWS utilities

---

### 2. Error Classes

#### `/apps/web/src/modules/services/errors/s3Errors.ts`
**Purpose:** Custom error classes for S3 operations

**Error Classes:**
- `S3OperationError`: Base class for S3 errors
- `S3UploadFailedError`: Upload failures
- `PresignedUrlGenerationError`: Presigned URL generation failures
- `S3DeleteFailedError`: Deletion failures
- `S3ObjectNotFoundError`: Object not found
- `ImageSizeLimitExceededError`: File size exceeds limit
- `InvalidMimeTypeError`: Invalid MIME type provided
- `UnauthorizedResourceAccessError`: User doesn't own resource

#### `/apps/web/src/modules/services/errors/index.ts`
**Modified:** Re-exports S3 errors for convenience

---

### 3. Repository Layer

#### `/apps/web/src/modules/services/repositories/serviceImageRepository.ts`
**Purpose:** Database access for ServiceImage model

**Methods:**
- `create(data)`: Create new service image record
- `findByServiceId(serviceId)`: Get all images for a service (ordered)
- `deleteById(id)`: Delete image by ID
- `updateOrder(id, order)`: Update image order
- `updateAltText(id, altText)`: Update image alt text

**DTO:**
- `ServiceImageDTO`: Return type with all image fields

---

### 4. Service Layer

#### `/apps/web/src/modules/services/services/imageUploadService.ts`
**Purpose:** Business logic for image upload operations

**Main Methods:**

##### `generatePresignedUploadUrl(serviceId, contractorId, fileName, mimeType, fileSize)`
Generates a presigned URL for client-side uploads.

**Flow:**
1. Validates contractor owns the service
2. Checks image count < 5
3. Validates file size (max 10 MB)
4. Validates MIME type (jpeg, png, webp only)
5. Generates S3 key: `contractor-services/{contractorId}/{serviceId}/{uuid}.{ext}`
6. Creates presigned URL with 1-hour expiry
7. Returns presigned URL, S3 key, and expiry date

**Returns:** `ImageUploadResponseDTO`
```typescript
{
  presignedUrl: string;
  s3Key: string;
  expiresAt: Date;
}
```

##### `confirmImageUpload(serviceId, contractorId, data)`
Confirms upload and saves metadata to database.

**Flow:**
1. Validates contractor owns the service
2. Optionally verifies S3 object exists (HEAD request)
3. Gets next order position
4. Saves image metadata to database

**Input:** `ImageUploadConfirmDTO`
```typescript
{
  s3Key: string;
  s3Url: string;
  width?: number;
  height?: number;
  altText?: string;
}
```

**Returns:** `ServiceImageDTO`

##### `deleteImage(serviceId, imageId, contractorId)`
Deletes image from both S3 and database.

**Flow:**
1. Gets image from database
2. Validates contractor owns the service
3. Deletes from S3 using DeleteObjectCommand
4. Deletes from database

##### Additional Methods:
- `getServiceImages(serviceId)`: Get all images for service
- `updateImageAltText(serviceId, imageId, contractorId, altText)`: Update alt text
- `reorderImages(serviceId, contractorId, imageIds)`: Reorder images

**Private Methods:**
- `validateServiceOwnership(serviceId, contractorId)`: Validates ownership
- `verifyS3ObjectExists(s3Key)`: Optional S3 verification

---

### 5. Type Definitions

#### `/apps/web/src/modules/services/types/image.ts`
**Modified:** Added `ServiceImageDTO` type

**Types:**
- `ImageUploadRequestDTO`: Client request for presigned URL
- `ImageUploadResponseDTO`: Response with presigned URL
- `ImageUploadConfirmDTO`: Confirmation after upload
- `ServiceImageDTO`: Complete image data
- `ImageCreateInput`: Repository input
- `AllowedImageMimeType`: Type-safe MIME types
- `IMAGE_LIMITS`: Constants object

---

## S3 Key Structure

Images are stored with the following key pattern:
```
contractor-services/{contractorId}/{serviceId}/{uuid}.{extension}
```

**Example:**
```
contractor-services/abc123-def456/service-789/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpg
```

This structure:
- Organizes images by contractor and service
- Uses UUIDs to prevent naming conflicts
- Maintains proper extension for content type

---

## Security Measures

### 1. Presigned URLs
- **Expiry:** 1 hour (configurable via `PRESIGNED_URL_EXPIRY_SECONDS`)
- **Purpose:** Allows direct client-to-S3 upload without exposing AWS credentials
- **Scope:** Limited to specific S3 key and content type

### 2. Ownership Validation
- Every operation validates contractor owns the service
- Uses database query to verify `service.contractorId === contractorId`
- Throws `UnauthorizedResourceAccessError` if validation fails

### 3. Input Validation
- **File Size:** Max 10 MB (configurable)
- **MIME Type:** Only jpeg, png, webp allowed
- **Image Count:** Max 5 per service
- Uses Zod schemas in validators for runtime validation

### 4. S3 Metadata
Presigned URLs include metadata for tracking:
```typescript
{
  'contractor-id': contractorId,
  'service-id': serviceId,
  'original-filename': fileName,
}
```

---

## Environment Variables Required

Add to `.env.local` or `.env`:

```bash
# AWS Credentials (already in .env.example)
AWS_REGION="us-west-2"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."

# AWS S3 Bucket (already in .env.example)
AWS_S3_BUCKET_MEDIA="reparaya-media-dev"
```

---

## Dependencies Installed

```bash
npm install uuid @types/uuid @aws-sdk/s3-request-presigner
```

**Packages:**
- `uuid@^9.0.0`: Generate unique file names
- `@types/uuid@^9.0.0`: TypeScript types for uuid
- `@aws-sdk/s3-request-presigner@^3.620.0`: Generate presigned URLs
- `@aws-sdk/client-s3@^3.620.0`: (already installed) S3 operations

---

## Integration with Repository

The `ImageUploadService` integrates with the existing `serviceImageRepository`:

```typescript
import { serviceImageRepository } from '../repositories/serviceImageRepository';

// Count images
const images = await serviceImageRepository.findByServiceId(serviceId);

// Save image
const savedImage = await serviceImageRepository.create({
  serviceId,
  s3Url,
  s3Key,
  order,
  width,
  height,
  altText,
});

// Delete image
await serviceImageRepository.deleteById(imageId);
```

---

## Error Handling

All S3 operations are wrapped in try-catch blocks:

```typescript
try {
  // S3 operation
} catch (error) {
  if (error instanceof KnownError) {
    throw error; // Re-throw known errors
  }

  // Wrap unknown errors
  console.error('[ImageUploadService] Error:', error);
  throw new S3OperationError('Operation failed', error as Error);
}
```

**Error Types:**
- `PresignedUrlGenerationError`: URL generation failed
- `S3DeleteFailedError`: Deletion failed
- `S3ObjectNotFoundError`: Object doesn't exist
- `ImageSizeLimitExceededError`: File too large
- `MaxImagesExceededError`: Too many images
- `InvalidMimeTypeError`: Wrong file type
- `UnauthorizedResourceAccessError`: Not authorized

---

## Usage Example

### 1. Generate Presigned URL

```typescript
import { imageUploadService } from '@/modules/services/services';

const result = await imageUploadService.generatePresignedUploadUrl(
  'service-123',      // serviceId
  'contractor-456',   // contractorId
  'photo.jpg',        // fileName
  'image/jpeg',       // mimeType
  2_500_000          // fileSize (2.5 MB)
);

// Returns:
// {
//   presignedUrl: 'https://reparaya-media-dev.s3.us-west-2.amazonaws.com/...',
//   s3Key: 'contractor-services/contractor-456/service-123/uuid.jpg',
//   expiresAt: Date('2024-01-01T13:00:00Z')
// }
```

### 2. Client-Side Upload

```typescript
// Client uploads directly to S3 using presigned URL
const response = await fetch(result.presignedUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': 'image/jpeg',
  },
  body: imageFile,
});
```

### 3. Confirm Upload

```typescript
const savedImage = await imageUploadService.confirmImageUpload(
  'service-123',
  'contractor-456',
  {
    s3Key: result.s3Key,
    s3Url: 'https://reparaya-media-dev.s3.us-west-2.amazonaws.com/...',
    width: 1920,
    height: 1080,
    altText: 'Professional plumbing work',
  }
);
```

### 4. Delete Image

```typescript
await imageUploadService.deleteImage(
  'service-123',
  'image-id',
  'contractor-456'
);
```

---

## Testing Considerations

### Unit Tests
- Mock S3Client using `aws-sdk-client-mock`
- Mock Prisma client for repository tests
- Test error cases (oversized files, wrong MIME types, etc.)

### Integration Tests
- Use AWS S3 in test mode or LocalStack
- Test full upload flow
- Verify S3 object creation and deletion

### Security Tests
- Verify ownership validation
- Test unauthorized access attempts
- Verify presigned URL expiry

---

## Performance Considerations

### 1. Presigned URLs
- Upload happens directly from client to S3
- No data passes through Next.js server
- Reduces server bandwidth and processing

### 2. Database Queries
- Uses indexed `serviceId` for image lookups
- Minimal data transfer (only metadata)

### 3. S3 Operations
- Asynchronous operations with proper error handling
- Exponential backoff for retries (can be added)

---

## Future Enhancements

1. **Image Processing:**
   - Add thumbnail generation
   - Automatic image optimization
   - WebP conversion

2. **Validation:**
   - Image dimension validation
   - Aspect ratio requirements
   - Content-based validation (not just MIME type)

3. **CDN Integration:**
   - CloudFront distribution
   - Edge caching
   - Signed URLs for private images

4. **Monitoring:**
   - Upload success/failure metrics
   - S3 operation latency tracking
   - Storage usage monitoring

---

## Troubleshooting

### Common Issues

**Issue:** `AWS credentials are not configured`
**Solution:** Ensure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are in `.env.local`

**Issue:** `AWS_S3_BUCKET_MEDIA environment variable is not configured`
**Solution:** Add `AWS_S3_BUCKET_MEDIA` to `.env.local`

**Issue:** Presigned URL expired
**Solution:** Generate new URL - they expire after 1 hour

**Issue:** `UnauthorizedResourceAccessError`
**Solution:** Verify contractor owns the service

**Issue:** `MaxImagesExceededError`
**Solution:** Delete existing images before uploading new ones (max 5 per service)

---

## Summary

This implementation provides a secure, scalable solution for image uploads:

- ✅ **Security:** Presigned URLs, ownership validation, input validation
- ✅ **Performance:** Direct client-to-S3 uploads
- ✅ **Reliability:** Error handling, retry logic
- ✅ **Maintainability:** Clean separation of concerns, comprehensive types
- ✅ **Testing:** Mock-friendly architecture

The system is ready for integration with the contractor service management API endpoints.
