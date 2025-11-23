/**
 * Integration tests for service image upload API endpoints
 * TC-SERVICE-031 through TC-SERVICE-038
 *
 * @jest-environment node
 */

import { POST as generatePresignedUrl } from '../../../app/api/services/[id]/images/upload-url/route';
import { POST as confirmUpload } from '../../../app/api/services/[id]/images/confirm/route';
import { DELETE as deleteImage } from '../../../app/api/services/[id]/images/[imageId]/route';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    service: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    serviceImage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
  db: {
    service: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    serviceImage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock authentication
jest.mock('@/modules/auth/utils/requireRole', () => ({
  requireRole: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

// Mock AWS S3
jest.mock('@/lib/aws/s3Client', () => ({
  getS3Client: jest.fn(() => ({
    send: jest.fn(),
  })),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(() => Promise.resolve('https://mock-presigned-url.com')),
}));

import { prisma } from '@/lib/db';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { ForbiddenError, UnauthorizedError } from '@/modules/auth/errors';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getS3Client } from '@/lib/aws/s3Client';

// Helper to create mock requests
const createMockRequest = (body?: any) => {
  const url = 'http://localhost:3000';
  return {
    json: async () => body || {},
    headers: new Headers(),
    url,
    nextUrl: new URL(url),
  } as unknown as NextRequest;
};

// Test fixtures
const mockContractorUser = {
  id: 'user-contractor-1',
  clerkUserId: 'clerk_contractor_1',
  email: 'contractor@example.com',
  firstName: 'Juan',
  lastName: 'García',
  phone: '5551234567',
  avatarUrl: null,
  role: 'CONTRACTOR',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockService = {
  id: 'service-1',
  contractorId: 'user-contractor-1',
  categoryId: 'category-plumbing',
  title: 'Reparación de tuberías',
  description: 'Servicio profesional',
  pricePerHour: 350.0,
  estimatedDuration: 2,
  visibilityStatus: 'DRAFT',
  lastPublishedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockServiceImage = {
  id: 'image-1',
  serviceId: 'service-1',
  s3Url: 'https://s3.amazonaws.com/bucket/services/service-1/image1.jpg',
  s3Key: 'services/service-1/image1.jpg',
  altText: 'Plumbing service image',
  displayOrder: 1,
  width: 1200,
  height: 800,
  createdAt: new Date('2024-01-01'),
};

describe('Service Image Upload Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/services/:id/images/upload-url', () => {
    it('TC-SERVICE-031: should generate presigned URL for valid image upload', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.serviceImage.count as jest.Mock).mockResolvedValue(2); // Has 2 images, can add more

      const mockPresignedUrl = 'https://s3.amazonaws.com/bucket/presigned-url?signature=abc123';
      const mockS3Key = 'services/service-1/image-new.jpg';

      (getSignedUrl as jest.Mock).mockResolvedValue(mockPresignedUrl);

      const requestData = {
        fileName: 'plumbing-work.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2048000, // 2 MB
      };

      // Act
      const req = createMockRequest(requestData);
      const response = await generatePresignedUrl(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.presignedUrl).toBeDefined();
      expect(data.s3Key).toBeDefined();
      expect(data.expiresAt).toBeDefined();
      expect(requireRole).toHaveBeenCalledWith('CONTRACTOR');
    });

    it('TC-SERVICE-032: should reject invalid MIME type (400)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.serviceImage.count as jest.Mock).mockResolvedValue(2);

      const requestData = {
        fileName: 'document.pdf',
        mimeType: 'application/pdf', // Invalid MIME type
        fileSize: 1024000,
      };

      // Act
      const req = createMockRequest(requestData);
      const response = await generatePresignedUrl(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('TC-SERVICE-033: should reject file size exceeding limit (400)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.serviceImage.count as jest.Mock).mockResolvedValue(2);

      const requestData = {
        fileName: 'huge-image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 15 * 1024 * 1024, // 15 MB (exceeds 10 MB limit)
      };

      // Act
      const req = createMockRequest(requestData);
      const response = await generatePresignedUrl(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('tamaño');
    });

    it('TC-SERVICE-034: should reject when max images exceeded (400)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.serviceImage.count as jest.Mock).mockResolvedValue(10); // Max images reached

      const requestData = {
        fileName: 'extra-image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2048000,
      };

      // Act
      const req = createMockRequest(requestData);
      const response = await generatePresignedUrl(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('máximo');
    });

    it('TC-SERVICE-035: should reject upload for non-owner (403)', async () => {
      // Arrange
      const otherContractor = { ...mockContractorUser, id: 'other-contractor' };
      (requireRole as jest.Mock).mockResolvedValue(otherContractor);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);

      const requestData = {
        fileName: 'image.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2048000,
      };

      // Act
      const req = createMockRequest(requestData);
      const response = await generatePresignedUrl(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toContain('permiso');
    });
  });

  describe('POST /api/services/:id/images/confirm', () => {
    it('TC-SERVICE-036: should confirm upload and save image metadata', async () => {
      // Arrange
      const mockS3Client = { send: jest.fn().mockResolvedValue({ ContentLength: 2048000 }) };
      (getS3Client as jest.Mock).mockReturnValue(mockS3Client);
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.serviceImage.count as jest.Mock).mockResolvedValue(2);
      (prisma.serviceImage.create as jest.Mock).mockResolvedValue(mockServiceImage);

      const confirmData = {
        s3Url: 'https://s3.amazonaws.com/bucket/services/service-1/image1.jpg',
        s3Key: 'services/service-1/image1.jpg',
        width: 1200,
        height: 800,
        altText: 'Plumbing service image',
      };

      // Act
      const req = createMockRequest(confirmData);
      const response = await confirmUpload(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.id).toBe('image-1');
      expect(data.s3Url).toBe(confirmData.s3Url);
      expect(data.s3Key).toBe(confirmData.s3Key);
      expect(data.width).toBe(1200);
      expect(data.height).toBe(800);
      expect(prisma.serviceImage.create).toHaveBeenCalled();
    });

    it('TC-SERVICE-037: should reject confirm if S3 object not found (404)', async () => {
      // Arrange
      const mockS3Client = { send: jest.fn().mockRejectedValue(new Error('NotFound')) };
      (getS3Client as jest.Mock).mockReturnValue(mockS3Client);
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);

      const confirmData = {
        s3Url: 'https://s3.amazonaws.com/bucket/services/service-1/nonexistent.jpg',
        s3Key: 'services/service-1/nonexistent.jpg',
        width: 1200,
        height: 800,
      };

      // Act
      const req = createMockRequest(confirmData);
      const response = await confirmUpload(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toContain('no se encontró');
      expect(prisma.serviceImage.create).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-038: should reject confirm with invalid dimensions (400)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);

      const invalidData = {
        s3Url: 'https://s3.amazonaws.com/bucket/image.jpg',
        s3Key: 'services/service-1/image.jpg',
        width: 0, // Invalid width
        height: -100, // Invalid height
      };

      // Act
      const req = createMockRequest(invalidData);
      const response = await confirmUpload(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos inválidos');
      expect(data.details).toBeDefined();
      expect(prisma.serviceImage.create).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/services/:id/images/:imageId', () => {
    it('TC-SERVICE-039: should delete image from S3 and database', async () => {
      // Arrange
      const mockS3Client = { send: jest.fn().mockResolvedValue({}) };
      (getS3Client as jest.Mock).mockReturnValue(mockS3Client);
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(mockServiceImage);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.serviceImage.delete as jest.Mock).mockResolvedValue(mockServiceImage);

      // Act
      const req = createMockRequest();
      const response = await deleteImage(req, {
        params: { id: 'service-1', imageId: 'image-1' },
      });

      // Assert
      expect(response.status).toBe(204);
      expect(mockS3Client.send).toHaveBeenCalled();
      expect(prisma.serviceImage.delete).toHaveBeenCalledWith({
        where: { id: 'image-1' },
      });
    });

    it('TC-SERVICE-040: should reject delete from non-owner (403)', async () => {
      // Arrange
      const otherContractor = { ...mockContractorUser, id: 'other-contractor' };
      (requireRole as jest.Mock).mockResolvedValue(otherContractor);
      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(mockServiceImage);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);

      // Act
      const req = createMockRequest();
      const response = await deleteImage(req, {
        params: { id: 'service-1', imageId: 'image-1' },
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toContain('permiso');
      expect(prisma.serviceImage.delete).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-041: should return 404 for non-existent image', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.serviceImage.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const req = createMockRequest();
      const response = await deleteImage(req, {
        params: { id: 'service-1', imageId: 'nonexistent' },
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toContain('no encontrada');
      expect(prisma.serviceImage.delete).not.toHaveBeenCalled();
    });
  });

  describe('Image validation edge cases', () => {
    it('TC-SERVICE-042: should accept WebP format', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.serviceImage.count as jest.Mock).mockResolvedValue(2);

      const mockPresignedUrl = 'https://s3.amazonaws.com/bucket/presigned-url';
      (getSignedUrl as jest.Mock).mockResolvedValue(mockPresignedUrl);

      const requestData = {
        fileName: 'image.webp',
        mimeType: 'image/webp',
        fileSize: 1500000,
      };

      // Act
      const req = createMockRequest(requestData);
      const response = await generatePresignedUrl(req, { params: { id: 'service-1' } });

      // Assert
      expect(response.status).toBe(200);
    });

    it('TC-SERVICE-043: should accept PNG format', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.serviceImage.count as jest.Mock).mockResolvedValue(2);

      const mockPresignedUrl = 'https://s3.amazonaws.com/bucket/presigned-url';
      (getSignedUrl as jest.Mock).mockResolvedValue(mockPresignedUrl);

      const requestData = {
        fileName: 'image.png',
        mimeType: 'image/png',
        fileSize: 3000000,
      };

      // Act
      const req = createMockRequest(requestData);
      const response = await generatePresignedUrl(req, { params: { id: 'service-1' } });

      // Assert
      expect(response.status).toBe(200);
    });
  });
});
