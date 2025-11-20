/**
 * Image Service
 *
 * Business logic for service image management including upload,
 * deletion, reordering, and metadata updates.
 *
 * @module services/services/imageService
 */

import { PrismaClient } from '@prisma/client';
import type {
  ServiceImageDTO,
  ConfirmImageUploadDTO,
  UpdateImageDTO,
  PresignedUploadUrlDTO,
  RequestUploadUrlDTO,
  ALLOWED_IMAGE_MIME_TYPES,
} from '../types';
import {
  ServiceNotFoundError,
  UnauthorizedServiceActionError,
  ImageLimitExceededError,
  InvalidImageFormatError,
  ImageSizeExceededError,
  ServiceImageNotFoundError,
} from '../errors';
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGES_PER_SERVICE } from '../types';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Import from types to ensure consistency
const ALLOWED_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

// ============================================================================
// Image Service (Business Logic)
// ============================================================================

export class ImageService {
  /**
   * Request presigned URL for image upload
   *
   * Validates request and generates presigned S3 URL for direct upload.
   * Enforces image limit, MIME type, and file size restrictions.
   *
   * @param serviceId - ID of service to add image to
   * @param requesterId - ID of user requesting upload
   * @param data - Upload request data (filename, type, size)
   * @returns Presigned URL and S3 key for upload
   * @throws {ServiceNotFoundError} If service doesn't exist
   * @throws {UnauthorizedServiceActionError} If not service owner
   * @throws {ImageLimitExceededError} If service already has 5 images
   * @throws {InvalidImageFormatError} If MIME type not allowed
   * @throws {ImageSizeExceededError} If file size exceeds limit
   */
  async requestUploadUrl(
    serviceId: string,
    requesterId: string,
    data: RequestUploadUrlDTO
  ): Promise<PresignedUploadUrlDTO> {
    // Validate service exists and user is owner
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { serviceImages: true },
    });

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    if (service.contractorId !== requesterId) {
      throw new UnauthorizedServiceActionError(
        'upload image',
        'Only the service owner can upload images'
      );
    }

    // Check image limit
    if (service.serviceImages.length >= MAX_IMAGES_PER_SERVICE) {
      throw new ImageLimitExceededError(serviceId, MAX_IMAGES_PER_SERVICE);
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(data.fileType)) {
      throw new InvalidImageFormatError(data.fileType, ALLOWED_MIME_TYPES);
    }

    // Validate file size
    if (data.fileSize > MAX_IMAGE_SIZE_BYTES) {
      throw new ImageSizeExceededError(data.fileSize, MAX_IMAGE_SIZE_BYTES);
    }

    // Generate S3 key
    const extension = this.getFileExtension(data.fileName);
    const uuid = uuidv4();
    const s3Key = `contractor-services/${service.contractorId}/${serviceId}/${uuid}.${extension}`;

    // Generate presigned URL (placeholder - requires AWS S3 SDK integration)
    // In production, this would call AWS S3 SDK to generate presigned URL
    const uploadUrl = await this.generatePresignedUrl(s3Key, data.fileType);

    return {
      uploadUrl,
      s3Key,
      expiresIn: 3600, // 1 hour
    };
  }

  /**
   * Confirm successful image upload
   *
   * Saves image metadata to database after client uploads to S3.
   * Automatically assigns order based on existing image count.
   *
   * @param serviceId - ID of service image belongs to
   * @param requesterId - ID of user confirming upload
   * @param data - Upload confirmation data (S3 key, URL, dimensions, alt text)
   * @returns Created image metadata
   * @throws {ServiceNotFoundError} If service doesn't exist
   * @throws {UnauthorizedServiceActionError} If not service owner
   */
  async confirmImageUpload(
    serviceId: string,
    requesterId: string,
    data: ConfirmImageUploadDTO
  ): Promise<ServiceImageDTO> {
    // Validate service exists and user is owner
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { serviceImages: true },
    });

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    if (service.contractorId !== requesterId) {
      throw new UnauthorizedServiceActionError(
        'confirm image upload',
        'Only the service owner can confirm image uploads'
      );
    }

    // Determine next order (0-based)
    const nextOrder = service.serviceImages.length;

    // Create image record
    const image = await prisma.serviceImage.create({
      data: {
        serviceId,
        s3Url: data.s3Url,
        s3Key: data.s3Key,
        order: nextOrder,
        width: data.width ?? null,
        height: data.height ?? null,
        altText: data.altText ?? null,
      },
    });

    return this.mapToDTO(image);
  }

  /**
   * Remove image from service
   *
   * Deletes image metadata from database. In production, would also
   * delete object from S3 (implemented separately or via lifecycle policy).
   *
   * @param serviceId - ID of service image belongs to
   * @param imageId - ID of image to remove
   * @param requesterId - ID of user requesting removal
   * @throws {ServiceNotFoundError} If service doesn't exist
   * @throws {ServiceImageNotFoundError} If image doesn't exist
   * @throws {UnauthorizedServiceActionError} If not service owner
   */
  async removeImage(
    serviceId: string,
    imageId: string,
    requesterId: string
  ): Promise<void> {
    // Validate service exists and user is owner
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    if (service.contractorId !== requesterId) {
      throw new UnauthorizedServiceActionError(
        'remove image',
        'Only the service owner can remove images'
      );
    }

    // Validate image exists and belongs to service
    const image = await prisma.serviceImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.serviceId !== serviceId) {
      throw new ServiceImageNotFoundError(imageId);
    }

    // Delete image record
    await prisma.serviceImage.delete({
      where: { id: imageId },
    });

    // Reorder remaining images to fill gap
    await this.reorderAfterDeletion(serviceId, image.order);

    // TODO: In production, delete S3 object or mark for cleanup
    // await s3Client.deleteObject({ Bucket: bucket, Key: image.s3Key });
  }

  /**
   * Reorder service images
   *
   * Updates the display order of images. Order must be 0-based
   * and contiguous (0, 1, 2, ..., n-1).
   *
   * @param serviceId - ID of service images belong to
   * @param imageOrders - Map of image IDs to new order values
   * @param requesterId - ID of user requesting reorder
   * @returns Updated images
   * @throws {ServiceNotFoundError} If service doesn't exist
   * @throws {UnauthorizedServiceActionError} If not service owner
   */
  async reorderImages(
    serviceId: string,
    imageOrders: Record<string, number>,
    requesterId: string
  ): Promise<ServiceImageDTO[]> {
    // Validate service exists and user is owner
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { serviceImages: true },
    });

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    if (service.contractorId !== requesterId) {
      throw new UnauthorizedServiceActionError(
        'reorder images',
        'Only the service owner can reorder images'
      );
    }

    // Validate all image IDs belong to this service
    const imageIds = Object.keys(imageOrders);
    const validImageIds = service.serviceImages.map(img => img.id);

    for (const imageId of imageIds) {
      if (!validImageIds.includes(imageId)) {
        throw new ServiceImageNotFoundError(imageId);
      }
    }

    // Update orders in transaction
    await prisma.$transaction(
      imageIds.map(imageId =>
        prisma.serviceImage.update({
          where: { id: imageId },
          data: { order: imageOrders[imageId] },
        })
      )
    );

    // Fetch and return updated images
    const updatedImages = await prisma.serviceImage.findMany({
      where: { serviceId },
      orderBy: { order: 'asc' },
    });

    return updatedImages.map(this.mapToDTO);
  }

  /**
   * Update image metadata
   *
   * Updates alt text and/or order for an existing image.
   *
   * @param serviceId - ID of service image belongs to
   * @param imageId - ID of image to update
   * @param requesterId - ID of user requesting update
   * @param data - Fields to update (order, altText)
   * @returns Updated image
   * @throws {ServiceNotFoundError} If service doesn't exist
   * @throws {ServiceImageNotFoundError} If image doesn't exist
   * @throws {UnauthorizedServiceActionError} If not service owner
   */
  async updateImageMetadata(
    serviceId: string,
    imageId: string,
    requesterId: string,
    data: UpdateImageDTO
  ): Promise<ServiceImageDTO> {
    // Validate service exists and user is owner
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    if (service.contractorId !== requesterId) {
      throw new UnauthorizedServiceActionError(
        'update image metadata',
        'Only the service owner can update image metadata'
      );
    }

    // Validate image exists and belongs to service
    const image = await prisma.serviceImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.serviceId !== serviceId) {
      throw new ServiceImageNotFoundError(imageId);
    }

    // Update image metadata
    const updatedImage = await prisma.serviceImage.update({
      where: { id: imageId },
      data: {
        ...(data.order !== undefined && { order: data.order }),
        ...(data.altText !== undefined && { altText: data.altText }),
      },
    });

    return this.mapToDTO(updatedImage);
  }

  /**
   * Get all images for a service
   *
   * Returns images ordered by display order.
   *
   * @param serviceId - ID of service to get images for
   * @returns Array of images ordered by display order
   */
  async getServiceImages(serviceId: string): Promise<ServiceImageDTO[]> {
    const images = await prisma.serviceImage.findMany({
      where: { serviceId },
      orderBy: { order: 'asc' },
    });

    return images.map(this.mapToDTO);
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  /**
   * Reorder images after deletion to fill gaps
   *
   * When an image is deleted, updates the order of all subsequent
   * images to maintain contiguous 0-based ordering.
   *
   * @param serviceId - ID of service
   * @param deletedOrder - Order value of deleted image
   */
  private async reorderAfterDeletion(
    serviceId: string,
    deletedOrder: number
  ): Promise<void> {
    // Decrement order of all images that came after the deleted one
    await prisma.serviceImage.updateMany({
      where: {
        serviceId,
        order: { gt: deletedOrder },
      },
      data: {
        order: { decrement: 1 },
      },
    });
  }

  /**
   * Generate presigned S3 URL
   *
   * Placeholder for AWS S3 SDK integration. In production, this would
   * use @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner.
   *
   * @param s3Key - S3 object key
   * @param contentType - MIME type
   * @returns Presigned PUT URL
   */
  private async generatePresignedUrl(
    s3Key: string,
    contentType: string
  ): Promise<string> {
    // TODO: Implement AWS S3 presigned URL generation
    // Example:
    // import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
    // import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
    //
    // const command = new PutObjectCommand({
    //   Bucket: process.env.AWS_S3_BUCKET_MEDIA,
    //   Key: s3Key,
    //   ContentType: contentType,
    // });
    //
    // return await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // Placeholder implementation
    return `https://reparaya-media-dev.s3.amazonaws.com/${s3Key}?presigned=true`;
  }

  /**
   * Extract file extension from filename
   *
   * @param filename - Original filename
   * @returns File extension without dot
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
  }

  /**
   * Map Prisma ServiceImage to DTO
   *
   * @param image - Prisma ServiceImage model
   * @returns ServiceImageDTO
   */
  private mapToDTO(image: any): ServiceImageDTO {
    return {
      id: image.id,
      serviceId: image.serviceId,
      s3Url: image.s3Url,
      s3Key: image.s3Key,
      order: image.order,
      width: image.width,
      height: image.height,
      altText: image.altText,
      uploadedAt: image.uploadedAt,
    };
  }
}

// Singleton instance
export const imageService = new ImageService();
