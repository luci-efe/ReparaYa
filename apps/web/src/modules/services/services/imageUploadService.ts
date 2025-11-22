import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { getS3Client } from '@/lib/aws/s3Client';
import {
  getS3BucketName,
  PRESIGNED_URL_EXPIRY_SECONDS,
  CONTRACTOR_SERVICE_PREFIX,
  MIME_TYPE_TO_EXTENSION,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES_PER_SERVICE,
  ALLOWED_IMAGE_MIME_TYPES,
} from '@/lib/aws/s3Config';
import { serviceImageRepository } from '../repositories/serviceImageRepository';
import type {
  ImageUploadResponseDTO,
  ImageUploadConfirmDTO,
  ServiceImageDTO,
  AllowedImageMimeType,
} from '../types/image';
import {
  PresignedUrlGenerationError,
  S3DeleteFailedError,
  S3ObjectNotFoundError,
  ImageSizeLimitExceededError,
  MaxImagesExceededError,
  InvalidMimeTypeError,
  UnauthorizedResourceAccessError,
} from '../errors';
import { prisma } from '@/lib/db';

/**
 * ImageUploadService
 *
 * Service for managing image uploads to S3 for contractor services
 *
 * Features:
 * - Generate presigned URLs for client-side uploads
 * - Validate ownership and image constraints
 * - Confirm successful uploads and save metadata to database
 * - Delete images from both S3 and database
 *
 * Security:
 * - Validates contractor owns the service
 * - Enforces max 5 images per service
 * - Validates file size and MIME type
 * - Uses presigned URLs with 1-hour expiry
 */
