import { prisma } from '@/lib/db';
import { contractorProfileRepository } from '../repositories/contractorProfileRepository';
import { ContractorProfileNotFoundError } from '../errors';
import {
  mockContractorProfile,
  mockContractorUser,
  mockCreateContractorProfileInput,
  mockUpdateContractorProfileInput,
} from '../test-fixtures';

// Mock de Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    contractorProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('contractorProfileRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('debe crear un perfil de contratista exitosamente', async () => {
      (prisma.contractorProfile.create as jest.Mock).mockResolvedValue(mockContractorProfile);

      const result = await contractorProfileRepository.create(
        mockContractorUser.id,
        mockCreateContractorProfileInput
      );

      expect(result).toEqual(mockContractorProfile);
      expect(prisma.contractorProfile.create).toHaveBeenCalledWith({
        data: {
          userId: mockContractorUser.id,
          businessName: mockCreateContractorProfileInput.businessName,
          description: mockCreateContractorProfileInput.description,
          specialties: mockCreateContractorProfileInput.specialties,
          verificationDocuments: mockCreateContractorProfileInput.verificationDocuments ?? null,
          verified: false,
          stripeConnectAccountId: null,
        },
      });
    });
  });

  describe('findById', () => {
    it('debe encontrar un perfil por ID', async () => {
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockContractorProfile);

      const result = await contractorProfileRepository.findById(mockContractorProfile.id);

      expect(result).toEqual(mockContractorProfile);
      expect(prisma.contractorProfile.findUnique).toHaveBeenCalledWith({
        where: { id: mockContractorProfile.id },
      });
    });

    it('debe retornar null si no se encuentra el perfil', async () => {
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await contractorProfileRepository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('debe encontrar un perfil por userId', async () => {
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockContractorProfile);

      const result = await contractorProfileRepository.findByUserId(mockContractorUser.id);

      expect(result).toEqual(mockContractorProfile);
      expect(prisma.contractorProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: mockContractorUser.id },
      });
    });

    it('debe retornar null si no se encuentra el perfil', async () => {
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await contractorProfileRepository.findByUserId('non-existent-user-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('debe actualizar un perfil exitosamente', async () => {
      const updatedProfile = {
        ...mockContractorProfile,
        businessName: mockUpdateContractorProfileInput.businessName,
      };

      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockContractorProfile);
      (prisma.contractorProfile.update as jest.Mock).mockResolvedValue(updatedProfile);

      const result = await contractorProfileRepository.update(
        mockContractorProfile.id,
        mockUpdateContractorProfileInput
      );

      expect(result).toEqual(updatedProfile);
      expect(prisma.contractorProfile.update).toHaveBeenCalledWith({
        where: { id: mockContractorProfile.id },
        data: {
          businessName: mockUpdateContractorProfileInput.businessName,
          description: mockUpdateContractorProfileInput.description,
          specialties: mockUpdateContractorProfileInput.specialties,
          verificationDocuments: undefined,
        },
      });
    });

    it('debe lanzar error si el perfil no existe', async () => {
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        contractorProfileRepository.update('non-existent-id', mockUpdateContractorProfileInput)
      ).rejects.toThrow(ContractorProfileNotFoundError);
    });
  });

  describe('updateVerificationStatus', () => {
    it('debe actualizar el estado de verificación exitosamente', async () => {
      const verifiedProfile = { ...mockContractorProfile, verified: true };

      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockContractorProfile);
      (prisma.contractorProfile.update as jest.Mock).mockResolvedValue(verifiedProfile);

      const result = await contractorProfileRepository.updateVerificationStatus(
        mockContractorProfile.id,
        true
      );

      expect(result).toEqual(verifiedProfile);
      expect(prisma.contractorProfile.update).toHaveBeenCalledWith({
        where: { id: mockContractorProfile.id },
        data: { verified: true },
      });
    });

    it('debe lanzar error si el perfil no existe', async () => {
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        contractorProfileRepository.updateVerificationStatus('non-existent-id', true)
      ).rejects.toThrow(ContractorProfileNotFoundError);
    });
  });

  describe('findPublicById', () => {
    it('debe retornar perfil público sin datos sensibles', async () => {
      const publicProfile = {
        id: mockContractorProfile.id,
        userId: mockContractorProfile.userId,
        businessName: mockContractorProfile.businessName,
        description: mockContractorProfile.description,
        specialties: mockContractorProfile.specialties,
        verified: mockContractorProfile.verified,
      };

      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(publicProfile);

      const result = await contractorProfileRepository.findPublicById(mockContractorProfile.id);

      expect(result).toEqual(publicProfile);
      expect(result).not.toHaveProperty('verificationDocuments');
      expect(result).not.toHaveProperty('stripeConnectAccountId');
      expect(prisma.contractorProfile.findUnique).toHaveBeenCalledWith({
        where: { id: mockContractorProfile.id },
        select: {
          id: true,
          userId: true,
          businessName: true,
          description: true,
          specialties: true,
          verified: true,
        },
      });
    });

    it('debe retornar null si no se encuentra el perfil', async () => {
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await contractorProfileRepository.findPublicById('non-existent-id');

      expect(result).toBeNull();
    });
  });
});
