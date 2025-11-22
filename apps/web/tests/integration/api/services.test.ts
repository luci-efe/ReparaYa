/**
 * Integration tests for services API endpoints
 * TC-SERVICE-012 through TC-SERVICE-024
 *
 * @jest-environment node
 */

import {
  POST as createService,
  GET as getActiveServices,
} from '../../../app/api/services/route';
import {
  GET as getServiceById,
  PATCH as updateService,
  DELETE as deleteService,
} from '../../../app/api/services/[id]/route';
import { GET as getContractorServices } from '../../../app/api/services/me/route';
import { PATCH as publishService } from '../../../app/api/services/[id]/publish/route';
import { PATCH as pauseService } from '../../../app/api/services/[id]/pause/route';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    service: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    serviceCategory: {
      findUnique: jest.fn(),
    },
    contractorProfile: {
      findUnique: jest.fn(),
    },
    serviceImage: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
  db: {
    service: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    serviceCategory: {
      findUnique: jest.fn(),
    },
    contractorProfile: {
      findUnique: jest.fn(),
    },
    serviceImage: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock authentication
jest.mock('@/modules/auth/utils/requireRole', () => ({
  requireRole: jest.fn(),
  requireAnyRole: jest.fn(),
}));

jest.mock('@/modules/auth/utils/requireAuth', () => ({
  requireAuth: jest.fn(),
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
import { requireRole, requireAnyRole } from '@/modules/auth/utils/requireRole';
import { requireAuth } from '@/modules/auth/utils/requireAuth';
import { ForbiddenError, UnauthorizedError } from '@/modules/auth/errors';

// Helper to create mock requests
const createMockRequest = (body?: any, searchParams?: Record<string, string>) => {
  const url = searchParams
    ? `http://localhost:3000?${new URLSearchParams(searchParams).toString()}`
    : 'http://localhost:3000';

  return {
    json: async () => body || {},
    headers: new Headers(),
    url,
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

const mockContractorProfile = {
  id: 'contractor-profile-1',
  userId: 'user-contractor-1',
  businessName: 'García Plumbing',
  description: 'Professional plumbing services',
  specialties: ['plumbing'],
  verified: true,
  verificationDocuments: {},
  stripeConnectAccountId: 'acct_123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockCategory = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Plomería',
  description: 'Servicios de plomería',
  iconUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockService = {
  id: 'service-1',
  contractorId: 'user-contractor-1',
  categoryId: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Reparación de tuberías',
  description: 'Servicio profesional de reparación de tuberías para hogar y negocio. Incluye diagnóstico y reparación.',
  basePrice: { toNumber: () => 350.0 },
  durationMinutes: 120,
  visibilityStatus: 'DRAFT',
  lastPublishedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  category: mockCategory,
  images: [],
  contractor: {
    id: 'user-contractor-1',
    firstName: 'Juan',
    lastName: 'García',
    contractorProfile: mockContractorProfile,
  },
};

const mockActiveService = {
  ...mockService,
  id: 'service-2',
  visibilityStatus: 'ACTIVE',
  lastPublishedAt: new Date('2024-01-02'),
  images: [
    {
      id: 'image-1',
      serviceId: 'service-2',
      s3Url: 'https://s3.amazonaws.com/bucket/image1.jpg',
      s3Key: 'services/service-2/image1.jpg',
      altText: 'Plumbing service',
      displayOrder: 1,
      width: 800,
      height: 600,
      createdAt: new Date('2024-01-01'),
    },
  ],
};

describe('Service CRUD Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/services', () => {
    it('TC-SERVICE-012: should create a new service successfully (CONTRACTOR)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.serviceCategory.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockContractorProfile);
      (prisma.service.create as jest.Mock).mockResolvedValue(mockService);

      const createData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para hogar y negocio. Incluye diagnóstico y reparación.',
        basePrice: 350.0,
        durationMinutes: 120,
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createService(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.id).toBe('service-1');
      expect(data.title).toBe('Reparación de tuberías');
      expect(data.visibilityStatus).toBe('DRAFT');
      expect(data.contractorId).toBe('user-contractor-1');
      expect(requireRole).toHaveBeenCalledWith('CONTRACTOR');
      expect(prisma.service.create).toHaveBeenCalled();
    });

    it('TC-SERVICE-013: should reject creation with invalid data (400)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);

      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Ab', // Too short (min 3 chars)
        description: 'Short', // Too short (min 10 chars)
        basePrice: -50, // Negative price
        durationMinutes: 0, // Zero duration
      };

      // Act
      const req = createMockRequest(invalidData);
      const response = await createService(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos inválidos');
      expect(data.details).toBeDefined();
      expect(prisma.service.create).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-014: should reject creation if category does not exist (404)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.serviceCategory.findUnique as jest.Mock).mockResolvedValue(null);

      const createData = {
        categoryId: '999e4567-e89b-12d3-a456-426614174999',
        title: 'Test Service',
        description: 'Test description with enough characters to pass validation',
        basePrice: 350.0,
        durationMinutes: 120,
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createService(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toContain('Categoría');
      expect(prisma.service.create).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-015: should reject creation for non-CONTRACTOR users (403)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockRejectedValue(
        new ForbiddenError('Solo usuarios con rol CONTRACTOR pueden acceder a este recurso')
      );

      const createData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Service',
        description: 'Test description with enough characters',
        basePrice: 350.0,
        durationMinutes: 120,
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createService(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(prisma.service.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/services/:id', () => {
    it('TC-SERVICE-016: should return ACTIVE service for public users', async () => {
      // Arrange
      (requireAuth as jest.Mock).mockRejectedValue(new UnauthorizedError('Not authenticated'));
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockActiveService);

      // Act
      const response = await getServiceById(createMockRequest(), { params: { id: 'service-2' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.id).toBe('service-2');
      expect(data.title).toBe(mockActiveService.title);
      expect(data.visibilityStatus).toBe('ACTIVE');
    });

    it('TC-SERVICE-017: should return DRAFT service for owner', async () => {
      // Arrange
      (requireAuth as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);

      // Act
      const response = await getServiceById(createMockRequest(), { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.id).toBe('service-1');
      expect(data.visibilityStatus).toBe('DRAFT');
    });

    it('TC-SERVICE-018: should return 404 for non-existent service', async () => {
      // Arrange
      (requireAuth as jest.Mock).mockRejectedValue(new UnauthorizedError('Not authenticated'));
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await getServiceById(createMockRequest(), { params: { id: 'nonexistent' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toContain('no encontrado');
    });
  });

  describe('GET /api/services', () => {
    it('TC-SERVICE-019: should list active services (public catalog)', async () => {
      // Arrange
      const mockPaginatedResult = {
        services: [mockActiveService],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockActiveService]);
      (prisma.service.count as jest.Mock).mockResolvedValue(1);

      // Act
      const req = createMockRequest(undefined, { page: '1', limit: '10' });
      const response = await getActiveServices(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.services).toHaveLength(1);
      expect(data.services[0].visibilityStatus).toBe('ACTIVE');
      expect(data.pagination.total).toBe(1);
    });

    it('TC-SERVICE-020: should filter services by category', async () => {
      // Arrange
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockActiveService]);
      (prisma.service.count as jest.Mock).mockResolvedValue(1);

      // Act
      const req = createMockRequest(undefined, { categoryId: '123e4567-e89b-12d3-a456-426614174000' });
      const response = await getActiveServices(req);

      // Assert
      expect(response.status).toBe(200);
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: '123e4567-e89b-12d3-a456-426614174000',
          }),
        })
      );
    });
  });

  describe('GET /api/services/me', () => {
    it('TC-SERVICE-021: should list all services owned by contractor', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockService, mockActiveService]);

      // Act
      const req = createMockRequest();
      const response = await getContractorServices(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(requireRole).toHaveBeenCalledWith('CONTRACTOR');
    });

    it('TC-SERVICE-022: should filter contractor services by status', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockActiveService]);

      // Act
      const req = createMockRequest(undefined, { status: 'ACTIVE' });
      const response = await getContractorServices(req);

      // Assert
      expect(response.status).toBe(200);
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contractorId: mockContractorUser.id,
            visibilityStatus: 'ACTIVE',
          }),
        })
      );
    });
  });

  describe('PATCH /api/services/:id', () => {
    it('TC-SERVICE-023: should update service successfully (owner)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.serviceCategory.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (prisma.service.update as jest.Mock).mockResolvedValue({
        ...mockService,
        title: 'Reparación de tuberías residenciales',
        basePrice: { toNumber: () => 400.0 },
      });

      const updateData = {
        title: 'Reparación de tuberías residenciales',
        basePrice: 400.0,
      };

      // Act
      const req = createMockRequest(updateData);
      const response = await updateService(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.title).toBe('Reparación de tuberías residenciales');
      expect(data.basePrice).toBe(400.0);
      expect(prisma.service.update).toHaveBeenCalled();
    });

    it('TC-SERVICE-024: should reject update from non-owner (403)', async () => {
      // Arrange
      const otherContractor = { ...mockContractorUser, id: 'other-contractor' };
      (requireRole as jest.Mock).mockResolvedValue(otherContractor);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);

      const updateData = {
        title: 'Unauthorized update',
      };

      // Act
      const req = createMockRequest(updateData);
      const response = await updateService(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(prisma.service.update).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/services/:id/publish', () => {
    it('TC-SERVICE-025: should publish service successfully (DRAFT → ACTIVE)', async () => {
      // Arrange
      const serviceWithImage = { ...mockService, images: [mockActiveService.images[0]] };
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(serviceWithImage);
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockContractorProfile);
      (prisma.serviceImage.count as jest.Mock).mockResolvedValue(1);
      (prisma.service.update as jest.Mock).mockResolvedValue({
        ...serviceWithImage,
        visibilityStatus: 'ACTIVE',
        lastPublishedAt: new Date(),
      });

      // Act
      const req = createMockRequest();
      const response = await publishService(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.visibilityStatus).toBe('ACTIVE');
      expect(data.lastPublishedAt).toBeDefined();
    });

    it('TC-SERVICE-026: should reject publish without images (400)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockContractorProfile);
      (prisma.serviceImage.count as jest.Mock).mockResolvedValue(0);

      // Act
      const req = createMockRequest();
      const response = await publishService(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Requisitos');
      expect(prisma.service.update).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/services/:id/pause', () => {
    it('TC-SERVICE-027: should pause active service (ACTIVE → PAUSED)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockActiveService);
      (prisma.service.update as jest.Mock).mockResolvedValue({
        ...mockActiveService,
        visibilityStatus: 'PAUSED',
      });

      // Act
      const req = createMockRequest();
      const response = await pauseService(req, { params: { id: 'service-2' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.visibilityStatus).toBe('PAUSED');
    });

    it('TC-SERVICE-028: should reject pause of non-ACTIVE service (400)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService); // DRAFT status

      // Act
      const req = createMockRequest();
      const response = await pauseService(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(prisma.service.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/services/:id', () => {
    it('TC-SERVICE-029: should soft delete service (owner)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);
      (prisma.service.update as jest.Mock).mockResolvedValue({
        ...mockService,
        visibilityStatus: 'ARCHIVED',
      });

      // Act
      const req = createMockRequest();
      const response = await deleteService(req, { params: { id: 'service-1' } });

      // Assert
      expect(response.status).toBe(204);
      expect(prisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'service-1' },
          data: expect.objectContaining({
            visibilityStatus: 'ARCHIVED',
          }),
        })
      );
    });

    it('TC-SERVICE-030: should reject delete from non-owner (403)', async () => {
      // Arrange
      const otherContractor = { ...mockContractorUser, id: 'other-contractor' };
      (requireRole as jest.Mock).mockResolvedValue(otherContractor);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockService);

      // Act
      const req = createMockRequest();
      const response = await deleteService(req, { params: { id: 'service-1' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(prisma.service.update).not.toHaveBeenCalled();
    });
  });
});
