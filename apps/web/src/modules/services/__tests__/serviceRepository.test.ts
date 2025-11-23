import { prisma } from '@/lib/db';
import { serviceRepository } from '../repositories/serviceRepository';
import { ServiceNotFoundError } from '../errors';
import {
  mockServiceDraft,
  mockServiceActive,
  mockCreateServiceInput,
  mockUpdateServiceInput,
} from '../test-fixtures';
import type { Decimal } from '@prisma/client/runtime/library';

// Mock de Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    service: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    serviceImage: {
      count: jest.fn(),
    },
  },
}));

describe('serviceRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper para convertir number a Decimal mock
  const toDecimal = (value: number): Decimal => {
    return {
      toNumber: () => value,
    } as Decimal;
  };

  // Helper para crear mock de servicio de Prisma
  const createPrismaServiceMock = (service: typeof mockServiceDraft) => ({
    id: service.id,
    contractorId: service.contractorId,
    categoryId: service.categoryId,
    title: service.title,
    description: service.description,
    basePrice: toDecimal(service.basePrice),
    currency: service.currency,
    durationMinutes: service.durationMinutes,
    visibilityStatus: service.visibilityStatus,
    lastPublishedAt: service.lastPublishedAt,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
    category: service.category,
    images: service.images || [],
    contractor: {
      id: service.contractor!.id,
      firstName: 'Juan',
      lastName: 'García',
      contractorProfile: {
        businessName: service.contractor!.businessName,
        verified: service.contractor!.verified,
      },
    },
  });

  describe('create', () => {
    it('TC-SERVICE-026: debe crear un servicio exitosamente', async () => {
      const prismaMock = createPrismaServiceMock(mockServiceDraft);
      (prisma.service.create as jest.Mock).mockResolvedValue(prismaMock);

      const result = await serviceRepository.create(mockCreateServiceInput, 'contractor-verified-123');

      expect(result.id).toBe(mockServiceDraft.id);
      expect(result.title).toBe(mockCreateServiceInput.title);
      expect(result.visibilityStatus).toBe('DRAFT');
      expect(result.basePrice).toBe(mockCreateServiceInput.basePrice);
      expect(prisma.service.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contractorId: 'contractor-verified-123',
          title: mockCreateServiceInput.title,
          description: mockCreateServiceInput.description,
          basePrice: mockCreateServiceInput.basePrice,
          durationMinutes: mockCreateServiceInput.durationMinutes,
          currency: 'MXN',
          visibilityStatus: 'DRAFT',
          lastPublishedAt: null,
        }),
        include: expect.any(Object),
      });
    });

    it('TC-SERVICE-026-02: debe crear servicio con status DRAFT por defecto', async () => {
      const prismaMock = createPrismaServiceMock(mockServiceDraft);
      (prisma.service.create as jest.Mock).mockResolvedValue(prismaMock);

      const result = await serviceRepository.create(mockCreateServiceInput, 'contractor-verified-123');

      expect(result.visibilityStatus).toBe('DRAFT');
      expect(result.lastPublishedAt).toBeNull();
    });
  });

  describe('findById', () => {
    it('TC-SERVICE-027: debe encontrar un servicio por ID', async () => {
      const prismaMock = createPrismaServiceMock(mockServiceDraft);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(prismaMock);

      const result = await serviceRepository.findById('service-draft-123');

      expect(result).toBeTruthy();
      expect(result?.id).toBe('service-draft-123');
      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: 'service-draft-123' },
        include: expect.any(Object),
      });
    });

    it('TC-SERVICE-027-02: debe retornar null si no se encuentra el servicio', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await serviceRepository.findById('service-nonexistent');

      expect(result).toBeNull();
    });

    it('TC-SERVICE-027-03: debe incluir relaciones (category, images, contractor)', async () => {
      const prismaMock = createPrismaServiceMock(mockServiceDraft);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(prismaMock);

      const result = await serviceRepository.findById('service-draft-123');

      expect(result?.category).toBeDefined();
      expect(result?.images).toBeDefined();
      expect(result?.contractor).toBeDefined();
    });
  });

  describe('findByContractorId', () => {
    it('TC-SERVICE-028: debe encontrar servicios por contractor ID', async () => {
      const prismaMocks = [
        createPrismaServiceMock(mockServiceDraft),
        createPrismaServiceMock(mockServiceActive),
      ];
      (prisma.service.findMany as jest.Mock).mockResolvedValue(prismaMocks);

      const result = await serviceRepository.findByContractorId('contractor-verified-123');

      expect(result).toHaveLength(2);
      expect(result[0].contractorId).toBe('contractor-verified-123');
      expect(result[1].contractorId).toBe('contractor-verified-123');
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contractorId: 'contractor-verified-123' },
        })
      );
    });

    it('TC-SERVICE-028-02: debe filtrar por status', async () => {
      const prismaMocks = [createPrismaServiceMock(mockServiceActive)];
      (prisma.service.findMany as jest.Mock).mockResolvedValue(prismaMocks);

      const result = await serviceRepository.findByContractorId('contractor-verified-123', {
        status: 'ACTIVE',
      });

      expect(result).toHaveLength(1);
      expect(result[0].visibilityStatus).toBe('ACTIVE');
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            contractorId: 'contractor-verified-123',
            visibilityStatus: 'ACTIVE',
          },
        })
      );
    });

    it('TC-SERVICE-028-03: debe retornar array vacío si no hay servicios', async () => {
      (prisma.service.findMany as jest.Mock).mockResolvedValue([]);

      const result = await serviceRepository.findByContractorId('contractor-no-services');

      expect(result).toEqual([]);
    });
  });

  describe('findActiveServices', () => {
    it('TC-SERVICE-029: debe buscar servicios activos con paginación', async () => {
      const prismaMocks = [createPrismaServiceMock(mockServiceActive)];
      (prisma.service.findMany as jest.Mock).mockResolvedValue(prismaMocks);
      (prisma.service.count as jest.Mock).mockResolvedValue(1);

      const result = await serviceRepository.findActiveServices({
        page: 1,
        limit: 20,
      });

      expect(result.services).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.pages).toBe(1);
    });

    it('TC-SERVICE-029-02: debe filtrar por categoría', async () => {
      const prismaMocks = [createPrismaServiceMock(mockServiceActive)];
      (prisma.service.findMany as jest.Mock).mockResolvedValue(prismaMocks);
      (prisma.service.count as jest.Mock).mockResolvedValue(1);

      await serviceRepository.findActiveServices({
        category: 'category-plumbing-001',
        page: 1,
        limit: 20,
      });

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'category-plumbing-001',
          }),
        })
      );
    });

    it('TC-SERVICE-029-03: debe filtrar por rango de precio', async () => {
      const prismaMocks = [createPrismaServiceMock(mockServiceActive)];
      (prisma.service.findMany as jest.Mock).mockResolvedValue(prismaMocks);
      (prisma.service.count as jest.Mock).mockResolvedValue(1);

      await serviceRepository.findActiveServices({
        minPrice: 100,
        maxPrice: 1000,
        page: 1,
        limit: 20,
      });

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            basePrice: {
              gte: 100,
              lte: 1000,
            },
          }),
        })
      );
    });

    it('TC-SERVICE-029-04: debe buscar por texto (title o description)', async () => {
      const prismaMocks = [createPrismaServiceMock(mockServiceActive)];
      (prisma.service.findMany as jest.Mock).mockResolvedValue(prismaMocks);
      (prisma.service.count as jest.Mock).mockResolvedValue(1);

      await serviceRepository.findActiveServices({
        search: 'plomería',
        page: 1,
        limit: 20,
      });

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'plomería', mode: 'insensitive' } },
              { description: { contains: 'plomería', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('TC-SERVICE-029-05: debe calcular paginación correctamente', async () => {
      const prismaMocks = Array(5)
        .fill(null)
        .map(() => createPrismaServiceMock(mockServiceActive));
      (prisma.service.findMany as jest.Mock).mockResolvedValue(prismaMocks);
      (prisma.service.count as jest.Mock).mockResolvedValue(45);

      const result = await serviceRepository.findActiveServices({
        page: 2,
        limit: 10,
      });

      expect(result.pagination.pages).toBe(5); // 45 / 10 = 5 pages
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * 10
          take: 10,
        })
      );
    });
  });

  describe('update', () => {
    it('TC-SERVICE-030: debe actualizar un servicio exitosamente', async () => {
      const updatedPrismaMock = createPrismaServiceMock({
        ...mockServiceDraft,
        ...mockUpdateServiceInput,
      });

      (prisma.service.findUnique as jest.Mock).mockResolvedValue(createPrismaServiceMock(mockServiceDraft));
      (prisma.service.update as jest.Mock).mockResolvedValue(updatedPrismaMock);

      const result = await serviceRepository.update('service-draft-123', mockUpdateServiceInput);

      expect(result.title).toBe(mockUpdateServiceInput.title);
      expect(result.description).toBe(mockUpdateServiceInput.description);
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'service-draft-123' },
        data: expect.objectContaining({
          title: mockUpdateServiceInput.title,
          description: mockUpdateServiceInput.description,
          basePrice: mockUpdateServiceInput.basePrice,
          durationMinutes: mockUpdateServiceInput.durationMinutes,
        }),
        include: expect.any(Object),
      });
    });

    it('TC-SERVICE-030-02: debe lanzar error si el servicio no existe', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        serviceRepository.update('service-nonexistent', mockUpdateServiceInput)
      ).rejects.toThrow(ServiceNotFoundError);

      expect(prisma.service.update).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-030-03: debe permitir actualización parcial', async () => {
      const partialUpdate = {
        title: 'Nuevo título',
      };

      const updatedPrismaMock = createPrismaServiceMock({
        ...mockServiceDraft,
        title: 'Nuevo título',
      });

      (prisma.service.findUnique as jest.Mock).mockResolvedValue(createPrismaServiceMock(mockServiceDraft));
      (prisma.service.update as jest.Mock).mockResolvedValue(updatedPrismaMock);

      const result = await serviceRepository.update('service-draft-123', partialUpdate);

      expect(result.title).toBe('Nuevo título');
    });
  });

  describe('updateVisibilityStatus', () => {
    it('TC-SERVICE-031: debe actualizar estado de visibilidad', async () => {
      const activePrismaMock = createPrismaServiceMock({
        ...mockServiceDraft,
        visibilityStatus: 'ACTIVE',
        lastPublishedAt: new Date(),
      });

      (prisma.service.findUnique as jest.Mock).mockResolvedValue(createPrismaServiceMock(mockServiceDraft));
      (prisma.service.update as jest.Mock).mockResolvedValue(activePrismaMock);

      const result = await serviceRepository.updateVisibilityStatus('service-draft-123', 'ACTIVE');

      expect(result.visibilityStatus).toBe('ACTIVE');
      expect(result.lastPublishedAt).toBeTruthy();
      expect(prisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'service-draft-123' },
          data: expect.objectContaining({
            visibilityStatus: 'ACTIVE',
            lastPublishedAt: expect.any(Date),
          }),
        })
      );
    });

    it('TC-SERVICE-031-02: debe actualizar lastPublishedAt solo para ACTIVE', async () => {
      const pausedPrismaMock = createPrismaServiceMock({
        ...mockServiceActive,
        visibilityStatus: 'PAUSED',
      });

      (prisma.service.findUnique as jest.Mock).mockResolvedValue(createPrismaServiceMock(mockServiceActive));
      (prisma.service.update as jest.Mock).mockResolvedValue(pausedPrismaMock);

      await serviceRepository.updateVisibilityStatus('service-active-456', 'PAUSED');

      expect(prisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visibilityStatus: 'PAUSED',
          }),
        })
      );
    });

    it('TC-SERVICE-031-03: debe lanzar error si el servicio no existe', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        serviceRepository.updateVisibilityStatus('service-nonexistent', 'ACTIVE')
      ).rejects.toThrow(ServiceNotFoundError);

      expect(prisma.service.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('TC-SERVICE-032: debe hacer soft delete (cambiar a ARCHIVED)', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(createPrismaServiceMock(mockServiceDraft));
      (prisma.service.update as jest.Mock).mockResolvedValue(
        createPrismaServiceMock({ ...mockServiceDraft, visibilityStatus: 'ARCHIVED' })
      );

      await serviceRepository.delete('service-draft-123');

      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'service-draft-123' },
        data: { visibilityStatus: 'ARCHIVED' },
      });
    });

    it('TC-SERVICE-032-02: debe lanzar error si el servicio no existe', async () => {
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(serviceRepository.delete('service-nonexistent')).rejects.toThrow(ServiceNotFoundError);

      expect(prisma.service.update).not.toHaveBeenCalled();
    });
  });

  describe('getImagesCount', () => {
    it('TC-SERVICE-033: debe retornar conteo de imágenes', async () => {
      (prisma.serviceImage.count as jest.Mock).mockResolvedValue(3);

      const result = await serviceRepository.getImagesCount('service-draft-123');

      expect(result).toBe(3);
      expect(prisma.serviceImage.count).toHaveBeenCalledWith({
        where: { serviceId: 'service-draft-123' },
      });
    });

    it('TC-SERVICE-033-02: debe retornar 0 si no hay imágenes', async () => {
      (prisma.serviceImage.count as jest.Mock).mockResolvedValue(0);

      const result = await serviceRepository.getImagesCount('service-no-images');

      expect(result).toBe(0);
    });
  });
});
