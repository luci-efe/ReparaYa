/**
 * Service Service Unit Tests
 *
 * Comprehensive unit tests for service business logic including:
 * - CRUD operations
 * - State machine transitions
 * - Publication requirements validation
 * - Authorization checks
 *
 * @module services/services/__tests__/serviceService
 */

import { ServiceService } from '../serviceService';
import { serviceRepository } from '../../repositories/serviceRepository';
import { PrismaClient } from '@prisma/client';
import {
  ServiceNotFoundError,
  InvalidServiceStateTransitionError,
  UnauthorizedServiceActionError,
  ServicePublicationRequirementsNotMetError,
  ServiceHasActiveBookingsError,
} from '../../errors';
import type { ServiceDTO, CreateServiceDTO, UpdateServiceDTO } from '../../types';

// Mock dependencies
jest.mock('../../repositories/serviceRepository');
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    serviceImage: {
      count: jest.fn(),
    },
    booking: {
      count: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

describe('ServiceService', () => {
  let serviceService: ServiceService;
  let mockPrisma: any;

  // Test fixtures
  const mockContractorId = 'contractor-123';
  const mockServiceId = 'service-123';
  const mockCategoryId = 'category-123';

  const mockContractor = {
    id: mockContractorId,
    role: 'CONTRACTOR',
    contractorProfile: {
      id: 'profile-123',
      verified: true,
    },
  };

  const mockCategory = {
    id: mockCategoryId,
    name: 'Plomería',
    slug: 'plomeria',
  };

  const mockDraftService: ServiceDTO = {
    id: mockServiceId,
    contractorId: mockContractorId,
    categoryId: mockCategoryId,
    title: 'Reparación de tuberías',
    description: 'Servicio profesional de reparación de tuberías con garantía de 6 meses',
    basePrice: 500,
    currency: 'MXN' as any,
    durationMinutes: 120,
    visibilityStatus: 'DRAFT',
    lastPublishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockActiveService: ServiceDTO = {
    ...mockDraftService,
    visibilityStatus: 'ACTIVE',
    lastPublishedAt: new Date(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get Prisma mock instance
    mockPrisma = new PrismaClient();

    // Create service instance
    serviceService = new ServiceService();
  });

  describe('createService', () => {
    const createData: CreateServiceDTO = {
      title: 'Reparación de tuberías',
      categoryId: mockCategoryId,
      description: 'Servicio profesional de reparación de tuberías con garantía de 6 meses',
      basePrice: 500,
      currency: 'MXN' as any,
      durationMinutes: 120,
    };

    it('should create service with DRAFT status for verified contractor', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockContractor);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);
      (serviceRepository.create as jest.Mock).mockResolvedValue(mockDraftService);

      // Act
      const result = await serviceService.createService(mockContractorId, createData);

      // Assert
      expect(result).toEqual(mockDraftService);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockContractorId },
        include: { contractorProfile: true },
      });
      expect(serviceRepository.create).toHaveBeenCalledWith(mockContractorId, createData);
    });

    it('should throw UnauthorizedServiceActionError if user is not CONTRACTOR', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockContractor,
        role: 'CLIENT',
      });

      // Act & Assert
      await expect(
        serviceService.createService(mockContractorId, createData)
      ).rejects.toThrow(UnauthorizedServiceActionError);
    });

    it('should throw error if category does not exist', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(mockContractor);
      mockPrisma.category.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        serviceService.createService(mockContractorId, createData)
      ).rejects.toThrow(`Category with ID ${mockCategoryId} not found`);
    });

    it('should throw UnauthorizedServiceActionError if user does not exist', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        serviceService.createService(mockContractorId, createData)
      ).rejects.toThrow(UnauthorizedServiceActionError);
    });
  });

  describe('getService', () => {
    it('should return ACTIVE service to unauthenticated user', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockActiveService);

      // Act
      const result = await serviceService.getService(mockServiceId);

      // Assert
      expect(result).toEqual(mockActiveService);
      expect(serviceRepository.findById).toHaveBeenCalledWith(mockServiceId, true);
    });

    it('should return DRAFT service to owner', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);

      // Act
      const result = await serviceService.getService(
        mockServiceId,
        mockContractorId,
        false
      );

      // Assert
      expect(result).toEqual(mockDraftService);
    });

    it('should throw ServiceNotFoundError for DRAFT service to non-owner', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);

      // Act & Assert
      await expect(
        serviceService.getService(mockServiceId, 'other-user-123', false)
      ).rejects.toThrow(ServiceNotFoundError);
    });

    it('should return DRAFT service to admin', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);

      // Act
      const result = await serviceService.getService(
        mockServiceId,
        'admin-123',
        true
      );

      // Assert
      expect(result).toEqual(mockDraftService);
    });

    it('should throw ServiceNotFoundError for ARCHIVED service to non-admin', async () => {
      // Arrange
      const archivedService = { ...mockDraftService, visibilityStatus: 'ARCHIVED' };
      (serviceRepository.findById as jest.Mock).mockResolvedValue(archivedService);

      // Act & Assert
      await expect(
        serviceService.getService(mockServiceId, mockContractorId, false)
      ).rejects.toThrow(ServiceNotFoundError);
    });

    it('should return ARCHIVED service to admin', async () => {
      // Arrange
      const archivedService = { ...mockDraftService, visibilityStatus: 'ARCHIVED' };
      (serviceRepository.findById as jest.Mock).mockResolvedValue(archivedService);

      // Act
      const result = await serviceService.getService(mockServiceId, 'admin-123', true);

      // Assert
      expect(result).toEqual(archivedService);
    });

    it('should throw ServiceNotFoundError if service does not exist', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        serviceService.getService(mockServiceId)
      ).rejects.toThrow(ServiceNotFoundError);
    });
  });

  describe('updateService', () => {
    const updateData: UpdateServiceDTO = {
      title: 'Reparación de tuberías actualizado',
      basePrice: 600,
    };

    it('should update DRAFT service successfully', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);
      const updatedService = { ...mockDraftService, ...updateData };
      (serviceRepository.update as jest.Mock).mockResolvedValue(updatedService);

      // Act
      const result = await serviceService.updateService(
        mockServiceId,
        mockContractorId,
        updateData
      );

      // Assert
      expect(result).toEqual(updatedService);
      expect(serviceRepository.update).toHaveBeenCalledWith(mockServiceId, updateData);
    });

    it('should re-validate ACTIVE service after update', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockActiveService);
      const updatedService = { ...mockActiveService, ...updateData };
      (serviceRepository.update as jest.Mock).mockResolvedValue(updatedService);

      // Mock validation requirements
      mockPrisma.user.findUnique.mockResolvedValue(mockContractor);
      mockPrisma.serviceImage.count.mockResolvedValue(2);

      // Act
      const result = await serviceService.updateService(
        mockServiceId,
        mockContractorId,
        updateData
      );

      // Assert
      expect(result).toEqual(updatedService);
    });

    it('should move ACTIVE service to DRAFT if requirements no longer met', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockActiveService);
      const updatedService = { ...mockActiveService, ...updateData };
      (serviceRepository.update as jest.Mock).mockResolvedValue(updatedService);

      // Mock validation failure (no images)
      mockPrisma.user.findUnique.mockResolvedValue(mockContractor);
      mockPrisma.serviceImage.count.mockResolvedValue(0);

      const draftedService = { ...updatedService, visibilityStatus: 'DRAFT' };
      (serviceRepository.updateStatus as jest.Mock).mockResolvedValue(draftedService);

      // Act
      const result = await serviceService.updateService(
        mockServiceId,
        mockContractorId,
        updateData
      );

      // Assert
      expect(result).toEqual(draftedService);
      expect(serviceRepository.updateStatus).toHaveBeenCalledWith(mockServiceId, 'DRAFT');
    });

    it('should throw UnauthorizedServiceActionError for non-owner', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);

      // Act & Assert
      await expect(
        serviceService.updateService(mockServiceId, 'other-user-123', updateData)
      ).rejects.toThrow(UnauthorizedServiceActionError);
    });

    it('should throw InvalidServiceStateTransitionError for ARCHIVED service', async () => {
      // Arrange
      const archivedService = { ...mockDraftService, visibilityStatus: 'ARCHIVED' };
      (serviceRepository.findById as jest.Mock).mockResolvedValue(archivedService);

      // Act & Assert
      await expect(
        serviceService.updateService(mockServiceId, mockContractorId, updateData)
      ).rejects.toThrow(InvalidServiceStateTransitionError);
    });

    it('should validate category if being updated', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const updateWithCategory = { ...updateData, categoryId: 'new-category-123' };
      const updatedService = { ...mockDraftService, ...updateWithCategory };
      (serviceRepository.update as jest.Mock).mockResolvedValue(updatedService);

      // Act
      await serviceService.updateService(mockServiceId, mockContractorId, updateWithCategory);

      // Assert
      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'new-category-123' },
      });
    });
  });

  describe('publishService', () => {
    it('should publish DRAFT service when all requirements met', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);
      mockPrisma.user.findUnique.mockResolvedValue(mockContractor);
      mockPrisma.serviceImage.count.mockResolvedValue(2);
      (serviceRepository.updateStatus as jest.Mock).mockResolvedValue(mockActiveService);

      // Act
      const result = await serviceService.publishService(mockServiceId, mockContractorId);

      // Assert
      expect(result).toEqual(mockActiveService);
      expect(serviceRepository.updateStatus).toHaveBeenCalledWith(mockServiceId, 'ACTIVE');
    });

    it('should throw ServicePublicationRequirementsNotMetError if contractor not verified', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);
      const unverifiedContractor = {
        ...mockContractor,
        contractorProfile: { ...mockContractor.contractorProfile, verified: false },
      };
      mockPrisma.user.findUnique.mockResolvedValue(unverifiedContractor);
      mockPrisma.serviceImage.count.mockResolvedValue(2);

      // Act & Assert
      await expect(
        serviceService.publishService(mockServiceId, mockContractorId)
      ).rejects.toThrow(ServicePublicationRequirementsNotMetError);
    });

    it('should throw ServicePublicationRequirementsNotMetError if no images', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);
      mockPrisma.user.findUnique.mockResolvedValue(mockContractor);
      mockPrisma.serviceImage.count.mockResolvedValue(0);

      // Act & Assert
      await expect(
        serviceService.publishService(mockServiceId, mockContractorId)
      ).rejects.toThrow(ServicePublicationRequirementsNotMetError);
    });

    it('should throw ServicePublicationRequirementsNotMetError if invalid price', async () => {
      // Arrange
      const invalidPriceService = { ...mockDraftService, basePrice: 25 };
      (serviceRepository.findById as jest.Mock).mockResolvedValue(invalidPriceService);
      mockPrisma.user.findUnique.mockResolvedValue(mockContractor);
      mockPrisma.serviceImage.count.mockResolvedValue(2);

      // Act & Assert
      await expect(
        serviceService.publishService(mockServiceId, mockContractorId)
      ).rejects.toThrow(ServicePublicationRequirementsNotMetError);
    });

    it('should throw UnauthorizedServiceActionError for non-owner', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);

      // Act & Assert
      await expect(
        serviceService.publishService(mockServiceId, 'other-user-123')
      ).rejects.toThrow(UnauthorizedServiceActionError);
    });

    it('should throw InvalidServiceStateTransitionError for ARCHIVED service', async () => {
      // Arrange
      const archivedService = { ...mockDraftService, visibilityStatus: 'ARCHIVED' };
      (serviceRepository.findById as jest.Mock).mockResolvedValue(archivedService);

      // Act & Assert
      await expect(
        serviceService.publishService(mockServiceId, mockContractorId)
      ).rejects.toThrow(InvalidServiceStateTransitionError);
    });
  });

  describe('pauseService', () => {
    it('should pause ACTIVE service by owner', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockActiveService);
      const pausedService = { ...mockActiveService, visibilityStatus: 'PAUSED' };
      (serviceRepository.updateStatus as jest.Mock).mockResolvedValue(pausedService);

      // Act
      const result = await serviceService.pauseService(mockServiceId, mockContractorId);

      // Assert
      expect(result).toEqual(pausedService);
      expect(serviceRepository.updateStatus).toHaveBeenCalledWith(mockServiceId, 'PAUSED');
    });

    it('should pause ACTIVE service by admin', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockActiveService);
      const pausedService = { ...mockActiveService, visibilityStatus: 'PAUSED' };
      (serviceRepository.updateStatus as jest.Mock).mockResolvedValue(pausedService);

      // Act
      const result = await serviceService.pauseService(
        mockServiceId,
        'admin-123',
        true
      );

      // Assert
      expect(result).toEqual(pausedService);
    });

    it('should throw UnauthorizedServiceActionError for non-owner non-admin', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockActiveService);

      // Act & Assert
      await expect(
        serviceService.pauseService(mockServiceId, 'other-user-123', false)
      ).rejects.toThrow(UnauthorizedServiceActionError);
    });

    it('should throw InvalidServiceStateTransitionError for DRAFT service', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);

      // Act & Assert
      await expect(
        serviceService.pauseService(mockServiceId, mockContractorId)
      ).rejects.toThrow(InvalidServiceStateTransitionError);
    });
  });

  describe('reactivateService', () => {
    const pausedService = { ...mockActiveService, visibilityStatus: 'PAUSED' };

    it('should reactivate PAUSED service when requirements still met', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(pausedService);
      mockPrisma.user.findUnique.mockResolvedValue(mockContractor);
      mockPrisma.serviceImage.count.mockResolvedValue(2);
      (serviceRepository.updateStatus as jest.Mock).mockResolvedValue(mockActiveService);

      // Act
      const result = await serviceService.reactivateService(mockServiceId, mockContractorId);

      // Assert
      expect(result).toEqual(mockActiveService);
      expect(serviceRepository.updateStatus).toHaveBeenCalledWith(mockServiceId, 'ACTIVE');
    });

    it('should throw ServicePublicationRequirementsNotMetError if requirements no longer met', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(pausedService);
      mockPrisma.user.findUnique.mockResolvedValue(mockContractor);
      mockPrisma.serviceImage.count.mockResolvedValue(0);

      // Act & Assert
      await expect(
        serviceService.reactivateService(mockServiceId, mockContractorId)
      ).rejects.toThrow(ServicePublicationRequirementsNotMetError);
    });

    it('should throw InvalidServiceStateTransitionError for DRAFT service', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);

      // Act & Assert
      await expect(
        serviceService.reactivateService(mockServiceId, mockContractorId)
      ).rejects.toThrow(InvalidServiceStateTransitionError);
    });
  });

  describe('unpublishService', () => {
    it('should unpublish ACTIVE service when no active bookings', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockActiveService);
      mockPrisma.booking.count.mockResolvedValue(0);
      (serviceRepository.updateStatus as jest.Mock).mockResolvedValue(mockDraftService);

      // Act
      const result = await serviceService.unpublishService(mockServiceId, mockContractorId);

      // Assert
      expect(result).toEqual(mockDraftService);
      expect(serviceRepository.updateStatus).toHaveBeenCalledWith(mockServiceId, 'DRAFT');
    });

    it('should throw ServiceHasActiveBookingsError if bookings exist', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockActiveService);
      mockPrisma.booking.count.mockResolvedValue(3);

      // Act & Assert
      await expect(
        serviceService.unpublishService(mockServiceId, mockContractorId)
      ).rejects.toThrow(ServiceHasActiveBookingsError);
    });

    it('should throw InvalidServiceStateTransitionError for ARCHIVED service', async () => {
      // Arrange
      const archivedService = { ...mockDraftService, visibilityStatus: 'ARCHIVED' };
      (serviceRepository.findById as jest.Mock).mockResolvedValue(archivedService);

      // Act & Assert
      await expect(
        serviceService.unpublishService(mockServiceId, mockContractorId)
      ).rejects.toThrow(InvalidServiceStateTransitionError);
    });
  });

  describe('deleteService', () => {
    it('should soft-delete service when no active bookings', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);
      mockPrisma.booking.count.mockResolvedValue(0);
      (serviceRepository.softDelete as jest.Mock).mockResolvedValue(undefined);

      // Act
      await serviceService.deleteService(mockServiceId, mockContractorId);

      // Assert
      expect(serviceRepository.softDelete).toHaveBeenCalledWith(mockServiceId);
    });

    it('should throw ServiceHasActiveBookingsError if bookings exist', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);
      mockPrisma.booking.count.mockResolvedValue(2);

      // Act & Assert
      await expect(
        serviceService.deleteService(mockServiceId, mockContractorId)
      ).rejects.toThrow(ServiceHasActiveBookingsError);
    });

    it('should throw UnauthorizedServiceActionError for non-owner', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(mockDraftService);

      // Act & Assert
      await expect(
        serviceService.deleteService(mockServiceId, 'other-user-123')
      ).rejects.toThrow(UnauthorizedServiceActionError);
    });

    it('should throw ServiceNotFoundError if service does not exist', async () => {
      // Arrange
      (serviceRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        serviceService.deleteService(mockServiceId, mockContractorId)
      ).rejects.toThrow(ServiceNotFoundError);
    });
  });

  describe('getContractorServices', () => {
    it('should return all services for contractor', async () => {
      // Arrange
      const services = [mockDraftService, mockActiveService];
      (serviceRepository.findByContractorId as jest.Mock).mockResolvedValue(services);

      // Act
      const result = await serviceService.getContractorServices(mockContractorId);

      // Assert
      expect(result).toEqual(services);
      expect(serviceRepository.findByContractorId).toHaveBeenCalledWith(
        mockContractorId,
        undefined
      );
    });

    it('should pass filters to repository', async () => {
      // Arrange
      const filters = { visibilityStatus: 'ACTIVE' as any, page: 1, limit: 10 };
      (serviceRepository.findByContractorId as jest.Mock).mockResolvedValue([]);

      // Act
      await serviceService.getContractorServices(mockContractorId, filters);

      // Assert
      expect(serviceRepository.findByContractorId).toHaveBeenCalledWith(
        mockContractorId,
        filters
      );
    });
  });

  describe('getPublicServices', () => {
    it('should return only ACTIVE services', async () => {
      // Arrange
      const services = [mockActiveService];
      (serviceRepository.findPublicServices as jest.Mock).mockResolvedValue(services);

      // Act
      const result = await serviceService.getPublicServices();

      // Assert
      expect(result).toEqual(services);
      expect(serviceRepository.findPublicServices).toHaveBeenCalledWith(undefined);
    });

    it('should pass filters to repository', async () => {
      // Arrange
      const filters = { categoryId: mockCategoryId, minPrice: 100, maxPrice: 1000 };
      (serviceRepository.findPublicServices as jest.Mock).mockResolvedValue([]);

      // Act
      await serviceService.getPublicServices(filters);

      // Assert
      expect(serviceRepository.findPublicServices).toHaveBeenCalledWith(filters);
    });
  });
});
