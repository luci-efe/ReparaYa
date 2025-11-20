/**
 * Unit tests for ImageRepository
 * Uses mocked Prisma client to test repository logic without database
 *
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ImageRepository } from '../imageRepository';
import { ServiceImageNotFoundError } from '../../errors';
import type { ConfirmImageUploadDTO, UpdateImageDTO } from '../../types';

// Mock prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    serviceImage: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Import mocked prisma
import { prisma } from '@/lib/db';

describe('ImageRepository Unit Tests', () => {
  let repository: ImageRepository;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new ImageRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('TC-IMAGE-001: should create image with correct order', async () => {
      // Arrange
      const serviceId = 'service-123';
      const uploadData: ConfirmImageUploadDTO = {
        s3Url: 'https://s3.amazonaws.com/bucket/key.jpg',
        s3Key: 'contractor-services/contractor-123/service-123/uuid.jpg',
        width: 1920,
        height: 1080,
        altText: 'Service image',
      };

      const mockCreated = {
        id: 'image-123',
        serviceId,
        s3Url: uploadData.s3Url,
        s3Key: uploadData.s3Key,
        order: 2, // Current count is 2
        width: 1920,
        height: 1080,
        altText: 'Service image',
        uploadedAt: new Date(),
      };

      mockPrisma.serviceImage.count.mockResolvedValue(2); // 2 existing images
      mockPrisma.serviceImage.create.mockResolvedValue(mockCreated as any);

      // Act
      const result = await repository.create(serviceId, uploadData);

      // Assert
      expect(mockPrisma.serviceImage.count).toHaveBeenCalledWith({
        where: { serviceId },
      });
      expect(result.order).toBe(2);
      expect(result.s3Url).toBe(uploadData.s3Url);
    });

    it('TC-IMAGE-002: should create first image with order 0', async () => {
      // Arrange
      const serviceId = 'service-123';
      const uploadData: ConfirmImageUploadDTO = {
        s3Url: 'https://s3.amazonaws.com/bucket/key.jpg',
        s3Key: 'contractor-services/contractor-123/service-123/uuid.jpg',
      };

      const mockCreated = {
        id: 'image-123',
        serviceId,
        s3Url: uploadData.s3Url,
        s3Key: uploadData.s3Key,
        order: 0,
        width: null,
        height: null,
        altText: null,
        uploadedAt: new Date(),
      };

      mockPrisma.serviceImage.count.mockResolvedValue(0); // No existing images
      mockPrisma.serviceImage.create.mockResolvedValue(mockCreated as any);

      // Act
      const result = await repository.create(serviceId, uploadData);

      // Assert
      expect(result.order).toBe(0);
    });
  });

  describe('findById', () => {
    it('TC-IMAGE-003: should return image when found', async () => {
      // Arrange
      const imageId = 'image-123';
      const mockImage = {
        id: imageId,
        serviceId: 'service-123',
        s3Url: 'https://s3.amazonaws.com/bucket/key.jpg',
        s3Key: 'key.jpg',
        order: 0,
        width: 1920,
        height: 1080,
        altText: 'Test image',
        uploadedAt: new Date(),
      };

      mockPrisma.serviceImage.findUnique.mockResolvedValue(mockImage as any);

      // Act
      const result = await repository.findById(imageId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(imageId);
    });

    it('TC-IMAGE-004: should return null when image not found', async () => {
      // Arrange
      mockPrisma.serviceImage.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('nonexistent-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByServiceId', () => {
    it('TC-IMAGE-005: should return images ordered by order field', async () => {
      // Arrange
      const serviceId = 'service-123';
      const mockImages = [
        {
          id: 'img-1',
          serviceId,
          s3Url: 'url1.jpg',
          s3Key: 'key1.jpg',
          order: 0,
          width: null,
          height: null,
          altText: null,
          uploadedAt: new Date(),
        },
        {
          id: 'img-2',
          serviceId,
          s3Url: 'url2.jpg',
          s3Key: 'key2.jpg',
          order: 1,
          width: null,
          height: null,
          altText: null,
          uploadedAt: new Date(),
        },
      ];

      mockPrisma.serviceImage.findMany.mockResolvedValue(mockImages as any);

      // Act
      const result = await repository.findByServiceId(serviceId);

      // Assert
      expect(mockPrisma.serviceImage.findMany).toHaveBeenCalledWith({
        where: { serviceId },
        orderBy: { order: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
    });
  });

  describe('update', () => {
    it('TC-IMAGE-006: should update image metadata', async () => {
      // Arrange
      const imageId = 'image-123';
      const updateData: UpdateImageDTO = {
        order: 2,
        altText: 'Updated alt text',
      };

      const mockExisting = {
        id: imageId,
        serviceId: 'service-123',
        order: 1,
        altText: 'Old alt text',
      };

      const mockUpdated = {
        ...mockExisting,
        order: 2,
        altText: 'Updated alt text',
        s3Url: 'url.jpg',
        s3Key: 'key.jpg',
        width: null,
        height: null,
        uploadedAt: new Date(),
      };

      mockPrisma.serviceImage.findUnique.mockResolvedValue(mockExisting as any);
      mockPrisma.serviceImage.update.mockResolvedValue(mockUpdated as any);

      // Act
      const result = await repository.update(imageId, updateData);

      // Assert
      expect(result.order).toBe(2);
      expect(result.altText).toBe('Updated alt text');
    });

    it('TC-IMAGE-007: should throw error if image not found', async () => {
      // Arrange
      mockPrisma.serviceImage.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.update('nonexistent-123', { altText: 'test' })).rejects.toThrow(
        ServiceImageNotFoundError
      );
    });
  });

  describe('delete', () => {
    it('TC-IMAGE-008: should delete image and reorder remaining', async () => {
      // Arrange
      const imageId = 'image-2';
      const serviceId = 'service-123';

      const mockExisting = {
        id: imageId,
        serviceId,
        order: 1,
      };

      const mockRemainingImages = [
        {
          id: 'image-1',
          serviceId,
          s3Url: 'url1.jpg',
          s3Key: 'key1.jpg',
          order: 0,
          width: null,
          height: null,
          altText: null,
          uploadedAt: new Date(),
        },
        {
          id: 'image-3',
          serviceId,
          s3Url: 'url3.jpg',
          s3Key: 'key3.jpg',
          order: 2,
          width: null,
          height: null,
          altText: null,
          uploadedAt: new Date(),
        },
      ];

      mockPrisma.serviceImage.findUnique.mockResolvedValue(mockExisting as any);
      mockPrisma.serviceImage.delete.mockResolvedValue({} as any);
      mockPrisma.serviceImage.findMany.mockResolvedValue(mockRemainingImages as any);
      mockPrisma.serviceImage.update.mockResolvedValue({} as any);

      // Act
      await repository.delete(imageId);

      // Assert
      expect(mockPrisma.serviceImage.delete).toHaveBeenCalledWith({
        where: { id: imageId },
      });
      // Should reorder remaining images
      expect(mockPrisma.serviceImage.findMany).toHaveBeenCalled();
    });
  });

  describe('deleteAllForService', () => {
    it('TC-IMAGE-009: should delete all images and return S3 keys', async () => {
      // Arrange
      const serviceId = 'service-123';
      const mockImages = [
        {
          id: 'img-1',
          serviceId,
          s3Url: 'url1.jpg',
          s3Key: 'key1.jpg',
          order: 0,
          width: null,
          height: null,
          altText: null,
          uploadedAt: new Date(),
        },
        {
          id: 'img-2',
          serviceId,
          s3Url: 'url2.jpg',
          s3Key: 'key2.jpg',
          order: 1,
          width: null,
          height: null,
          altText: null,
          uploadedAt: new Date(),
        },
      ];

      mockPrisma.serviceImage.findMany.mockResolvedValue(mockImages as any);
      mockPrisma.serviceImage.deleteMany.mockResolvedValue({} as any);

      // Act
      const result = await repository.deleteAllForService(serviceId);

      // Assert
      expect(mockPrisma.serviceImage.deleteMany).toHaveBeenCalledWith({
        where: { serviceId },
      });
      expect(result).toEqual(['key1.jpg', 'key2.jpg']);
    });
  });

  describe('countByService', () => {
    it('TC-IMAGE-010: should return image count', async () => {
      // Arrange
      const serviceId = 'service-123';
      mockPrisma.serviceImage.count.mockResolvedValue(3);

      // Act
      const result = await repository.countByService(serviceId);

      // Assert
      expect(mockPrisma.serviceImage.count).toHaveBeenCalledWith({
        where: { serviceId },
      });
      expect(result).toBe(3);
    });
  });

  describe('swapImageOrder', () => {
    it('TC-IMAGE-011: should swap order of two images', async () => {
      // Arrange
      const imageId1 = 'image-1';
      const imageId2 = 'image-2';
      const serviceId = 'service-123';

      const mockImage1 = {
        id: imageId1,
        serviceId,
        order: 0,
        s3Url: 'url1.jpg',
        s3Key: 'key1.jpg',
        width: null,
        height: null,
        altText: null,
        uploadedAt: new Date(),
      };

      const mockImage2 = {
        id: imageId2,
        serviceId,
        order: 1,
        s3Url: 'url2.jpg',
        s3Key: 'key2.jpg',
        width: null,
        height: null,
        altText: null,
        uploadedAt: new Date(),
      };

      mockPrisma.serviceImage.findUnique
        .mockResolvedValueOnce(mockImage1 as any)
        .mockResolvedValueOnce(mockImage2 as any);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      // Act
      await repository.swapImageOrder(imageId1, imageId2);

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('TC-IMAGE-012: should throw error if images from different services', async () => {
      // Arrange
      const imageId1 = 'image-1';
      const imageId2 = 'image-2';

      const mockImage1 = {
        id: imageId1,
        serviceId: 'service-123',
        order: 0,
      };

      const mockImage2 = {
        id: imageId2,
        serviceId: 'service-456', // Different service
        order: 1,
      };

      mockPrisma.serviceImage.findUnique
        .mockResolvedValueOnce(mockImage1 as any)
        .mockResolvedValueOnce(mockImage2 as any);

      // Act & Assert
      await expect(repository.swapImageOrder(imageId1, imageId2)).rejects.toThrow(
        'Cannot swap order of images from different services'
      );
    });
  });

  describe('updateImageOrder', () => {
    it('TC-IMAGE-013: should update image order and shift others', async () => {
      // Arrange
      const imageId = 'image-2';
      const serviceId = 'service-123';
      const newOrder = 0;

      const mockImage = {
        id: imageId,
        serviceId,
        order: 2,
        s3Url: 'url.jpg',
        s3Key: 'key.jpg',
        width: null,
        height: null,
        altText: null,
        uploadedAt: new Date(),
      };

      const mockAllImages = [
        { id: 'image-1', order: 0 },
        { id: 'image-2', order: 1 },
        { id: 'image-3', order: 2 },
      ];

      mockPrisma.serviceImage.findUnique.mockResolvedValue(mockImage as any);
      mockPrisma.serviceImage.findMany.mockResolvedValue(mockAllImages as any);
      mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
      mockPrisma.serviceImage.updateMany.mockResolvedValue({} as any);
      mockPrisma.serviceImage.update.mockResolvedValue({} as any);

      // Act
      await repository.updateImageOrder(imageId, newOrder);

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('TC-IMAGE-014: should throw error for invalid order', async () => {
      // Arrange
      const imageId = 'image-1';
      const mockImage = {
        id: imageId,
        serviceId: 'service-123',
        order: 0,
      };

      const mockAllImages = [
        { id: 'image-1', order: 0 },
        { id: 'image-2', order: 1 },
      ];

      mockPrisma.serviceImage.findUnique.mockResolvedValue(mockImage as any);
      mockPrisma.serviceImage.findMany.mockResolvedValue(mockAllImages as any);

      // Act & Assert
      await expect(repository.updateImageOrder(imageId, 5)).rejects.toThrow('Invalid order');
    });
  });

  describe('batchCreate', () => {
    it('TC-IMAGE-015: should create multiple images at once', async () => {
      // Arrange
      const serviceId = 'service-123';
      const uploads: ConfirmImageUploadDTO[] = [
        {
          s3Url: 'url1.jpg',
          s3Key: 'key1.jpg',
          width: 1920,
          height: 1080,
        },
        {
          s3Url: 'url2.jpg',
          s3Key: 'key2.jpg',
          width: 1280,
          height: 720,
        },
      ];

      const mockCreatedImages = [
        {
          id: 'img-1',
          serviceId,
          s3Url: 'url1.jpg',
          s3Key: 'key1.jpg',
          order: 0,
          width: 1920,
          height: 1080,
          altText: null,
          uploadedAt: new Date(),
        },
        {
          id: 'img-2',
          serviceId,
          s3Url: 'url2.jpg',
          s3Key: 'key2.jpg',
          order: 1,
          width: 1280,
          height: 720,
          altText: null,
          uploadedAt: new Date(),
        },
      ];

      mockPrisma.serviceImage.count.mockResolvedValue(0);
      mockPrisma.serviceImage.createMany.mockResolvedValue({} as any);
      mockPrisma.serviceImage.findMany.mockResolvedValue(mockCreatedImages as any);

      // Act
      const result = await repository.batchCreate(serviceId, uploads);

      // Assert
      expect(mockPrisma.serviceImage.createMany).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('belongsToService', () => {
    it('TC-IMAGE-016: should return true if image belongs to service', async () => {
      // Arrange
      const imageId = 'image-123';
      const serviceId = 'service-123';

      mockPrisma.serviceImage.findUnique.mockResolvedValue({
        id: imageId,
        serviceId,
      } as any);

      // Act
      const result = await repository.belongsToService(imageId, serviceId);

      // Assert
      expect(result).toBe(true);
    });

    it('TC-IMAGE-017: should return false if image belongs to different service', async () => {
      // Arrange
      const imageId = 'image-123';
      const serviceId = 'service-123';

      mockPrisma.serviceImage.findUnique.mockResolvedValue({
        id: imageId,
        serviceId: 'different-service',
      } as any);

      // Act
      const result = await repository.belongsToService(imageId, serviceId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getFirstImage', () => {
    it('TC-IMAGE-018: should return first image (cover image)', async () => {
      // Arrange
      const serviceId = 'service-123';
      const mockFirstImage = {
        id: 'image-1',
        serviceId,
        s3Url: 'cover.jpg',
        s3Key: 'cover-key.jpg',
        order: 0,
        width: 1920,
        height: 1080,
        altText: 'Cover image',
        uploadedAt: new Date(),
      };

      mockPrisma.serviceImage.findFirst.mockResolvedValue(mockFirstImage as any);

      // Act
      const result = await repository.getFirstImage(serviceId);

      // Assert
      expect(mockPrisma.serviceImage.findFirst).toHaveBeenCalledWith({
        where: { serviceId },
        orderBy: { order: 'asc' },
      });
      expect(result?.order).toBe(0);
      expect(result?.s3Url).toBe('cover.jpg');
    });

    it('TC-IMAGE-019: should return null if service has no images', async () => {
      // Arrange
      mockPrisma.serviceImage.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.getFirstImage('service-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getS3KeysForService', () => {
    it('TC-IMAGE-020: should return array of S3 keys', async () => {
      // Arrange
      const serviceId = 'service-123';
      const mockImages = [
        { s3Key: 'key1.jpg' },
        { s3Key: 'key2.jpg' },
        { s3Key: 'key3.jpg' },
      ];

      mockPrisma.serviceImage.findMany.mockResolvedValue(mockImages as any);

      // Act
      const result = await repository.getS3KeysForService(serviceId);

      // Assert
      expect(result).toEqual(['key1.jpg', 'key2.jpg', 'key3.jpg']);
    });
  });

  describe('batchUpdateAltText', () => {
    it('TC-IMAGE-021: should update alt text for multiple images', async () => {
      // Arrange
      const updates = [
        { imageId: 'img-1', altText: 'Alt text 1' },
        { imageId: 'img-2', altText: 'Alt text 2' },
      ];

      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      // Act
      await repository.batchUpdateAltText(updates);

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findByS3Key', () => {
    it('TC-IMAGE-022: should find image by S3 key', async () => {
      // Arrange
      const s3Key = 'contractor-services/123/456/uuid.jpg';
      const mockImage = {
        id: 'image-123',
        serviceId: 'service-456',
        s3Url: 'https://s3.amazonaws.com/bucket/' + s3Key,
        s3Key,
        order: 0,
        width: 1920,
        height: 1080,
        altText: null,
        uploadedAt: new Date(),
      };

      mockPrisma.serviceImage.findFirst.mockResolvedValue(mockImage as any);

      // Act
      const result = await repository.findByS3Key(s3Key);

      // Assert
      expect(mockPrisma.serviceImage.findFirst).toHaveBeenCalledWith({
        where: { s3Key },
      });
      expect(result?.s3Key).toBe(s3Key);
    });
  });
});
