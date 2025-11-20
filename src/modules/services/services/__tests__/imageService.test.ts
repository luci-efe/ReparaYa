/**
 * Image Service Unit Tests
 *
 * Comprehensive unit tests for image management including:
 * - Presigned URL generation
 * - Image upload confirmation
 * - Image removal and reordering
 * - Metadata updates
 * - Authorization and validation
 *
 * @module services/services/__tests__/imageService
 */

import { ImageService } from '../imageService';
import { PrismaClient } from '@prisma/client';
import {
  ServiceNotFoundError,
  UnauthorizedServiceActionError,
  ImageLimitExceededError,
  InvalidImageFormatError,
  ImageSizeExceededError,
  ServiceImageNotFoundError,
} from '../../errors';
import type {
  RequestUploadUrlDTO,
  ConfirmImageUploadDTO,
  UpdateImageDTO,
} from '../../types';
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGES_PER_SERVICE } from '../../types';

// Mock dependencies
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    service: {
      findUnique: jest.fn(),
    },
    serviceImage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

describe('ImageService', () => {
  let imageService: ImageService;
  let mockPrisma: any;

  // Test fixtures
  const mockContractorId = 'contractor-123';
  const mockServiceId = 'service-123';
  const mockImageId = 'image-123';

  const mockService = {
    id: mockServiceId,
    contractorId: mockContractorId,
    title: 'Test Service',
    serviceImages: [],
  };

  const mockImage = {
    id: mockImageId,
    serviceId: mockServiceId,
    s3Url: 'https://s3.amazonaws.com/bucket/image.jpg',
    s3Key: 'contractor-services/contractor-123/service-123/mock-uuid-123.jpg',
    order: 0,
    width: 1920,
    height: 1080,
    altText: 'Test image',
    uploadedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get Prisma mock instance
    mockPrisma = new PrismaClient();

    // Create service instance
    imageService = new ImageService();
  });

  describe('requestUploadUrl', () => {
    const requestData: RequestUploadUrlDTO = {
      fileName: 'test-image.jpg',
      fileType: 'image/jpeg',
      fileSize: 5 * 1024 * 1024, // 5 MB
    };

    it('should generate presigned URL for valid request', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);

      // Act
      const result = await imageService.requestUploadUrl(
        mockServiceId,
        mockContractorId,
        requestData
      );

      // Assert
      expect(result).toEqual({
        uploadUrl: expect.stringContaining('contractor-services'),
        s3Key: `contractor-services/${mockContractorId}/${mockServiceId}/mock-uuid-123.jpg`,
        expiresIn: 3600,
      });
      expect(mockPrisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: mockServiceId },
        include: { serviceImages: true },
      });
    });

    it('should throw ServiceNotFoundError if service does not exist', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        imageService.requestUploadUrl(mockServiceId, mockContractorId, requestData)
      ).rejects.toThrow(ServiceNotFoundError);
    });

    it('should throw UnauthorizedServiceActionError for non-owner', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);

      // Act & Assert
      await expect(
        imageService.requestUploadUrl(mockServiceId, 'other-user-123', requestData)
      ).rejects.toThrow(UnauthorizedServiceActionError);
    });

    it('should throw ImageLimitExceededError if service has 5 images', async () => {
      // Arrange
      const serviceWith5Images = {
        ...mockService,
        serviceImages: Array(5).fill(mockImage),
      };
      mockPrisma.service.findUnique.mockResolvedValue(serviceWith5Images);

      // Act & Assert
      await expect(
        imageService.requestUploadUrl(mockServiceId, mockContractorId, requestData)
      ).rejects.toThrow(ImageLimitExceededError);
    });

    it('should throw InvalidImageFormatError for unsupported MIME type', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      const invalidRequest = { ...requestData, fileType: 'image/gif' };

      // Act & Assert
      await expect(
        imageService.requestUploadUrl(mockServiceId, mockContractorId, invalidRequest)
      ).rejects.toThrow(InvalidImageFormatError);
    });

    it('should throw ImageSizeExceededError for file too large', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      const largeFileRequest = {
        ...requestData,
        fileSize: MAX_IMAGE_SIZE_BYTES + 1,
      };

      // Act & Assert
      await expect(
        imageService.requestUploadUrl(mockServiceId, mockContractorId, largeFileRequest)
      ).rejects.toThrow(ImageSizeExceededError);
    });

    it('should handle PNG images', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      const pngRequest = {
        fileName: 'test.png',
        fileType: 'image/png',
        fileSize: 2 * 1024 * 1024,
      };

      // Act
      const result = await imageService.requestUploadUrl(
        mockServiceId,
        mockContractorId,
        pngRequest
      );

      // Assert
      expect(result.s3Key).toMatch(/\.png$/);
    });

    it('should handle WebP images', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      const webpRequest = {
        fileName: 'test.webp',
        fileType: 'image/webp',
        fileSize: 2 * 1024 * 1024,
      };

      // Act
      const result = await imageService.requestUploadUrl(
        mockServiceId,
        mockContractorId,
        webpRequest
      );

      // Assert
      expect(result.s3Key).toMatch(/\.webp$/);
    });
  });

  describe('confirmImageUpload', () => {
    const confirmData: ConfirmImageUploadDTO = {
      s3Url: 'https://s3.amazonaws.com/bucket/image.jpg',
      s3Key: 'contractor-services/contractor-123/service-123/mock-uuid-123.jpg',
      width: 1920,
      height: 1080,
      altText: 'Test image',
    };

    it('should save image metadata after successful upload', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockPrisma.serviceImage.create.mockResolvedValue(mockImage);

      // Act
      const result = await imageService.confirmImageUpload(
        mockServiceId,
        mockContractorId,
        confirmData
      );

      // Assert
      expect(result).toMatchObject({
        id: mockImageId,
        serviceId: mockServiceId,
        s3Url: confirmData.s3Url,
        s3Key: confirmData.s3Key,
        order: 0,
        width: confirmData.width,
        height: confirmData.height,
        altText: confirmData.altText,
      });
      expect(mockPrisma.serviceImage.create).toHaveBeenCalledWith({
        data: {
          serviceId: mockServiceId,
          s3Url: confirmData.s3Url,
          s3Key: confirmData.s3Key,
          order: 0,
          width: confirmData.width,
          height: confirmData.height,
          altText: confirmData.altText,
        },
      });
    });

    it('should assign correct order when images exist', async () => {
      // Arrange
      const serviceWith2Images = {
        ...mockService,
        serviceImages: [mockImage, { ...mockImage, id: 'image-2', order: 1 }],
      };
      mockPrisma.service.findUnique.mockResolvedValue(serviceWith2Images);
      mockPrisma.serviceImage.create.mockResolvedValue({
        ...mockImage,
        order: 2,
      });

      // Act
      await imageService.confirmImageUpload(mockServiceId, mockContractorId, confirmData);

      // Assert
      expect(mockPrisma.serviceImage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            order: 2,
          }),
        })
      );
    });

    it('should handle confirmation without dimensions', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      const imageWithoutDimensions = { ...mockImage, width: null, height: null };
      mockPrisma.serviceImage.create.mockResolvedValue(imageWithoutDimensions);

      const dataWithoutDimensions = {
        s3Url: confirmData.s3Url,
        s3Key: confirmData.s3Key,
      };

      // Act
      const result = await imageService.confirmImageUpload(
        mockServiceId,
        mockContractorId,
        dataWithoutDimensions
      );

      // Assert
      expect(result.width).toBeNull();
      expect(result.height).toBeNull();
    });

    it('should throw UnauthorizedServiceActionError for non-owner', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);

      // Act & Assert
      await expect(
        imageService.confirmImageUpload(mockServiceId, 'other-user-123', confirmData)
      ).rejects.toThrow(UnauthorizedServiceActionError);
    });
  });

  describe('removeImage', () => {
    it('should remove image and reorder remaining images', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockPrisma.serviceImage.findUnique.mockResolvedValue(mockImage);
      mockPrisma.serviceImage.delete.mockResolvedValue(mockImage);
      mockPrisma.serviceImage.updateMany.mockResolvedValue({ count: 2 });

      // Act
      await imageService.removeImage(mockServiceId, mockImageId, mockContractorId);

      // Assert
      expect(mockPrisma.serviceImage.delete).toHaveBeenCalledWith({
        where: { id: mockImageId },
      });
      expect(mockPrisma.serviceImage.updateMany).toHaveBeenCalledWith({
        where: {
          serviceId: mockServiceId,
          order: { gt: mockImage.order },
        },
        data: {
          order: { decrement: 1 },
        },
      });
    });

    it('should throw ServiceImageNotFoundError if image does not exist', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockPrisma.serviceImage.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        imageService.removeImage(mockServiceId, mockImageId, mockContractorId)
      ).rejects.toThrow(ServiceImageNotFoundError);
    });

    it('should throw ServiceImageNotFoundError if image belongs to different service', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      const otherServiceImage = { ...mockImage, serviceId: 'other-service-123' };
      mockPrisma.serviceImage.findUnique.mockResolvedValue(otherServiceImage);

      // Act & Assert
      await expect(
        imageService.removeImage(mockServiceId, mockImageId, mockContractorId)
      ).rejects.toThrow(ServiceImageNotFoundError);
    });

    it('should throw UnauthorizedServiceActionError for non-owner', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);

      // Act & Assert
      await expect(
        imageService.removeImage(mockServiceId, mockImageId, 'other-user-123')
      ).rejects.toThrow(UnauthorizedServiceActionError);
    });
  });

  describe('reorderImages', () => {
    const image1 = { ...mockImage, id: 'image-1', order: 0 };
    const image2 = { ...mockImage, id: 'image-2', order: 1 };
    const image3 = { ...mockImage, id: 'image-3', order: 2 };

    const serviceWith3Images = {
      ...mockService,
      serviceImages: [image1, image2, image3],
    };

    it('should reorder images successfully', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(serviceWith3Images);

      const newOrders = {
        'image-1': 2,
        'image-2': 0,
        'image-3': 1,
      };

      const reorderedImages = [
        { ...image2, order: 0 },
        { ...image3, order: 1 },
        { ...image1, order: 2 },
      ];

      mockPrisma.serviceImage.findMany.mockResolvedValue(reorderedImages);

      // Act
      const result = await imageService.reorderImages(
        mockServiceId,
        newOrders,
        mockContractorId
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
      expect(result[2].order).toBe(2);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ServiceImageNotFoundError for invalid image ID', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(serviceWith3Images);

      const invalidOrders = {
        'image-1': 0,
        'invalid-image': 1,
      };

      // Act & Assert
      await expect(
        imageService.reorderImages(mockServiceId, invalidOrders, mockContractorId)
      ).rejects.toThrow(ServiceImageNotFoundError);
    });

    it('should throw UnauthorizedServiceActionError for non-owner', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(serviceWith3Images);

      // Act & Assert
      await expect(
        imageService.reorderImages(mockServiceId, {}, 'other-user-123')
      ).rejects.toThrow(UnauthorizedServiceActionError);
    });
  });

  describe('updateImageMetadata', () => {
    const updateData: UpdateImageDTO = {
      altText: 'Updated alt text',
      order: 2,
    };

    it('should update image metadata', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockPrisma.serviceImage.findUnique.mockResolvedValue(mockImage);
      const updatedImage = { ...mockImage, ...updateData };
      mockPrisma.serviceImage.update.mockResolvedValue(updatedImage);

      // Act
      const result = await imageService.updateImageMetadata(
        mockServiceId,
        mockImageId,
        mockContractorId,
        updateData
      );

      // Assert
      expect(result.altText).toBe(updateData.altText);
      expect(result.order).toBe(updateData.order);
      expect(mockPrisma.serviceImage.update).toHaveBeenCalledWith({
        where: { id: mockImageId },
        data: {
          order: updateData.order,
          altText: updateData.altText,
        },
      });
    });

    it('should update only altText', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockPrisma.serviceImage.findUnique.mockResolvedValue(mockImage);
      const updatedImage = { ...mockImage, altText: 'New alt text' };
      mockPrisma.serviceImage.update.mockResolvedValue(updatedImage);

      // Act
      await imageService.updateImageMetadata(mockServiceId, mockImageId, mockContractorId, {
        altText: 'New alt text',
      });

      // Assert
      expect(mockPrisma.serviceImage.update).toHaveBeenCalledWith({
        where: { id: mockImageId },
        data: {
          altText: 'New alt text',
        },
      });
    });

    it('should throw ServiceImageNotFoundError if image does not exist', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockPrisma.serviceImage.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        imageService.updateImageMetadata(
          mockServiceId,
          mockImageId,
          mockContractorId,
          updateData
        )
      ).rejects.toThrow(ServiceImageNotFoundError);
    });

    it('should throw UnauthorizedServiceActionError for non-owner', async () => {
      // Arrange
      mockPrisma.service.findUnique.mockResolvedValue(mockService);

      // Act & Assert
      await expect(
        imageService.updateImageMetadata(
          mockServiceId,
          mockImageId,
          'other-user-123',
          updateData
        )
      ).rejects.toThrow(UnauthorizedServiceActionError);
    });
  });

  describe('getServiceImages', () => {
    it('should return all images for service ordered by order field', async () => {
      // Arrange
      const images = [
        { ...mockImage, id: 'image-1', order: 0 },
        { ...mockImage, id: 'image-2', order: 1 },
        { ...mockImage, id: 'image-3', order: 2 },
      ];
      mockPrisma.serviceImage.findMany.mockResolvedValue(images);

      // Act
      const result = await imageService.getServiceImages(mockServiceId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].order).toBe(0);
      expect(result[1].order).toBe(1);
      expect(result[2].order).toBe(2);
      expect(mockPrisma.serviceImage.findMany).toHaveBeenCalledWith({
        where: { serviceId: mockServiceId },
        orderBy: { order: 'asc' },
      });
    });

    it('should return empty array if service has no images', async () => {
      // Arrange
      mockPrisma.serviceImage.findMany.mockResolvedValue([]);

      // Act
      const result = await imageService.getServiceImages(mockServiceId);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