export class ImageUploadService {
  /**
   * Validate that the contractor owns the service
   *
   * @throws UnauthorizedResourceAccessError if contractor doesn't own service
   */
  private async validateServiceOwnership(
    serviceId: string,
    contractorId: string
  ): Promise<void> {
    // Query the Service table to verify ownership
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { contractorId: true },
    });

    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    if (service.contractorId !== contractorId) {
      throw new UnauthorizedResourceAccessError('service', serviceId, contractorId);
    }
  }

  /**
   * Generate a presigned URL for uploading an image
   *
   * Flow:
   * 1. Validate contractor owns the service
   * 2. Check image count < 5
   * 3. Validate file metadata (size, MIME type)
   * 4. Generate S3 key with UUID
   * 5. Create presigned URL with PutObjectCommand
   * 6. Return URL and metadata
   *
   * @param serviceId - Service to upload image for
   * @param contractorId - Contractor uploading the image
   * @param fileName - Original file name
   * @param mimeType - MIME type of the file
   * @param fileSize - File size in bytes
   * @returns Presigned URL and metadata
   *
   * @throws UnauthorizedResourceAccessError if contractor doesn't own service
   * @throws MaxImagesExceededError if service already has 5 images
   * @throws ImageSizeLimitExceededError if file size exceeds limit
   * @throws InvalidMimeTypeError if MIME type is not allowed
   * @throws PresignedUrlGenerationError if URL generation fails
   */
  async generatePresignedUploadUrl(
    serviceId: string,
    contractorId: string,
    fileName: string,
    mimeType: string,
    fileSize: number
  ): Promise<ImageUploadResponseDTO> {
    try {
      // 1. Validate ownership
      await this.validateServiceOwnership(serviceId, contractorId);

      // 2. Check image count
      const currentImages = await serviceImageRepository.findByServiceId(serviceId);
      if (currentImages.length >= MAX_IMAGES_PER_SERVICE) {
        throw new MaxImagesExceededError(serviceId, MAX_IMAGES_PER_SERVICE);
      }

      // 3. Validate file size
      if (fileSize > MAX_IMAGE_SIZE_BYTES) {
        throw new ImageSizeLimitExceededError(
          MAX_IMAGE_SIZE_BYTES / 1024 / 1024,
          fileSize
        );
      }

      // 4. Validate MIME type
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as AllowedImageMimeType)) {
        throw new InvalidMimeTypeError(mimeType, ALLOWED_IMAGE_MIME_TYPES);
      }

      // 5. Generate S3 key
      const extension = MIME_TYPE_TO_EXTENSION[mimeType] || 'jpg';
      const uuid = uuidv4();
      const s3Key = `${CONTRACTOR_SERVICE_PREFIX}${contractorId}/${serviceId}/${uuid}.${extension}`;

      // 6. Generate presigned URL
      const s3Client = getS3Client();
      const bucket = getS3BucketName();

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        ContentType: mimeType,
        ContentLength: fileSize,
        // Add metadata for tracking
        Metadata: {
          'contractor-id': contractorId,
          'service-id': serviceId,
          'original-filename': fileName,
        },
      });

      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
      });

      // 7. Calculate expiry date
      const expiresAt = new Date(Date.now() + PRESIGNED_URL_EXPIRY_SECONDS * 1000);

      console.log('[ImageUploadService] Generated presigned URL', {
        serviceId,
        contractorId,
        s3Key,
        fileSize,
        mimeType,
      });

      return {
        presignedUrl,
        s3Key,
        expiresAt,
      };
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof MaxImagesExceededError ||
        error instanceof ImageSizeLimitExceededError ||
        error instanceof InvalidMimeTypeError ||
        error instanceof UnauthorizedResourceAccessError
      ) {
        throw error;
      }

      // Wrap unknown errors
      console.error('[ImageUploadService] Error generating presigned URL:', error);
      throw new PresignedUrlGenerationError(
        'Failed to generate presigned upload URL',
        error as Error
      );
    }
  }

  /**
   * Confirm that an image was successfully uploaded to S3
   *
   * Flow:
   * 1. Validate contractor owns the service
   * 2. Optionally verify S3 object exists (HEAD request)
   * 3. Get next order position
   * 4. Save image metadata to database
   *
   * @param serviceId - Service the image belongs to
   * @param contractorId - Contractor who uploaded the image
   * @param data - Upload confirmation data
   * @returns Saved image data
   *
   * @throws UnauthorizedResourceAccessError if contractor doesn't own service
   * @throws S3ObjectNotFoundError if S3 object doesn't exist (if verification enabled)
   */
  async confirmImageUpload(
    serviceId: string,
    contractorId: string,
    data: ImageUploadConfirmDTO
  ): Promise<ServiceImageDTO> {
    try {
      // 1. Validate ownership
      await this.validateServiceOwnership(serviceId, contractorId);

      // 2. Optional: Verify S3 object exists
      // Uncomment if you want to verify the upload before saving to DB
      // await this.verifyS3ObjectExists(data.s3Key);

      // 3. Get next order position
      const existingImages = await serviceImageRepository.findByServiceId(serviceId);
      const order = existingImages.length;

      // 4. Save to database
      const savedImage = await serviceImageRepository.create({
        serviceId,
        s3Url: data.s3Url,
        s3Key: data.s3Key,
        order,
        width: data.width,
        height: data.height,
        altText: data.altText,
      });

      console.log('[ImageUploadService] Image upload confirmed', {
        imageId: savedImage.id,
        serviceId,
        contractorId,
        s3Key: data.s3Key,
      });

      return savedImage;
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof UnauthorizedResourceAccessError ||
        error instanceof S3ObjectNotFoundError
      ) {
        throw error;
      }

      // Log and re-throw other errors
      console.error('[ImageUploadService] Error confirming image upload:', error);
      throw error;
    }
  }

  /**
   * Verify that an S3 object exists (optional verification step)
   *
   * @throws S3ObjectNotFoundError if object doesn't exist
   */
  private async verifyS3ObjectExists(s3Key: string): Promise<void> {
    try {
      const s3Client = getS3Client();
      const bucket = getS3BucketName();

      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      });

      await s3Client.send(command);
    } catch (error) {
      console.error('[ImageUploadService] S3 object verification failed:', error);
      throw new S3ObjectNotFoundError(
        `S3 object not found: ${s3Key}`,
        error as Error
      );
    }
  }

  /**
   * Delete an image from both S3 and database
   *
   * Flow:
   * 1. Get image from database
   * 2. Validate contractor owns the service
   * 3. Delete from S3
   * 4. Delete from database
   *
   * @param serviceId - Service the image belongs to
   * @param imageId - Image to delete
   * @param contractorId - Contractor deleting the image
   *
   * @throws UnauthorizedResourceAccessError if contractor doesn't own service
   * @throws S3DeleteFailedError if S3 deletion fails
   */
  async deleteImage(
    serviceId: string,
    imageId: string,
    contractorId: string
  ): Promise<void> {
    try {
      // 1. Get image from database
      const images = await serviceImageRepository.findByServiceId(serviceId);
      const image = images.find((img) => img.id === imageId);

      if (!image) {
        throw new Error(`Image not found: ${imageId}`);
      }

      // 2. Validate ownership
      await this.validateServiceOwnership(serviceId, contractorId);

      // 3. Delete from S3
      try {
        const s3Client = getS3Client();
        const bucket = getS3BucketName();

        const command = new DeleteObjectCommand({
          Bucket: bucket,
          Key: image.s3Key,
        });

        await s3Client.send(command);

        console.log('[ImageUploadService] Image deleted from S3', {
          imageId,
          s3Key: image.s3Key,
        });
      } catch (error) {
        console.error('[ImageUploadService] S3 deletion failed:', error);
        throw new S3DeleteFailedError(
          `Failed to delete image from S3: ${image.s3Key}`,
          error as Error
        );
      }

      // 4. Delete from database
      await serviceImageRepository.deleteById(imageId);

      console.log('[ImageUploadService] Image deleted from database', {
        imageId,
        serviceId,
        contractorId,
      });
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof UnauthorizedResourceAccessError ||
        error instanceof S3DeleteFailedError
      ) {
        throw error;
      }

      // Log and re-throw other errors
      console.error('[ImageUploadService] Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Get all images for a service
   *
   * @param serviceId - Service to get images for
   * @returns Array of service images, ordered by order field
   */
  async getServiceImages(serviceId: string): Promise<ServiceImageDTO[]> {
    return serviceImageRepository.findByServiceId(serviceId);
  }

  /**
   * Update image alt text
   *
   * @param serviceId - Service the image belongs to
   * @param imageId - Image to update
   * @param contractorId - Contractor updating the image
   * @param altText - New alt text
   * @returns Updated image data
   *
   * @throws UnauthorizedResourceAccessError if contractor doesn't own service
   */
  async updateImageAltText(
    serviceId: string,
    imageId: string,
    contractorId: string,
    altText: string
  ): Promise<ServiceImageDTO> {
    // Validate ownership
    await this.validateServiceOwnership(serviceId, contractorId);

    // Get image and verify it belongs to service
    const images = await serviceImageRepository.findByServiceId(serviceId);
    const image = images.find((img) => img.id === imageId);

    if (!image) {
      throw new Error(`Image ${imageId} not found for service ${serviceId}`);
    }

    return serviceImageRepository.updateAltText(imageId, altText);
  }

  /**
   * Reorder images for a service
   *
   * @param serviceId - Service to reorder images for
   * @param contractorId - Contractor reordering images
   * @param imageIds - Array of image IDs in desired order
   *
   * @throws UnauthorizedResourceAccessError if contractor doesn't own service
   */
  async reorderImages(
    serviceId: string,
    contractorId: string,
    imageIds: string[]
  ): Promise<void> {
    // Validate ownership
    await this.validateServiceOwnership(serviceId, contractorId);

    // Validate all images belong to the service
    const images = await serviceImageRepository.findByServiceId(serviceId);
    const imageIdSet = new Set(images.map((img) => img.id));

    if (imageIds.length !== images.length) {
      throw new Error(
        `Invalid image count: expected ${images.length}, got ${imageIds.length}`
      );
    }

    for (const imageId of imageIds) {
      if (!imageIdSet.has(imageId)) {
        throw new Error(`Image ${imageId} does not belong to service ${serviceId}`);
      }
    }

    // Update each image order
    for (let i = 0; i < imageIds.length; i++) {
      await serviceImageRepository.updateOrder(imageIds[i], i);
    }

    console.log('[ImageUploadService] Images reordered', {
      serviceId,
      contractorId,
      imageIds,
    });
  }
}

/**
 * Default service instance
 */
export const imageUploadService = new ImageUploadService();
