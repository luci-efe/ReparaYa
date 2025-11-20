/**
 * Service Repository
 *
 * Data access layer for contractor services using Prisma.
 * Handles all database operations for services including:
 * - CRUD operations with ownership validation
 * - Visibility-aware queries (ACTIVE services for public, all for owners)
 * - State transitions with lastPublishedAt tracking
 * - Pagination and filtering support
 *
 * @module services/repositories/serviceRepository
 */

import { prisma } from '@/lib/db';
import { Prisma, VisibilityStatus } from '@prisma/client';
import { ServiceNotFoundError } from '../errors';
import type {
  ServiceDTO,
  CreateServiceDTO,
  UpdateServiceDTO,
  ServiceQueryFilters,
  ServiceStatus,
  CategorySummaryDTO,
  ContractorSummaryDTO,
  ServiceImageDTO,
} from '../types';

// ============================================================================
// Type Mappers
// ============================================================================

/**
 * Map Prisma Service to ServiceDTO
 * Handles type conversion and decimal serialization
 */
function mapServiceToDTO(service: any): ServiceDTO {
  return {
    id: service.id,
    contractorId: service.contractorId,
    categoryId: service.categoryId,
    title: service.title,
    description: service.description,
    basePrice: Number(service.basePrice),
    currency: service.currency as any,
    durationMinutes: service.durationMinutes,
    visibilityStatus: service.visibilityStatus as ServiceStatus,
    lastPublishedAt: service.lastPublishedAt,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    // Include relations if present
    category: service.category
      ? {
          id: service.category.id,
          name: service.category.name,
          slug: service.category.slug,
          iconUrl: service.category.iconUrl,
        }
      : undefined,
    contractor: service.contractor?.contractorProfile
      ? {
          id: service.contractor.contractorProfile.id,
          businessName: service.contractor.contractorProfile.businessName,
          verified: service.contractor.contractorProfile.verified,
        }
      : undefined,
    images: service.serviceImages?.map((img: any) => ({
      id: img.id,
      serviceId: img.serviceId,
      s3Url: img.s3Url,
      s3Key: img.s3Key,
      order: img.order,
      width: img.width,
      height: img.height,
      altText: img.altText,
      uploadedAt: img.uploadedAt,
    })),
  };
}

// ============================================================================
// Service Repository
// ============================================================================

