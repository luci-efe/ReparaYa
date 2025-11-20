/**
 * Image Repository
 *
 * Data access layer for service image metadata using Prisma.
 * Does NOT handle S3 uploads (that's in the service layer).
 * Only manages image metadata records in the database.
 *
 * Features:
 * - Image metadata CRUD operations
 * - Ordering operations (reorder images)
 * - Batch operations (bulk create/delete)
 * - Validation helpers (count, ownership)
 *
 * @module services/repositories/imageRepository
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { ServiceImageNotFoundError } from '../errors';
import type { ServiceImageDTO, ConfirmImageUploadDTO, UpdateImageDTO } from '../types';

// ============================================================================
// Type Mappers
// ============================================================================

/**
 * Map Prisma ServiceImage to ServiceImageDTO
 */
function mapImageToDTO(image: any): ServiceImageDTO {
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

// ============================================================================
// Image Repository
// ============================================================================

export class ImageRepository {
  /**
   * Create image metadata record after successful S3 upload
   */
  async create(serviceId: string, data: ConfirmImageUploadDTO): Promise<ServiceImageDTO> {
    // Get current image count to determine order
    const currentCount = await this.countByService(serviceId);

    const image = await prisma.serviceImage.create({
      data: {
        serviceId,
        s3Url: data.s3Url,
        s3Key: data.s3Key,
        order: currentCount, // Append to end
        width: data.width ?? null,
        height: data.height ?? null,
        altText: data.altText ?? null,
      },
    });

    return mapImageToDTO(image);
  }

  /**
   * Find image by ID
   */
  async findById(imageId: string): Promise<ServiceImageDTO | null> {
    const image = await prisma.serviceImage.findUnique({
      where: { id: imageId },
    });

    if (!image) {
      return null;
    }

    return mapImageToDTO(image);
  }

  /**
   * Find all images for a service
   * Returns ordered list (by order field)
   */
  async findByServiceId(serviceId: string): Promise<ServiceImageDTO[]> {
    const images = await prisma.serviceImage.findMany({
      where: { serviceId },
      orderBy: {
        order: 'asc',
      },
    });

    return images.map(mapImageToDTO);
  }

  /**
   * Update image metadata
   * Allows updating order, alt text, dimensions
   */
  async update(imageId: string, data: UpdateImageDTO): Promise<ServiceImageDTO> {
    const existing = await this.findById(imageId);
    if (!existing) {
      throw new ServiceImageNotFoundError(imageId);
    }

    const updateData: Prisma.ServiceImageUpdateInput = {};
    if (data.order !== undefined) updateData.order = data.order;
    if (data.altText !== undefined) updateData.altText = data.altText;

    const image = await prisma.serviceImage.update({
      where: { id: imageId },
      data: updateData,
    });

    return mapImageToDTO(image);
  }

  /**
   * Delete image metadata
   * Note: Does NOT delete from S3 (caller must handle that)
   */
  async delete(imageId: string): Promise<void> {
    const existing = await this.findById(imageId);
    if (!existing) {
      throw new ServiceImageNotFoundError(imageId);
    }

    await prisma.serviceImage.delete({
      where: { id: imageId },
    });

    // Reorder remaining images to fill gap
    await this.reorderImagesForService(existing.serviceId);
  }

  /**
   * Delete all images for a service
   * Used when deleting a service
   * Returns array of S3 keys for cleanup
   */
  async deleteAllForService(serviceId: string): Promise<string[]> {
    const images = await this.findByServiceId(serviceId);
    const s3Keys = images.map((img) => img.s3Key);

    await prisma.serviceImage.deleteMany({
      where: { serviceId },
    });

    return s3Keys;
  }

  /**
   * Count images for a service
   * Used for validation (max 5 images)
   */
  async countByService(serviceId: string): Promise<number> {
    return prisma.serviceImage.count({
      where: { serviceId },
    });
  }

  /**
   * Reorder images for a service
   * Ensures order field is sequential (0, 1, 2, ...)
   */
  async reorderImagesForService(serviceId: string): Promise<void> {
    const images = await this.findByServiceId(serviceId);

    // Update order to be sequential
    for (let i = 0; i < images.length; i++) {
      if (images[i].order !== i) {
        await prisma.serviceImage.update({
          where: { id: images[i].id },
          data: { order: i },
        });
      }
    }
  }

  /**
   * Swap order of two images
   * Used for drag-and-drop reordering
   */
  async swapImageOrder(imageId1: string, imageId2: string): Promise<void> {
    const image1 = await this.findById(imageId1);
    const image2 = await this.findById(imageId2);

    if (!image1) throw new ServiceImageNotFoundError(imageId1);
    if (!image2) throw new ServiceImageNotFoundError(imageId2);

    // Verify both images belong to same service
    if (image1.serviceId !== image2.serviceId) {
      throw new Error('Cannot swap order of images from different services');
    }

    // Swap orders
    await prisma.$transaction([
      prisma.serviceImage.update({
        where: { id: imageId1 },
        data: { order: image2.order },
      }),
      prisma.serviceImage.update({
        where: { id: imageId2 },
        data: { order: image1.order },
      }),
    ]);
  }

  /**
   * Update image order (move to specific position)
   * Reorders other images to accommodate
   */
  async updateImageOrder(imageId: string, newOrder: number): Promise<void> {
    const image = await this.findById(imageId);
    if (!image) {
      throw new ServiceImageNotFoundError(imageId);
    }

    const oldOrder = image.order;
    const serviceId = image.serviceId;

    // Get all images for service
    const allImages = await this.findByServiceId(serviceId);

    // Validate new order
    if (newOrder < 0 || newOrder >= allImages.length) {
      throw new Error(`Invalid order: ${newOrder}. Must be between 0 and ${allImages.length - 1}`);
    }

    if (oldOrder === newOrder) {
      return; // No change needed
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      if (newOrder > oldOrder) {
        // Moving down: shift images up
        await tx.serviceImage.updateMany({
          where: {
            serviceId,
            order: {
              gt: oldOrder,
              lte: newOrder,
            },
          },
          data: {
            order: {
              decrement: 1,
            },
          },
        });
      } else {
        // Moving up: shift images down
        await tx.serviceImage.updateMany({
          where: {
            serviceId,
            order: {
              gte: newOrder,
              lt: oldOrder,
            },
          },
          data: {
            order: {
              increment: 1,
            },
          },
        });
      }

      // Update target image
      await tx.serviceImage.update({
        where: { id: imageId },
        data: { order: newOrder },
      });
    });
  }

  /**
   * Batch create images
   * Used for bulk upload operations
   */
  async batchCreate(serviceId: string, images: ConfirmImageUploadDTO[]): Promise<ServiceImageDTO[]> {
    const startOrder = await this.countByService(serviceId);

    const createData = images.map((img, index) => ({
      serviceId,
      s3Url: img.s3Url,
      s3Key: img.s3Key,
      order: startOrder + index,
      width: img.width ?? null,
      height: img.height ?? null,
      altText: img.altText ?? null,
    }));

    // Use createMany for efficiency
    await prisma.serviceImage.createMany({
      data: createData,
    });

    // Fetch created images to return with IDs
    return this.findByServiceId(serviceId);
  }

  /**
   * Check if image belongs to service (ownership validation)
   */
  async belongsToService(imageId: string, serviceId: string): Promise<boolean> {
    const image = await prisma.serviceImage.findUnique({
      where: { id: imageId },
      select: { serviceId: true },
    });

    return image?.serviceId === serviceId;
  }

  /**
   * Get first image for a service (cover image)
   */
  async getFirstImage(serviceId: string): Promise<ServiceImageDTO | null> {
    const image = await prisma.serviceImage.findFirst({
      where: { serviceId },
      orderBy: {
        order: 'asc',
      },
    });

    if (!image) {
      return null;
    }

    return mapImageToDTO(image);
  }

  /**
   * Get S3 keys for all images of a service
   * Used for cleanup operations
   */
  async getS3KeysForService(serviceId: string): Promise<string[]> {
    const images = await prisma.serviceImage.findMany({
      where: { serviceId },
      select: { s3Key: true },
    });

    return images.map((img) => img.s3Key);
  }

  /**
   * Update alt text for multiple images
   * Batch operation for accessibility improvements
   */
  async batchUpdateAltText(updates: Array<{ imageId: string; altText: string }>): Promise<void> {
    await prisma.$transaction(
      updates.map((update) =>
        prisma.serviceImage.update({
          where: { id: update.imageId },
          data: { altText: update.altText },
        })
      )
    );
  }

  /**
   * Find images by S3 key
   * Used for confirming uploads
   */
  async findByS3Key(s3Key: string): Promise<ServiceImageDTO | null> {
    const image = await prisma.serviceImage.findFirst({
      where: { s3Key },
    });

    if (!image) {
      return null;
    }

    return mapImageToDTO(image);
  }

  /**
   * Get orphaned images (images without valid service)
   * Used for cleanup jobs
   */
  async findOrphanedImages(): Promise<ServiceImageDTO[]> {
    const images = await prisma.serviceImage.findMany({
      where: {
        service: null,
      },
    });

    return images.map(mapImageToDTO);
  }
}

// Singleton instance
export const imageRepository = new ImageRepository();
