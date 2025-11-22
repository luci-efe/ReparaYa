import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ZodError } from 'zod';
import { serviceService } from '../services/serviceService';
import { serviceRepository } from '../repositories/serviceRepository';
import { contractorProfileRepository } from '@/modules/contractors/repositories/contractorProfileRepository';
import {
  ServiceNotFoundError,
  UnauthorizedServiceAccessError,
  InvalidStateTransitionError,
  PublicationRequirementsNotMetError,
} from '../errors';
import {
  mockServiceDraft,
  mockServiceActive,
  mockServicePaused,
  mockServiceArchived,
  mockServiceDraftNoImages,
  mockVerifiedContractor,
  mockUnverifiedContractor,
  mockCreateServiceInput,
  mockUpdateServiceInput,
} from '../test-fixtures';

// Mock Prisma to avoid actual database calls in delete operations
jest.mock('@/lib/db', () => ({
  prisma: {
    service: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('serviceService', () => {
  let mockRepositoryCreate: ReturnType<typeof jest.spyOn>;
  let mockRepositoryFindById: ReturnType<typeof jest.spyOn>;
  let mockRepositoryFindByContractorId: ReturnType<typeof jest.spyOn>;
  let mockRepositoryFindActiveServices: ReturnType<typeof jest.spyOn>;
  let mockRepositoryUpdate: ReturnType<typeof jest.spyOn>;
  let mockRepositoryUpdateVisibilityStatus: ReturnType<typeof jest.spyOn>;
  let mockRepositoryDelete: ReturnType<typeof jest.spyOn>;
  let mockContractorRepositoryFindById: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    mockRepositoryCreate = jest.spyOn(serviceRepository, 'create');
    mockRepositoryFindById = jest.spyOn(serviceRepository, 'findById');
    mockRepositoryFindByContractorId = jest.spyOn(serviceRepository, 'findByContractorId');
    mockRepositoryFindActiveServices = jest.spyOn(serviceRepository, 'findActiveServices');
    mockRepositoryUpdate = jest.spyOn(serviceRepository, 'update');
    mockRepositoryUpdateVisibilityStatus = jest.spyOn(serviceRepository, 'updateVisibilityStatus');
    mockRepositoryDelete = jest.spyOn(serviceRepository, 'delete');
    mockContractorRepositoryFindById = jest.spyOn(contractorProfileRepository, 'findById');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createService', () => {
    it('TC-SERVICE-017: debe crear servicio exitosamente', async () => {
      mockContractorRepositoryFindById.mockResolvedValue(mockVerifiedContractor);
      mockRepositoryCreate.mockResolvedValue(mockServiceDraft);

      const result = await serviceService.createService(
        mockCreateServiceInput,
        'contractor-verified-123'
      );

      expect(result).toEqual(mockServiceDraft);
      expect(result.visibilityStatus).toBe('DRAFT');
      expect(mockContractorRepositoryFindById).toHaveBeenCalledWith('contractor-verified-123');
      expect(mockRepositoryCreate).toHaveBeenCalledWith(
        mockCreateServiceInput,
        'contractor-verified-123'
      );
    });

    it('TC-SERVICE-017-02: debe rechazar si el contratista no existe', async () => {
      mockContractorRepositoryFindById.mockResolvedValue(null);

      await expect(
        serviceService.createService(mockCreateServiceInput, 'contractor-nonexistent')
      ).rejects.toThrow('Perfil de contratista contractor-nonexistent no encontrado');

      expect(mockRepositoryCreate).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-017-03: debe validar input con Zod', async () => {
      const invalidInput = {
        categoryId: 'not-a-uuid',
        title: 'ABC',
        description: 'Too short',
        basePrice: -100,
        durationMinutes: 10,
      };

      await expect(
        serviceService.createService(invalidInput, 'contractor-verified-123')
      ).rejects.toThrow(ZodError);

      expect(mockRepositoryCreate).not.toHaveBeenCalled();
    });
  });

  describe('getServiceById', () => {
    it('TC-SERVICE-018: debe retornar servicio si el usuario es dueño', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);

      const result = await serviceService.getServiceById(
        'service-draft-123',
        'contractor-verified-123',
        'CONTRACTOR'
      );

      expect(result).toEqual(mockServiceDraft);
      expect(mockRepositoryFindById).toHaveBeenCalledWith('service-draft-123');
    });

    it('TC-SERVICE-018-02: debe retornar servicio si el usuario es ADMIN', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);

      const result = await serviceService.getServiceById(
        'service-draft-123',
        'user-admin-123',
        'ADMIN'
      );

      expect(result).toEqual(mockServiceDraft);
    });

    it('TC-SERVICE-018-03: debe retornar servicio ACTIVE para usuario público', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceActive);

      const result = await serviceService.getServiceById('service-active-456');

      expect(result).toEqual(mockServiceActive);
    });

    it('TC-SERVICE-018-04: debe retornar null si servicio DRAFT y usuario no es dueño', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);

      const result = await serviceService.getServiceById(
        'service-draft-123',
        'contractor-other-999',
        'CONTRACTOR'
      );

      expect(result).toBeNull();
    });

    it('TC-SERVICE-018-05: debe retornar null si servicio no existe', async () => {
      mockRepositoryFindById.mockResolvedValue(null);

      const result = await serviceService.getServiceById('service-nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getContractorServices', () => {
    it('TC-SERVICE-019: debe retornar todos los servicios del contratista', async () => {
      const services = [mockServiceDraft, mockServiceActive, mockServicePaused];
      mockRepositoryFindByContractorId.mockResolvedValue(services);

      const result = await serviceService.getContractorServices('contractor-verified-123');

      expect(result).toEqual(services);
      expect(result.length).toBe(3);
      expect(mockRepositoryFindByContractorId).toHaveBeenCalledWith('contractor-verified-123', undefined);
    });

    it('TC-SERVICE-019-02: debe filtrar servicios por estado', async () => {
      const activeServices = [mockServiceActive];
      mockRepositoryFindByContractorId.mockResolvedValue(activeServices);

      const result = await serviceService.getContractorServices('contractor-verified-123', {
        status: 'ACTIVE',
      });

      expect(result).toEqual(activeServices);
      expect(mockRepositoryFindByContractorId).toHaveBeenCalledWith('contractor-verified-123', {
        status: 'ACTIVE',
      });
    });

    it('TC-SERVICE-019-03: debe retornar array vacío si no hay servicios', async () => {
      mockRepositoryFindByContractorId.mockResolvedValue([]);

      const result = await serviceService.getContractorServices('contractor-no-services');

      expect(result).toEqual([]);
    });
  });

  describe('updateService', () => {
    it('TC-SERVICE-020: debe actualizar servicio exitosamente', async () => {
      const updatedService = {
        ...mockServiceDraft,
        ...mockUpdateServiceInput,
      };

      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);
      mockRepositoryUpdate.mockResolvedValue(updatedService);

      const result = await serviceService.updateService(
        'service-draft-123',
        mockUpdateServiceInput,
        'contractor-verified-123'
      );

      expect(result).toEqual(updatedService);
      expect(mockRepositoryUpdate).toHaveBeenCalledWith('service-draft-123', mockUpdateServiceInput);
    });

    it('TC-SERVICE-020-02: debe rechazar si servicio no existe', async () => {
      mockRepositoryFindById.mockResolvedValue(null);

      await expect(
        serviceService.updateService('service-nonexistent', mockUpdateServiceInput, 'contractor-verified-123')
      ).rejects.toThrow(ServiceNotFoundError);

      expect(mockRepositoryUpdate).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-020-03: debe rechazar si usuario no es dueño', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);

      await expect(
        serviceService.updateService('service-draft-123', mockUpdateServiceInput, 'contractor-other-999')
      ).rejects.toThrow(UnauthorizedServiceAccessError);

      expect(mockRepositoryUpdate).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-020-04: debe rechazar actualización de servicio ARCHIVED', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceArchived);

      await expect(
        serviceService.updateService('service-archived-999', mockUpdateServiceInput, 'contractor-verified-123')
      ).rejects.toThrow(InvalidStateTransitionError);

      expect(mockRepositoryUpdate).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-020-05: debe validar input con Zod', async () => {
      const invalidInput = {
        title: 'AB',
        basePrice: -100,
      };

      await expect(
        serviceService.updateService('service-draft-123', invalidInput, 'contractor-verified-123')
      ).rejects.toThrow(ZodError);

      expect(mockRepositoryUpdate).not.toHaveBeenCalled();
    });
  });

  describe('publishService', () => {
    it('TC-SERVICE-021: debe publicar servicio exitosamente', async () => {
      const publishedService = {
        ...mockServiceDraft,
        visibilityStatus: 'ACTIVE' as const,
        lastPublishedAt: new Date(),
      };

      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);
      mockContractorRepositoryFindById.mockResolvedValue(mockVerifiedContractor);
      mockRepositoryUpdateVisibilityStatus.mockResolvedValue(publishedService);

      const result = await serviceService.publishService('service-draft-123', 'contractor-verified-123');

      expect(result.visibilityStatus).toBe('ACTIVE');
      expect(result.lastPublishedAt).toBeTruthy();
      expect(mockRepositoryUpdateVisibilityStatus).toHaveBeenCalledWith('service-draft-123', 'ACTIVE');
    });

    it('TC-SERVICE-021-02: debe rechazar si servicio no existe', async () => {
      mockRepositoryFindById.mockResolvedValue(null);

      await expect(
        serviceService.publishService('service-nonexistent', 'contractor-verified-123')
      ).rejects.toThrow(ServiceNotFoundError);

      expect(mockRepositoryUpdateVisibilityStatus).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-021-03: debe rechazar si usuario no es dueño', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);

      await expect(
        serviceService.publishService('service-draft-123', 'contractor-other-999')
      ).rejects.toThrow(UnauthorizedServiceAccessError);

      expect(mockRepositoryUpdateVisibilityStatus).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-021-04: debe rechazar si contratista no está verificado', async () => {
      const serviceWithUnverifiedContractor = {
        ...mockServiceDraft,
        contractorId: 'contractor-unverified-456',
      };

      mockRepositoryFindById.mockResolvedValue(serviceWithUnverifiedContractor);
      mockContractorRepositoryFindById.mockResolvedValue(mockUnverifiedContractor);

      await expect(
        serviceService.publishService('service-draft-123', 'contractor-unverified-456')
      ).rejects.toThrow(PublicationRequirementsNotMetError);

      expect(mockRepositoryUpdateVisibilityStatus).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-021-05: debe rechazar si servicio no tiene imágenes', async () => {
      const serviceNoImagesWithVerifiedContractor = {
        ...mockServiceDraftNoImages,
        contractorId: 'contractor-verified-123',
      };

      mockRepositoryFindById.mockResolvedValue(serviceNoImagesWithVerifiedContractor);
      mockContractorRepositoryFindById.mockResolvedValue(mockVerifiedContractor);

      await expect(
        serviceService.publishService('service-draft-no-images-111', 'contractor-verified-123')
      ).rejects.toThrow(PublicationRequirementsNotMetError);

      expect(mockRepositoryUpdateVisibilityStatus).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-021-06: debe rechazar si contratista no existe', async () => {
      const serviceWithNonexistentContractor = {
        ...mockServiceDraft,
        contractorId: 'contractor-nonexistent',
      };

      mockRepositoryFindById.mockResolvedValue(serviceWithNonexistentContractor);
      mockContractorRepositoryFindById.mockResolvedValue(null);

      await expect(
        serviceService.publishService('service-draft-123', 'contractor-nonexistent')
      ).rejects.toThrow('Perfil de contratista contractor-nonexistent no encontrado');

      expect(mockRepositoryUpdateVisibilityStatus).not.toHaveBeenCalled();
    });
  });

  describe('pauseService', () => {
    it('TC-SERVICE-022: debe pausar servicio ACTIVE exitosamente', async () => {
      const pausedService = {
        ...mockServiceActive,
        visibilityStatus: 'PAUSED' as const,
      };

      mockRepositoryFindById.mockResolvedValue(mockServiceActive);
      mockContractorRepositoryFindById.mockResolvedValue(mockVerifiedContractor);
      mockRepositoryUpdateVisibilityStatus.mockResolvedValue(pausedService);

      const result = await serviceService.pauseService('service-active-456', 'contractor-verified-123');

      expect(result.visibilityStatus).toBe('PAUSED');
      expect(mockRepositoryUpdateVisibilityStatus).toHaveBeenCalledWith('service-active-456', 'PAUSED');
    });

    it('TC-SERVICE-022-02: debe rechazar si servicio no existe', async () => {
      mockRepositoryFindById.mockResolvedValue(null);

      await expect(
        serviceService.pauseService('service-nonexistent', 'contractor-verified-123')
      ).rejects.toThrow(ServiceNotFoundError);

      expect(mockRepositoryUpdateVisibilityStatus).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-022-03: debe rechazar si usuario no es dueño', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceActive);

      await expect(
        serviceService.pauseService('service-active-456', 'contractor-other-999')
      ).rejects.toThrow(UnauthorizedServiceAccessError);

      expect(mockRepositoryUpdateVisibilityStatus).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-022-04: debe rechazar pausa de servicio DRAFT', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);
      mockContractorRepositoryFindById.mockResolvedValue(mockVerifiedContractor);

      await expect(
        serviceService.pauseService('service-draft-123', 'contractor-verified-123')
      ).rejects.toThrow(InvalidStateTransitionError);

      expect(mockRepositoryUpdateVisibilityStatus).not.toHaveBeenCalled();
    });
  });

  describe('deleteService', () => {
    it('TC-SERVICE-023: debe archivar servicio exitosamente', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);
      mockContractorRepositoryFindById.mockResolvedValue(mockVerifiedContractor);
      mockRepositoryDelete.mockResolvedValue(undefined);

      await serviceService.deleteService('service-draft-123', 'contractor-verified-123');

      expect(mockRepositoryDelete).toHaveBeenCalledWith('service-draft-123');
    });

    it('TC-SERVICE-023-02: debe rechazar si servicio no existe', async () => {
      mockRepositoryFindById.mockResolvedValue(null);

      await expect(
        serviceService.deleteService('service-nonexistent', 'contractor-verified-123')
      ).rejects.toThrow(ServiceNotFoundError);

      expect(mockRepositoryDelete).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-023-03: debe rechazar si usuario no es dueño', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);

      await expect(
        serviceService.deleteService('service-draft-123', 'contractor-other-999')
      ).rejects.toThrow(UnauthorizedServiceAccessError);

      expect(mockRepositoryDelete).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-023-04: debe permitir archivar desde cualquier estado', async () => {
      // DRAFT
      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);
      mockContractorRepositoryFindById.mockResolvedValue(mockVerifiedContractor);
      mockRepositoryDelete.mockResolvedValue(undefined);

      await expect(
        serviceService.deleteService('service-draft-123', 'contractor-verified-123')
      ).resolves.not.toThrow();

      // ACTIVE
      mockRepositoryFindById.mockResolvedValue(mockServiceActive);
      await expect(
        serviceService.deleteService('service-active-456', 'contractor-verified-123')
      ).resolves.not.toThrow();

      // PAUSED
      mockRepositoryFindById.mockResolvedValue(mockServicePaused);
      await expect(
        serviceService.deleteService('service-paused-789', 'contractor-verified-123')
      ).resolves.not.toThrow();

      expect(mockRepositoryDelete).toHaveBeenCalledTimes(3);
    });

    it('TC-SERVICE-023-05: debe permitir archivar servicio ya ARCHIVED (idempotente)', async () => {
      // ARCHIVED → ARCHIVED is allowed by state machine (idempotent)
      mockRepositoryFindById.mockResolvedValue(mockServiceArchived);
      mockContractorRepositoryFindById.mockResolvedValue(mockVerifiedContractor);
      mockRepositoryDelete.mockResolvedValue(undefined);

      await expect(
        serviceService.deleteService('service-archived-999', 'contractor-verified-123')
      ).resolves.not.toThrow();

      // The delete should be called even for already archived services (idempotent operation)
      expect(mockRepositoryDelete).toHaveBeenCalledWith('service-archived-999');
    });
  });

  describe('adminPauseService', () => {
    it('TC-SERVICE-024: admin debe poder pausar servicio ACTIVE', async () => {
      const pausedService = {
        ...mockServiceActive,
        visibilityStatus: 'PAUSED' as const,
      };

      mockRepositoryFindById.mockResolvedValue(mockServiceActive);
      mockContractorRepositoryFindById.mockResolvedValue(mockVerifiedContractor);
      mockRepositoryUpdateVisibilityStatus.mockResolvedValue(pausedService);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await serviceService.adminPauseService('service-active-456', 'user-admin-123');

      expect(result.visibilityStatus).toBe('PAUSED');
      expect(mockRepositoryUpdateVisibilityStatus).toHaveBeenCalledWith('service-active-456', 'PAUSED');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AUDIT] Admin pause service',
        expect.objectContaining({
          adminUserId: 'user-admin-123',
          serviceId: 'service-active-456',
        })
      );

      consoleSpy.mockRestore();
    });

    it('TC-SERVICE-024-02: debe rechazar si servicio no existe', async () => {
      mockRepositoryFindById.mockResolvedValue(null);

      await expect(
        serviceService.adminPauseService('service-nonexistent', 'user-admin-123')
      ).rejects.toThrow(ServiceNotFoundError);
    });

    it('TC-SERVICE-024-03: debe rechazar pausar servicio DRAFT', async () => {
      mockRepositoryFindById.mockResolvedValue(mockServiceDraft);
      mockContractorRepositoryFindById.mockResolvedValue(mockVerifiedContractor);

      await expect(
        serviceService.adminPauseService('service-draft-123', 'user-admin-123')
      ).rejects.toThrow(InvalidStateTransitionError);
    });
  });

  describe('adminActivateService', () => {
    it('TC-SERVICE-025: admin debe poder activar servicio PAUSED', async () => {
      const activatedService = {
        ...mockServicePaused,
        visibilityStatus: 'ACTIVE' as const,
        lastPublishedAt: new Date(),
      };

      mockRepositoryFindById.mockResolvedValue(mockServicePaused);
      mockContractorRepositoryFindById.mockResolvedValue(mockVerifiedContractor);
      mockRepositoryUpdateVisibilityStatus.mockResolvedValue(activatedService);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await serviceService.adminActivateService('service-paused-789', 'user-admin-123');

      expect(result.visibilityStatus).toBe('ACTIVE');
      expect(mockRepositoryUpdateVisibilityStatus).toHaveBeenCalledWith('service-paused-789', 'ACTIVE');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[AUDIT] Admin activate service',
        expect.objectContaining({
          adminUserId: 'user-admin-123',
          serviceId: 'service-paused-789',
        })
      );

      consoleSpy.mockRestore();
    });

    it('TC-SERVICE-025-02: debe rechazar si servicio no existe', async () => {
      mockRepositoryFindById.mockResolvedValue(null);

      await expect(
        serviceService.adminActivateService('service-nonexistent', 'user-admin-123')
      ).rejects.toThrow(ServiceNotFoundError);
    });
  });
});
