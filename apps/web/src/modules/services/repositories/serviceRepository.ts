import { prisma } from '@/lib/db';
import { ServiceNotFoundError } from '../errors';
import type { Prisma, ServiceVisibilityStatus } from '@prisma/client';
import type {
  ServiceDTO,
  CreateServiceDTO,
  UpdateServiceDTO,
  ServiceSearchFilters,
  ServiceListResponseDTO,
  ServicePublicDTO,
} from '../types';

/**
 * Repositorio para acceso a datos de servicios de contratistas
 */
export const serviceRepository = {
  /**
   * Crear un nuevo servicio
   */
  async create(
    data: CreateServiceDTO,
    contractorId: string
  ): Promise<ServiceDTO> {
    const service = await prisma.service.create({
      data: {
        contractorId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        basePrice: data.basePrice,
        durationMinutes: data.durationMinutes,
        currency: 'MXN',
        visibilityStatus: 'DRAFT',
        lastPublishedAt: null,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            parentId: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        contractor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            contractorProfile: {
              select: {
                businessName: true,
                verified: true,
              },
            },
          },
        },
      },
    });

    // Transform contractor data to match DTO
    return {
      id: service.id,
      contractorId: service.contractorId,
      categoryId: service.categoryId,
      title: service.title,
      description: service.description,
      basePrice: service.basePrice.toNumber(),
      currency: service.currency,
      durationMinutes: service.durationMinutes,
      visibilityStatus: service.visibilityStatus,
      lastPublishedAt: service.lastPublishedAt,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      category: service.category,
      images: service.images.map((img) => ({
        id: img.id,
        serviceId: img.serviceId,
        s3Url: img.s3Url,
        s3Key: img.s3Key,
        order: img.order,
        width: img.width ?? undefined,
        height: img.height ?? undefined,
        altText: img.altText ?? undefined,
        uploadedAt: img.uploadedAt,
      })),
      contractor: {
        id: service.contractor.id,
        businessName: service.contractor.contractorProfile?.businessName ?? '',
        verified: service.contractor.contractorProfile?.verified ?? false,
      },
    };
  },

  /**
   * Buscar servicio por ID
   */
  async findById(id: string): Promise<ServiceDTO | null> {
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            parentId: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        contractor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            contractorProfile: {
              select: {
                businessName: true,
                verified: true,
              },
            },
          },
        },
      },
    });

    if (!service) {
      return null;
    }

    return {
      id: service.id,
      contractorId: service.contractorId,
      categoryId: service.categoryId,
      title: service.title,
      description: service.description,
      basePrice: service.basePrice.toNumber(),
      currency: service.currency,
      durationMinutes: service.durationMinutes,
      visibilityStatus: service.visibilityStatus,
      lastPublishedAt: service.lastPublishedAt,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      category: service.category,
      images: service.images.map((img) => ({
        id: img.id,
        serviceId: img.serviceId,
        s3Url: img.s3Url,
        s3Key: img.s3Key,
        order: img.order,
        width: img.width ?? undefined,
        height: img.height ?? undefined,
        altText: img.altText ?? undefined,
        uploadedAt: img.uploadedAt,
      })),
      contractor: {
        id: service.contractor.id,
        businessName: service.contractor.contractorProfile?.businessName ?? '',
        verified: service.contractor.contractorProfile?.verified ?? false,
      },
    };
  },

  /**
   * Buscar servicios por ID de contratista
   */
  async findByContractorId(
    contractorId: string,
    filters?: { status?: ServiceVisibilityStatus }
  ): Promise<ServiceDTO[]> {
    const where: Prisma.ServiceWhereInput = {
      contractorId,
      ...(filters?.status && { visibilityStatus: filters.status }),
    };

    const services = await prisma.service.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            parentId: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        contractor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            contractorProfile: {
              select: {
                businessName: true,
                verified: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return services.map((service) => ({
      id: service.id,
      contractorId: service.contractorId,
      categoryId: service.categoryId,
      title: service.title,
      description: service.description,
      basePrice: service.basePrice.toNumber(),
      currency: service.currency,
      durationMinutes: service.durationMinutes,
      visibilityStatus: service.visibilityStatus,
      lastPublishedAt: service.lastPublishedAt,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      category: service.category,
      images: service.images.map((img) => ({
        id: img.id,
        serviceId: img.serviceId,
        s3Url: img.s3Url,
        s3Key: img.s3Key,
        order: img.order,
        width: img.width ?? undefined,
        height: img.height ?? undefined,
        altText: img.altText ?? undefined,
        uploadedAt: img.uploadedAt,
      })),
      contractor: {
        id: service.contractor.id,
        businessName: service.contractor.contractorProfile?.businessName ?? '',
        verified: service.contractor.contractorProfile?.verified ?? false,
      },
    }));
  },

  /**
   * Buscar servicios activos con filtros y paginación (para catálogo público)
   */
  async findActiveServices(
    filters: ServiceSearchFilters
  ): Promise<ServiceListResponseDTO> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ServiceWhereInput = {
      visibilityStatus: filters.status ?? 'ACTIVE',
      ...(filters.category && { categoryId: filters.category }),
      ...(filters.contractorId && { contractorId: filters.contractorId }),
      ...(filters.search && {
        OR: [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? {
          basePrice: {
            ...(filters.minPrice !== undefined && { gte: filters.minPrice }),
            ...(filters.maxPrice !== undefined && { lte: filters.maxPrice }),
          },
        }
        : {}),
    };

    // Execute queries in parallel
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              icon: true,
              parentId: true,
            },
          },
          images: {
            orderBy: { order: 'asc' },
          },
          contractor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              contractorProfile: {
                select: {
                  businessName: true,
                  verified: true,
                },
              },
            },
          },
        },
        orderBy: { lastPublishedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    const servicePublicDTOs: ServicePublicDTO[] = services.map((service) => ({
      id: service.id,
      title: service.title,
      categoryId: service.categoryId,
      category: service.category,
      description: service.description,
      basePrice: service.basePrice.toNumber(),
      currency: service.currency,
      durationMinutes: service.durationMinutes,
      visibilityStatus: service.visibilityStatus,
      images: service.images.map((img) => ({
        id: img.id,
        serviceId: img.serviceId,
        s3Url: img.s3Url,
        s3Key: img.s3Key,
        order: img.order,
        width: img.width ?? undefined,
        height: img.height ?? undefined,
        altText: img.altText ?? undefined,
        uploadedAt: img.uploadedAt,
      })),
      contractor: {
        id: service.contractor.id,
        businessName: service.contractor.contractorProfile?.businessName ?? '',
        verified: service.contractor.contractorProfile?.verified ?? false,
      },
      lastPublishedAt: service.lastPublishedAt,
    }));

    return {
      services: servicePublicDTOs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Actualizar servicio
   */
  async update(id: string, data: UpdateServiceDTO): Promise<ServiceDTO> {
    // Validar existencia antes de actualizar
    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      throw new ServiceNotFoundError(id);
    }

    const service = await prisma.service.update({
      where: { id },
      data: {
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.durationMinutes && { durationMinutes: data.durationMinutes }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            parentId: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        contractor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            contractorProfile: {
              select: {
                businessName: true,
                verified: true,
              },
            },
          },
        },
      },
    });

    return {
      id: service.id,
      contractorId: service.contractorId,
      categoryId: service.categoryId,
      title: service.title,
      description: service.description,
      basePrice: service.basePrice.toNumber(),
      currency: service.currency,
      durationMinutes: service.durationMinutes,
      visibilityStatus: service.visibilityStatus,
      lastPublishedAt: service.lastPublishedAt,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      category: service.category,
      images: service.images.map((img) => ({
        id: img.id,
        serviceId: img.serviceId,
        s3Url: img.s3Url,
        s3Key: img.s3Key,
        order: img.order,
        width: img.width ?? undefined,
        height: img.height ?? undefined,
        altText: img.altText ?? undefined,
        uploadedAt: img.uploadedAt,
      })),
      contractor: {
        id: service.contractor.id,
        businessName: service.contractor.contractorProfile?.businessName ?? '',
        verified: service.contractor.contractorProfile?.verified ?? false,
      },
    };
  },

  /**
   * Actualizar estado de visibilidad del servicio
   */
  async updateVisibilityStatus(
    id: string,
    status: ServiceVisibilityStatus
  ): Promise<ServiceDTO> {
    // Validar existencia antes de actualizar
    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      throw new ServiceNotFoundError(id);
    }

    const updateData: Prisma.ServiceUpdateInput = {
      visibilityStatus: status,
    };

    // Si el nuevo estado es ACTIVE, actualizar lastPublishedAt
    if (status === 'ACTIVE') {
      updateData.lastPublishedAt = new Date();
    }

    const service = await prisma.service.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            parentId: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        contractor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            contractorProfile: {
              select: {
                businessName: true,
                verified: true,
              },
            },
          },
        },
      },
    });

    return {
      id: service.id,
      contractorId: service.contractorId,
      categoryId: service.categoryId,
      title: service.title,
      description: service.description,
      basePrice: service.basePrice.toNumber(),
      currency: service.currency,
      durationMinutes: service.durationMinutes,
      visibilityStatus: service.visibilityStatus,
      lastPublishedAt: service.lastPublishedAt,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      category: service.category,
      images: service.images.map((img) => ({
        id: img.id,
        serviceId: img.serviceId,
        s3Url: img.s3Url,
        s3Key: img.s3Key,
        order: img.order,
        width: img.width ?? undefined,
        height: img.height ?? undefined,
        altText: img.altText ?? undefined,
        uploadedAt: img.uploadedAt,
      })),
      contractor: {
        id: service.contractor.id,
        businessName: service.contractor.contractorProfile?.businessName ?? '',
        verified: service.contractor.contractorProfile?.verified ?? false,
      },
    };
  },

  /**
   * Eliminar servicio (soft delete cambiando a ARCHIVED)
   */
  async delete(id: string): Promise<void> {
    // Validar existencia antes de eliminar
    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      throw new ServiceNotFoundError(id);
    }

    // Soft delete: cambiar a ARCHIVED en lugar de eliminar físicamente
    await prisma.service.update({
      where: { id },
      data: { visibilityStatus: 'ARCHIVED' },
    });
  },

  /**
   * Obtener conteo de imágenes de un servicio
   */
  async getImagesCount(serviceId: string): Promise<number> {
    return prisma.serviceImage.count({
      where: { serviceId },
    });
  },
};
