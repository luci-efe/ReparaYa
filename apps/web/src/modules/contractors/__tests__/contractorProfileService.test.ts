import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ZodError } from 'zod';

// Imports
import { contractorProfileService } from '../services/contractorProfileService';
import { contractorProfileRepository } from '../repositories/contractorProfileRepository';
import { userRepository } from '@/modules/users/repositories/userRepository';
import {
  ContractorProfileNotFoundError,
  ContractorProfileAlreadyExistsError,
  InvalidVerificationStatusError,
  UnauthorizedContractorActionError,
} from '../errors';
import {
  mockContractorUser,
  mockClientUser,
  mockAdminUser,
  mockContractorProfile,
  mockVerifiedContractorProfile,
  mockPublicContractorProfile,
  mockCreateContractorProfileInput,
  mockUpdateContractorProfileInput,
} from '../test-fixtures';

describe('contractorProfileService', () => {
  // Create spies for repository methods
  let mockRepositoryCreate: ReturnType<typeof jest.spyOn>;
  let mockRepositoryFindByUserId: ReturnType<typeof jest.spyOn>;
  let mockRepositoryFindById: ReturnType<typeof jest.spyOn>;
  let mockRepositoryUpdate: ReturnType<typeof jest.spyOn>;
  let mockRepositoryUpdateVerificationStatus: ReturnType<typeof jest.spyOn>;
  let mockRepositoryFindPublicById: ReturnType<typeof jest.spyOn>;
  let mockUserRepositoryFindById: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    // Set up spies before each test
    mockRepositoryCreate = jest.spyOn(contractorProfileRepository, 'create');
    mockRepositoryFindByUserId = jest.spyOn(contractorProfileRepository, 'findByUserId');
    mockRepositoryFindById = jest.spyOn(contractorProfileRepository, 'findById');
    mockRepositoryUpdate = jest.spyOn(contractorProfileRepository, 'update');
    mockRepositoryUpdateVerificationStatus = jest.spyOn(contractorProfileRepository, 'updateVerificationStatus');
    mockRepositoryFindPublicById = jest.spyOn(contractorProfileRepository, 'findPublicById');
    mockUserRepositoryFindById = jest.spyOn(userRepository, 'findById');
  });

  afterEach(() => {
    // Restore all spies after each test
    jest.restoreAllMocks();
  });

  describe('createProfile', () => {
    it('TC-CONTRACTOR-001: debe crear perfil exitosamente para usuario CONTRACTOR', async () => {
      // Arrange
      const userId = 'user-contractor-123';

      mockUserRepositoryFindById.mockResolvedValue(mockContractorUser);
      mockRepositoryFindByUserId.mockResolvedValue(null); // No existe perfil previo
      mockRepositoryCreate.mockResolvedValue(mockContractorProfile);

      // Act
      const result = await contractorProfileService.createProfile(
        userId,
        mockCreateContractorProfileInput
      );

      // Assert
      expect(result).toEqual(mockContractorProfile);
      expect(result.verified).toBe(false);
      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(userId);
      expect(mockRepositoryFindByUserId).toHaveBeenCalledWith(userId);
      expect(mockRepositoryCreate).toHaveBeenCalledWith(
        userId,
        mockCreateContractorProfileInput
      );
    });

    it('TC-CONTRACTOR-001-02: debe rechazar creación si el usuario no existe', async () => {
      // Arrange
      const userId = 'user-nonexistent';
      mockUserRepositoryFindById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        contractorProfileService.createProfile(userId, mockCreateContractorProfileInput)
      ).rejects.toThrow('Usuario no encontrado');

      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(userId);
      expect(mockRepositoryFindByUserId).not.toHaveBeenCalled();
      expect(mockRepositoryCreate).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-001-03: debe rechazar creación si el usuario no es CONTRACTOR', async () => {
      // Arrange
      const userId = 'user-client-456';
      mockUserRepositoryFindById.mockResolvedValue(mockClientUser);

      // Act & Assert
      await expect(
        contractorProfileService.createProfile(userId, mockCreateContractorProfileInput)
      ).rejects.toThrow(UnauthorizedContractorActionError);

      await expect(
        contractorProfileService.createProfile(userId, mockCreateContractorProfileInput)
      ).rejects.toThrow('Solo usuarios con rol CONTRACTOR pueden crear un perfil de contratista');

      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(userId);
      expect(mockRepositoryCreate).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-001-04: debe rechazar creación si ya existe perfil para el usuario', async () => {
      // Arrange
      const userId = 'user-contractor-123';

      mockUserRepositoryFindById.mockResolvedValue(mockContractorUser);
      mockRepositoryFindByUserId.mockResolvedValue(mockContractorProfile); // Perfil ya existe

      // Act & Assert
      await expect(
        contractorProfileService.createProfile(userId, mockCreateContractorProfileInput)
      ).rejects.toThrow(ContractorProfileAlreadyExistsError);

      await expect(
        contractorProfileService.createProfile(userId, mockCreateContractorProfileInput)
      ).rejects.toThrow(`El usuario ${userId} ya tiene un perfil de contratista`);

      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(userId);
      expect(mockRepositoryFindByUserId).toHaveBeenCalledWith(userId);
      expect(mockRepositoryCreate).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-001-05: debe validar datos con Zod antes de crear', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const invalidData = {
        businessName: '', // Inválido: vacío
        description: 'Short', // Inválido: muy corto
        specialties: [], // Inválido: vacío
      };

      // Act & Assert
      await expect(
        contractorProfileService.createProfile(userId, invalidData)
      ).rejects.toThrow(ZodError);

      // No debe llamar al repositorio si la validación falla
      expect(mockRepositoryCreate).not.toHaveBeenCalled();
    });
  });

  describe('getProfileByUserId', () => {
    it('TC-CONTRACTOR-002: debe retornar perfil cuando existe', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      mockRepositoryFindByUserId.mockResolvedValue(mockContractorProfile);

      // Act
      const result = await contractorProfileService.getProfileByUserId(userId);

      // Assert
      expect(result).toEqual(mockContractorProfile);
      expect(mockRepositoryFindByUserId).toHaveBeenCalledWith(userId);
    });

    it('TC-CONTRACTOR-002-02: debe lanzar ContractorProfileNotFoundError cuando no existe', async () => {
      // Arrange
      const userId = 'user-no-profile';
      mockRepositoryFindByUserId.mockResolvedValue(null);

      // Act & Assert
      await expect(
        contractorProfileService.getProfileByUserId(userId)
      ).rejects.toThrow(ContractorProfileNotFoundError);

      await expect(
        contractorProfileService.getProfileByUserId(userId)
      ).rejects.toThrow(`Perfil de contratista userId: ${userId} no encontrado`);

      expect(mockRepositoryFindByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateProfile', () => {
    it('TC-CONTRACTOR-002: debe actualizar perfil exitosamente en estado DRAFT', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const updatedProfile = {
        ...mockContractorProfile,
        businessName: mockUpdateContractorProfileInput.businessName,
        description: mockUpdateContractorProfileInput.description,
        specialties: mockUpdateContractorProfileInput.specialties,
      };

      mockRepositoryFindByUserId.mockResolvedValue(mockContractorProfile);
      mockRepositoryUpdate.mockResolvedValue(updatedProfile);

      // Act
      const result = await contractorProfileService.updateProfile(
        userId,
        mockUpdateContractorProfileInput
      );

      // Assert
      expect(result).toEqual(updatedProfile);
      expect(mockRepositoryFindByUserId).toHaveBeenCalledWith(userId);
      expect(mockRepositoryUpdate).toHaveBeenCalledWith(
        mockContractorProfile.id,
        mockUpdateContractorProfileInput
      );
    });

    it('TC-CONTRACTOR-002-02: debe rechazar actualización si el perfil no existe', async () => {
      // Arrange
      const userId = 'user-no-profile';
      mockRepositoryFindByUserId.mockResolvedValue(null);

      // Act & Assert
      await expect(
        contractorProfileService.updateProfile(userId, mockUpdateContractorProfileInput)
      ).rejects.toThrow(ContractorProfileNotFoundError);

      await expect(
        contractorProfileService.updateProfile(userId, mockUpdateContractorProfileInput)
      ).rejects.toThrow(`Perfil de contratista userId: ${userId} no encontrado`);

      expect(mockRepositoryFindByUserId).toHaveBeenCalledWith(userId);
      expect(mockRepositoryUpdate).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-002-03: debe rechazar actualización si el perfil está verificado', async () => {
      // Arrange
      const userId = 'user-contractor-456';

      mockRepositoryFindByUserId.mockResolvedValue(mockVerifiedContractorProfile);

      // Act & Assert
      await expect(
        contractorProfileService.updateProfile(userId, mockUpdateContractorProfileInput)
      ).rejects.toThrow(InvalidVerificationStatusError);

      await expect(
        contractorProfileService.updateProfile(userId, mockUpdateContractorProfileInput)
      ).rejects.toThrow('No se puede editar un perfil verificado. Contacta a un administrador para realizar cambios.');

      expect(mockRepositoryFindByUserId).toHaveBeenCalledWith(userId);
      expect(mockRepositoryUpdate).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-002-04: debe validar datos con Zod antes de actualizar', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const invalidData = {
        businessName: 'A'.repeat(101), // Inválido: muy largo
      };

      // Act & Assert
      await expect(
        contractorProfileService.updateProfile(userId, invalidData)
      ).rejects.toThrow(ZodError);

      // No debe llamar al repositorio si la validación falla
      expect(mockRepositoryUpdate).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-002-05: debe permitir actualización parcial de campos', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const partialUpdate = {
        businessName: 'Nuevo Nombre',
      };

      const updatedProfile = {
        ...mockContractorProfile,
        businessName: partialUpdate.businessName,
      };

      mockRepositoryFindByUserId.mockResolvedValue(mockContractorProfile);
      mockRepositoryUpdate.mockResolvedValue(updatedProfile);

      // Act
      const result = await contractorProfileService.updateProfile(userId, partialUpdate);

      // Assert
      expect(result.businessName).toBe(partialUpdate.businessName);
      expect(mockRepositoryUpdate).toHaveBeenCalledWith(
        mockContractorProfile.id,
        partialUpdate
      );
    });
  });

  describe('getPublicProfile', () => {
    it('TC-CONTRACTOR-003: debe retornar perfil público exitosamente', async () => {
      // Arrange
      const contractorId = 'contractor-profile-123';
      mockRepositoryFindPublicById.mockResolvedValue(mockPublicContractorProfile);

      // Act
      const result = await contractorProfileService.getPublicProfile(contractorId);

      // Assert
      expect(result).toEqual(mockPublicContractorProfile);
      expect(result).not.toHaveProperty('verificationDocuments');
      expect(result).not.toHaveProperty('stripeConnectAccountId');
      expect(mockRepositoryFindPublicById).toHaveBeenCalledWith(contractorId);
    });

    it('TC-CONTRACTOR-003-02: debe lanzar ContractorProfileNotFoundError cuando no existe', async () => {
      // Arrange
      const contractorId = 'contractor-nonexistent';
      mockRepositoryFindPublicById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        contractorProfileService.getPublicProfile(contractorId)
      ).rejects.toThrow(ContractorProfileNotFoundError);

      await expect(
        contractorProfileService.getPublicProfile(contractorId)
      ).rejects.toThrow(`Perfil de contratista ${contractorId} no encontrado`);

      expect(mockRepositoryFindPublicById).toHaveBeenCalledWith(contractorId);
    });
  });

  describe('verifyProfile', () => {
    it('TC-CONTRACTOR-011: debe permitir a admin verificar perfil (approved)', async () => {
      // Arrange
      const adminUserId = 'user-admin-789';
      const contractorId = 'contractor-profile-123';
      const verifiedProfile = {
        ...mockContractorProfile,
        verified: true,
      };

      mockUserRepositoryFindById.mockResolvedValue(mockAdminUser);
      mockRepositoryFindById.mockResolvedValue(mockContractorProfile);
      mockRepositoryUpdateVerificationStatus.mockResolvedValue(verifiedProfile);

      // Act
      const result = await contractorProfileService.verifyProfile(
        adminUserId,
        contractorId,
        true
      );

      // Assert
      expect(result).toEqual(verifiedProfile);
      expect(result.verified).toBe(true);
      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(adminUserId);
      expect(mockRepositoryFindById).toHaveBeenCalledWith(contractorId);
      expect(mockRepositoryUpdateVerificationStatus).toHaveBeenCalledWith(
        contractorId,
        true
      );
    });

    it('TC-CONTRACTOR-011-02: debe permitir a admin rechazar perfil (verified: false)', async () => {
      // Arrange
      const adminUserId = 'user-admin-789';
      const contractorId = 'contractor-profile-verified-456';
      const unverifiedProfile = {
        ...mockVerifiedContractorProfile,
        verified: false,
      };

      mockUserRepositoryFindById.mockResolvedValue(mockAdminUser);
      mockRepositoryFindById.mockResolvedValue(mockVerifiedContractorProfile);
      mockRepositoryUpdateVerificationStatus.mockResolvedValue(unverifiedProfile);

      // Act
      const result = await contractorProfileService.verifyProfile(
        adminUserId,
        contractorId,
        false
      );

      // Assert
      expect(result).toEqual(unverifiedProfile);
      expect(result.verified).toBe(false);
      expect(mockRepositoryUpdateVerificationStatus).toHaveBeenCalledWith(
        contractorId,
        false
      );
    });

    it('TC-CONTRACTOR-012: debe rechazar verificación si el usuario no es admin', async () => {
      // Arrange
      const contractorUserId = 'user-contractor-123';
      const contractorId = 'contractor-profile-123';

      mockUserRepositoryFindById.mockResolvedValue(mockContractorUser);

      // Act & Assert
      await expect(
        contractorProfileService.verifyProfile(contractorUserId, contractorId, true)
      ).rejects.toThrow(UnauthorizedContractorActionError);

      await expect(
        contractorProfileService.verifyProfile(contractorUserId, contractorId, true)
      ).rejects.toThrow('Solo administradores pueden verificar perfiles de contratistas');

      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(contractorUserId);
      expect(mockRepositoryUpdateVerificationStatus).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-012-02: debe rechazar si admin no existe', async () => {
      // Arrange
      const adminUserId = 'user-nonexistent';
      const contractorId = 'contractor-profile-123';

      mockUserRepositoryFindById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        contractorProfileService.verifyProfile(adminUserId, contractorId, true)
      ).rejects.toThrow('Usuario no encontrado');

      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(adminUserId);
      expect(mockRepositoryUpdateVerificationStatus).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-012-03: debe rechazar si el perfil a verificar no existe', async () => {
      // Arrange
      const adminUserId = 'user-admin-789';
      const contractorId = 'contractor-nonexistent';

      mockUserRepositoryFindById.mockResolvedValue(mockAdminUser);
      mockRepositoryFindById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        contractorProfileService.verifyProfile(adminUserId, contractorId, true)
      ).rejects.toThrow(ContractorProfileNotFoundError);

      await expect(
        contractorProfileService.verifyProfile(adminUserId, contractorId, true)
      ).rejects.toThrow(`Perfil de contratista ${contractorId} no encontrado`);

      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(adminUserId);
      expect(mockRepositoryFindById).toHaveBeenCalledWith(contractorId);
      expect(mockRepositoryUpdateVerificationStatus).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-012-04: debe rechazar si admin intenta verificar su propio perfil', async () => {
      // Arrange
      const adminUserId = 'user-admin-789';
      const contractorId = 'contractor-profile-admin';

      // Crear un perfil de contratista que pertenece al admin
      const adminContractorProfile = {
        ...mockContractorProfile,
        id: contractorId,
        userId: adminUserId,
      };

      mockUserRepositoryFindById.mockResolvedValue(mockAdminUser);
      mockRepositoryFindById.mockResolvedValue(adminContractorProfile);

      // Act & Assert
      await expect(
        contractorProfileService.verifyProfile(adminUserId, contractorId, true)
      ).rejects.toThrow(UnauthorizedContractorActionError);

      await expect(
        contractorProfileService.verifyProfile(adminUserId, contractorId, true)
      ).rejects.toThrow('No puedes verificar tu propio perfil');

      expect(mockUserRepositoryFindById).toHaveBeenCalledWith(adminUserId);
      expect(mockRepositoryFindById).toHaveBeenCalledWith(contractorId);
      expect(mockRepositoryUpdateVerificationStatus).not.toHaveBeenCalled();
    });
  });
});