export class ServiceRepository {
  /**
   * Create a new service
   * Initial status is always DRAFT
   */
  async create(contractorId: string, data: CreateServiceDTO): Promise<ServiceDTO> {
    const service = await prisma.service.create({
      data: {
        contractorId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        basePrice: new Prisma.Decimal(data.basePrice),
        currency: data.currency,
        durationMinutes: data.durationMinutes,
        visibilityStatus: VisibilityStatus.DRAFT,
      },
      include: {
        category: true,
        contractor: {
          include: {
            contractorProfile: true,
          },
        },
        serviceImages: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return mapServiceToDTO(service);
  }

  /**
   * Find service by ID with optional relations
   */
  async findById(serviceId: string, includeRelations: boolean = false): Promise<ServiceDTO | null> {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: includeRelations
        ? {
            category: true,
            contractor: {
              include: {
                contractorProfile: true,
              },
            },
            serviceImages: {
              orderBy: {
                order: 'asc',
              },
            },
          }
        : undefined,
    });

    if (!service) {
      return null;
    }

    return mapServiceToDTO(service);
  }

  /**
   * Find all services owned by a contractor
   * Returns all visibility statuses for the owner
   */
  async findByContractorId(
    contractorId: string,
    filters?: ServiceQueryFilters
  ): Promise<ServiceDTO[]> {
    const where: Prisma.ServiceWhereInput = {
      contractorId,
    };

    // Apply filters
    if (filters?.visibilityStatus) {
      where.visibilityStatus = filters.visibilityStatus as VisibilityStatus;
    }
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.basePrice = {};
      if (filters.minPrice !== undefined) {
        where.basePrice.gte = new Prisma.Decimal(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        where.basePrice.lte = new Prisma.Decimal(filters.maxPrice);
      }
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const services = await prisma.service.findMany({
      where,
      include: {
        category: true,
        contractor: {
          include: {
            contractorProfile: true,
          },
        },
        serviceImages: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: [
        { visibilityStatus: 'asc' }, // ACTIVE first, then DRAFT, PAUSED, ARCHIVED
        { updatedAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    return services.map(mapServiceToDTO);
  }

  /**
   * Find public services (ACTIVE only) with filters
   * Used for public catalog display
   */
  async findPublicServices(filters?: ServiceQueryFilters): Promise<ServiceDTO[]> {
    const where: Prisma.ServiceWhereInput = {
      visibilityStatus: VisibilityStatus.ACTIVE,
    };

    // Apply filters
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters?.contractorId) {
      where.contractorId = filters.contractorId;
    }
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.basePrice = {};
      if (filters.minPrice !== undefined) {
        where.basePrice.gte = new Prisma.Decimal(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        where.basePrice.lte = new Prisma.Decimal(filters.maxPrice);
      }
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const services = await prisma.service.findMany({
      where,
      include: {
        category: true,
        contractor: {
          include: {
            contractorProfile: true,
          },
        },
        serviceImages: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        lastPublishedAt: 'desc',
      },
      skip,
      take: limit,
    });

    return services.map(mapServiceToDTO);
  }

  /**
   * Update service data
   * Does not update visibility status (use updateStatus for that)
   */
  async update(serviceId: string, data: UpdateServiceDTO): Promise<ServiceDTO> {
    // Check if service exists
    const existing = await this.findById(serviceId);
    if (!existing) {
      throw new ServiceNotFoundError(serviceId);
    }

    const updateData: Prisma.ServiceUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.basePrice !== undefined) updateData.basePrice = new Prisma.Decimal(data.basePrice);
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;

    const service = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
      include: {
        category: true,
        contractor: {
          include: {
            contractorProfile: true,
          },
        },
        serviceImages: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return mapServiceToDTO(service);
  }

  /**
   * Update service visibility status
   * Sets lastPublishedAt when transitioning to ACTIVE
   */
  async updateStatus(serviceId: string, status: ServiceStatus): Promise<ServiceDTO> {
    // Check if service exists
    const existing = await this.findById(serviceId);
    if (!existing) {
      throw new ServiceNotFoundError(serviceId);
    }

    const updateData: Prisma.ServiceUpdateInput = {
      visibilityStatus: status as VisibilityStatus,
    };

    // Set lastPublishedAt when publishing
    if (status === 'ACTIVE') {
      updateData.lastPublishedAt = new Date();
    }

    const service = await prisma.service.update({
      where: { id: serviceId },
      data: updateData,
      include: {
        category: true,
        contractor: {
          include: {
            contractorProfile: true,
          },
        },
        serviceImages: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return mapServiceToDTO(service);
  }

  /**
   * Soft-delete service (set status to ARCHIVED)
   */
  async softDelete(serviceId: string): Promise<void> {
    const existing = await this.findById(serviceId);
    if (!existing) {
      throw new ServiceNotFoundError(serviceId);
    }

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        visibilityStatus: VisibilityStatus.ARCHIVED,
      },
    });
  }

  /**
   * Hard-delete service (permanent removal)
   * Only allowed for services that were never published (DRAFT only, never ACTIVE)
   */
  async hardDelete(serviceId: string): Promise<void> {
    const existing = await this.findById(serviceId);
    if (!existing) {
      throw new ServiceNotFoundError(serviceId);
    }

    // Verify service was never published
    if (existing.lastPublishedAt !== null) {
      throw new Error('Cannot permanently delete a service that was previously published');
    }

    // Prisma will cascade delete related images due to onDelete: Cascade
    await prisma.service.delete({
      where: { id: serviceId },
    });
  }

  /**
   * Count services by contractor and optional status filter
   */
  async countByContractor(contractorId: string, status?: ServiceStatus): Promise<number> {
    const where: Prisma.ServiceWhereInput = {
      contractorId,
    };

    if (status) {
      where.visibilityStatus = status as VisibilityStatus;
    }

    return prisma.service.count({ where });
  }

  /**
   * Count public active services with filters
   */
  async countPublicServices(filters?: ServiceQueryFilters): Promise<number> {
    const where: Prisma.ServiceWhereInput = {
      visibilityStatus: VisibilityStatus.ACTIVE,
    };

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters?.contractorId) {
      where.contractorId = filters.contractorId;
    }
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.basePrice = {};
      if (filters.minPrice !== undefined) {
        where.basePrice.gte = new Prisma.Decimal(filters.minPrice);
      }
      if (filters.maxPrice !== undefined) {
        where.basePrice.lte = new Prisma.Decimal(filters.maxPrice);
      }
    }

    return prisma.service.count({ where });
  }

  /**
   * Check if service belongs to contractor (ownership validation)
   */
  async isOwnedBy(serviceId: string, contractorId: string): Promise<boolean> {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { contractorId: true },
    });

    return service?.contractorId === contractorId;
  }

  /**
   * Get service visibility status (for validation)
   */
  async getVisibilityStatus(serviceId: string): Promise<ServiceStatus | null> {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { visibilityStatus: true },
    });

    return service?.visibilityStatus as ServiceStatus | null;
  }

  /**
   * Check if contractor is verified (needed for publishing)
   */
  async isContractorVerified(contractorId: string): Promise<boolean> {
    const contractor = await prisma.user.findUnique({
      where: { id: contractorId },
      include: {
        contractorProfile: {
          select: { verified: true },
        },
      },
    });

    return contractor?.contractorProfile?.verified ?? false;
  }

  /**
   * Count images for a service (validation for publication)
   */
  async countImages(serviceId: string): Promise<number> {
    return prisma.serviceImage.count({
      where: { serviceId },
    });
  }
}

// Singleton instance
export const serviceRepository = new ServiceRepository();
