/**
 * Unit tests for ServiceRepository
 * Uses mocked Prisma client to test repository logic without database
 *
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Prisma, VisibilityStatus } from '@prisma/client';
import { ServiceRepository } from '../serviceRepository';
import { ServiceNotFoundError } from '../../errors';
import type { CreateServiceDTO, UpdateServiceDTO, ServiceStatus } from '../../types';

// Mock prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    service: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    serviceImage: {
      count: jest.fn(),
    },
  },
}));

// Import mocked prisma
import { prisma } from '@/lib/db';

describe('ServiceRepository Unit Tests', () => {
  let repository: ServiceRepository;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new ServiceRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('TC-SERVICE-001: should create service with DRAFT status', async () => {
      // Arrange
      const contractorId = 'contractor-123';
      const createData: CreateServiceDTO = {
        title: 'Plumbing Repair',
        categoryId: 'category-123',
        description: 'Professional plumbing repair service with 10 years of experience',
        basePrice: 500.0,
        currency: 'MXN' as any,
        durationMinutes: 120,
      };

      const mockCreatedService = {
        id: 'service-123',
        contractorId,
        categoryId: 'category-123',
        title: 'Plumbing Repair',
        description: 'Professional plumbing repair service with 10 years of experience',
        basePrice: new Prisma.Decimal(500.0),
        currency: 'MXN',
        durationMinutes: 120,
        visibilityStatus: VisibilityStatus.DRAFT,
        lastPublishedAt: null,
        locationLat: null,
        locationLng: null,
        locationAddress: null,
        coverageRadiusKm: null,
        status: 'ACTIVE' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'category-123',
          name: 'Plumbing',
          slug: 'plumbing',
          iconUrl: null,
        },
        contractor: {
          contractorProfile: {
            id: 'profile-123',
            businessName: 'Test Business',
            verified: true,
          },
        },
        serviceImages: [],
      };

      mockPrisma.service.create.mockResolvedValue(mockCreatedService as any);

      // Act
      const result = await repository.create(contractorId, createData);

      // Assert
      expect(mockPrisma.service.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contractorId,
          categoryId: createData.categoryId,
          title: createData.title,
          description: createData.description,
          currency: createData.currency,
          durationMinutes: createData.durationMinutes,
          visibilityStatus: VisibilityStatus.DRAFT,
        }),
        include: expect.any(Object),
      });
      expect(result.id).toBe('service-123');
      expect(result.visibilityStatus).toBe('DRAFT');
      expect(result.title).toBe('Plumbing Repair');
      expect(result.basePrice).toBe(500.0);
    });
  });

  describe('findById', () => {
    it('TC-SERVICE-002: should return service when found', async () => {
      // Arrange
      const serviceId = 'service-123';
      const mockService = {
        id: serviceId,
        contractorId: 'contractor-123',
        categoryId: 'category-123',
        title: 'Test Service',
        description: 'A test service description that meets minimum length requirements',
        basePrice: new Prisma.Decimal(100.0),
        currency: 'MXN',
        durationMinutes: 60,
        visibilityStatus: VisibilityStatus.ACTIVE,
        lastPublishedAt: new Date(),
        locationLat: null,
        locationLng: null,
        locationAddress: null,
        coverageRadiusKm: null,
        status: 'ACTIVE' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.service.findUnique.mockResolvedValue(mockService as any);

      // Act
      const result = await repository.findById(serviceId);

      // Assert
      expect(mockPrisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: serviceId },
        include: undefined,
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe(serviceId);
      expect(result?.title).toBe('Test Service');
    });

    it('TC-SERVICE-003: should return null when service not found', async () => {
      // Arrange
      const serviceId = 'nonexistent-123';
      mockPrisma.service.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById(serviceId);

      // Assert
      expect(result).toBeNull();
    });

    it('TC-SERVICE-004: should include relations when requested', async () => {
      // Arrange
      const serviceId = 'service-123';
      const mockServiceWithRelations = {
        id: serviceId,
        contractorId: 'contractor-123',
        categoryId: 'category-123',
        title: 'Test Service',
        description: 'A test service description that meets minimum length requirements',
        basePrice: new Prisma.Decimal(100.0),
        currency: 'MXN',
        durationMinutes: 60,
        visibilityStatus: VisibilityStatus.ACTIVE,
        lastPublishedAt: new Date(),
        locationLat: null,
        locationLng: null,
        locationAddress: null,
        coverageRadiusKm: null,
        status: 'ACTIVE' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'category-123',
          name: 'Plumbing',
          slug: 'plumbing',
          iconUrl: null,
        },
        contractor: {
          contractorProfile: {
            id: 'profile-123',
            businessName: 'Test Business',
            verified: true,
          },
        },
        serviceImages: [],
      };

      mockPrisma.service.findUnique.mockResolvedValue(mockServiceWithRelations as any);

      // Act
      const result = await repository.findById(serviceId, true);

      // Assert
      expect(mockPrisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: serviceId },
        include: expect.objectContaining({
          category: true,
          contractor: expect.any(Object),
          serviceImages: expect.any(Object),
        }),
      });
      expect(result?.category).toBeDefined();
      expect(result?.contractor).toBeDefined();
    });
  });

  describe('findByContractorId', () => {
    it('TC-SERVICE-005: should return all services for contractor', async () => {
      // Arrange
      const contractorId = 'contractor-123';
      const mockServices = [
        {
          id: 'service-1',
          contractorId,
          categoryId: 'category-1',
          title: 'Service 1',
          description: 'Description for service 1 with sufficient length to meet requirements',
          basePrice: new Prisma.Decimal(100.0),
          currency: 'MXN',
          durationMinutes: 60,
          visibilityStatus: VisibilityStatus.ACTIVE,
          lastPublishedAt: new Date(),
          locationLat: null,
          locationLng: null,
          locationAddress: null,
          coverageRadiusKm: null,
          status: 'ACTIVE' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: null,
          contractor: null,
          serviceImages: [],
        },
        {
          id: 'service-2',
          contractorId,
          categoryId: 'category-2',
          title: 'Service 2',
          description: 'Description for service 2 with sufficient length to meet requirements',
          basePrice: new Prisma.Decimal(200.0),
          currency: 'MXN',
          durationMinutes: 90,
          visibilityStatus: VisibilityStatus.DRAFT,
          lastPublishedAt: null,
          locationLat: null,
          locationLng: null,
          locationAddress: null,
          coverageRadiusKm: null,
          status: 'ACTIVE' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: null,
          contractor: null,
          serviceImages: [],
        },
      ];

      mockPrisma.service.findMany.mockResolvedValue(mockServices as any);

      // Act
      const result = await repository.findByContractorId(contractorId);

      // Assert
      expect(mockPrisma.service.findMany).toHaveBeenCalledWith({
        where: { contractorId },
        include: expect.any(Object),
        orderBy: expect.any(Array),
        skip: 0,
        take: 20,
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('service-1');
      expect(result[1].id).toBe('service-2');
    });

    it('TC-SERVICE-006: should filter by visibility status', async () => {
      // Arrange
      const contractorId = 'contractor-123';
      const status: ServiceStatus = 'ACTIVE';
      mockPrisma.service.findMany.mockResolvedValue([]);

      // Act
      await repository.findByContractorId(contractorId, { visibilityStatus: status });

      // Assert
      expect(mockPrisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contractorId,
            visibilityStatus: VisibilityStatus.ACTIVE,
          }),
        })
      );
    });

    it('TC-SERVICE-007: should apply pagination', async () => {
      // Arrange
      const contractorId = 'contractor-123';
      mockPrisma.service.findMany.mockResolvedValue([]);

      // Act
      await repository.findByContractorId(contractorId, { page: 2, limit: 10 });

      // Assert
      expect(mockPrisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * 10
          take: 10,
        })
      );
    });
  });

  describe('findPublicServices', () => {
    it('TC-SERVICE-008: should only return ACTIVE services', async () => {
      // Arrange
      mockPrisma.service.findMany.mockResolvedValue([]);

      // Act
      await repository.findPublicServices();

      // Assert
      expect(mockPrisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibilityStatus: VisibilityStatus.ACTIVE,
          }),
        })
      );
    });

    it('TC-SERVICE-009: should apply price filters', async () => {
      // Arrange
      mockPrisma.service.findMany.mockResolvedValue([]);

      // Act
      await repository.findPublicServices({ minPrice: 100, maxPrice: 500 });

      // Assert
      expect(mockPrisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            basePrice: expect.objectContaining({
              gte: expect.any(Object),
              lte: expect.any(Object),
            }),
          }),
        })
      );
    });
  });

  describe('update', () => {
    it('TC-SERVICE-010: should update service data', async () => {
      // Arrange
      const serviceId = 'service-123';
      const updateData: UpdateServiceDTO = {
        title: 'Updated Title',
        basePrice: 600.0,
      };

      const mockExisting = {
        id: serviceId,
        contractorId: 'contractor-123',
        categoryId: 'category-123',
        title: 'Original Title',
        description: 'Description that meets minimum requirements for service updates',
        basePrice: new Prisma.Decimal(500.0),
        currency: 'MXN',
        durationMinutes: 120,
        visibilityStatus: VisibilityStatus.DRAFT,
        lastPublishedAt: null,
        locationLat: null,
        locationLng: null,
        locationAddress: null,
        coverageRadiusKm: null,
        status: 'ACTIVE' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated = {
        ...mockExisting,
        title: 'Updated Title',
        basePrice: new Prisma.Decimal(600.0),
        category: null,
        contractor: null,
        serviceImages: [],
      };

      mockPrisma.service.findUnique.mockResolvedValue(mockExisting as any);
      mockPrisma.service.update.mockResolvedValue(mockUpdated as any);

      // Act
      const result = await repository.update(serviceId, updateData);

      // Assert
      expect(result.title).toBe('Updated Title');
      expect(result.basePrice).toBe(600.0);
    });

    it('TC-SERVICE-011: should throw error if service not found', async () => {
      // Arrange
      const serviceId = 'nonexistent-123';
      mockPrisma.service.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(repository.update(serviceId, { title: 'New Title' })).rejects.toThrow(
        ServiceNotFoundError
      );
    });
  });

  describe('updateStatus', () => {
    it('TC-SERVICE-012: should update status and set lastPublishedAt when publishing', async () => {
      // Arrange
      const serviceId = 'service-123';
      const mockExisting = {
        id: serviceId,
        contractorId: 'contractor-123',
        visibilityStatus: VisibilityStatus.DRAFT,
      };

      const mockUpdated = {
        ...mockExisting,
        visibilityStatus: VisibilityStatus.ACTIVE,
        lastPublishedAt: new Date(),
        basePrice: new Prisma.Decimal(100.0),
        title: 'Test',
        description: 'Test description',
        categoryId: 'cat-123',
        currency: 'MXN',
        durationMinutes: 60,
        locationLat: null,
        locationLng: null,
        locationAddress: null,
        coverageRadiusKm: null,
        status: 'ACTIVE' as any,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
        contractor: null,
        serviceImages: [],
      };

      mockPrisma.service.findUnique.mockResolvedValue(mockExisting as any);
      mockPrisma.service.update.mockResolvedValue(mockUpdated as any);

      // Act
      await repository.updateStatus(serviceId, 'ACTIVE');

      // Assert
      expect(mockPrisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visibilityStatus: VisibilityStatus.ACTIVE,
            lastPublishedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('softDelete', () => {
    it('TC-SERVICE-013: should set status to ARCHIVED', async () => {
      // Arrange
      const serviceId = 'service-123';
      const mockExisting = {
        id: serviceId,
        contractorId: 'contractor-123',
        visibilityStatus: VisibilityStatus.ACTIVE,
      };

      mockPrisma.service.findUnique.mockResolvedValue(mockExisting as any);
      mockPrisma.service.update.mockResolvedValue({} as any);

      // Act
      await repository.softDelete(serviceId);

      // Assert
      expect(mockPrisma.service.update).toHaveBeenCalledWith({
        where: { id: serviceId },
        data: {
          visibilityStatus: VisibilityStatus.ARCHIVED,
        },
      });
    });
  });

  describe('hardDelete', () => {
    it('TC-SERVICE-014: should delete service if never published', async () => {
      // Arrange
      const serviceId = 'service-123';
      const mockExisting = {
        id: serviceId,
        lastPublishedAt: null,
      };

      mockPrisma.service.findUnique.mockResolvedValue(mockExisting as any);
      mockPrisma.service.delete.mockResolvedValue({} as any);

      // Act
      await repository.hardDelete(serviceId);

      // Assert
      expect(mockPrisma.service.delete).toHaveBeenCalledWith({
        where: { id: serviceId },
      });
    });

    it('TC-SERVICE-015: should throw error if service was published', async () => {
      // Arrange
      const serviceId = 'service-123';
      const mockExisting = {
        id: serviceId,
        lastPublishedAt: new Date(),
      };

      mockPrisma.service.findUnique.mockResolvedValue(mockExisting as any);

      // Act & Assert
      await expect(repository.hardDelete(serviceId)).rejects.toThrow(
        'Cannot permanently delete a service that was previously published'
      );
    });
  });

  describe('countByContractor', () => {
    it('TC-SERVICE-016: should count all services for contractor', async () => {
      // Arrange
      const contractorId = 'contractor-123';
      mockPrisma.service.count.mockResolvedValue(5);

      // Act
      const result = await repository.countByContractor(contractorId);

      // Assert
      expect(mockPrisma.service.count).toHaveBeenCalledWith({
        where: { contractorId },
      });
      expect(result).toBe(5);
    });

    it('TC-SERVICE-017: should count services with status filter', async () => {
      // Arrange
      const contractorId = 'contractor-123';
      mockPrisma.service.count.mockResolvedValue(3);

      // Act
      const result = await repository.countByContractor(contractorId, 'ACTIVE');

      // Assert
      expect(mockPrisma.service.count).toHaveBeenCalledWith({
        where: {
          contractorId,
          visibilityStatus: VisibilityStatus.ACTIVE,
        },
      });
      expect(result).toBe(3);
    });
  });

  describe('isOwnedBy', () => {
    it('TC-SERVICE-018: should return true if service belongs to contractor', async () => {
      // Arrange
      const serviceId = 'service-123';
      const contractorId = 'contractor-123';
      mockPrisma.service.findUnique.mockResolvedValue({ contractorId } as any);

      // Act
      const result = await repository.isOwnedBy(serviceId, contractorId);

      // Assert
      expect(result).toBe(true);
    });

    it('TC-SERVICE-019: should return false if service belongs to different contractor', async () => {
      // Arrange
      const serviceId = 'service-123';
      const contractorId = 'contractor-123';
      mockPrisma.service.findUnique.mockResolvedValue({
        contractorId: 'different-contractor',
      } as any);

      // Act
      const result = await repository.isOwnedBy(serviceId, contractorId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isContractorVerified', () => {
    it('TC-SERVICE-020: should return true if contractor is verified', async () => {
      // Arrange
      const contractorId = 'contractor-123';
      mockPrisma.user.findUnique.mockResolvedValue({
        id: contractorId,
        contractorProfile: {
          verified: true,
        },
      } as any);

      // Act
      const result = await repository.isContractorVerified(contractorId);

      // Assert
      expect(result).toBe(true);
    });

    it('TC-SERVICE-021: should return false if contractor is not verified', async () => {
      // Arrange
      const contractorId = 'contractor-123';
      mockPrisma.user.findUnique.mockResolvedValue({
        id: contractorId,
        contractorProfile: {
          verified: false,
        },
      } as any);

      // Act
      const result = await repository.isContractorVerified(contractorId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('countImages', () => {
    it('TC-SERVICE-022: should return image count for service', async () => {
      // Arrange
      const serviceId = 'service-123';
      mockPrisma.serviceImage.count.mockResolvedValue(3);

      // Act
      const result = await repository.countImages(serviceId);

      // Assert
      expect(mockPrisma.serviceImage.count).toHaveBeenCalledWith({
        where: { serviceId },
      });
      expect(result).toBe(3);
    });
  });
});
