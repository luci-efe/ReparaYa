import { prisma } from '@/lib/db';
import { ContractorProfileNotFoundError } from '../errors';
import type { Prisma } from '@prisma/client';
import type {
  ContractorProfileDTO,
  CreateContractorProfileDTO,
  UpdateContractorProfileDTO,
  PublicContractorProfileDTO,
} from '../types';

/**
 * Repositorio para acceso a datos de perfiles de contratistas
 */
export const contractorProfileRepository = {
  /**
   * Crear perfil de contratista
   */
  async create(
    userId: string,
    data: CreateContractorProfileDTO
  ): Promise<ContractorProfileDTO> {
    const profile = await prisma.contractorProfile.create({
      data: {
        userId,
        businessName: data.businessName,
        description: data.description,
        specialties: data.specialties,
        verificationDocuments: (data.verificationDocuments as Prisma.InputJsonValue) ?? null,
        verified: false, // Siempre inicia en estado DRAFT
        stripeConnectAccountId: null, // No se implementa Stripe Connect en este change
      },
    });

    return profile as ContractorProfileDTO;
  },

  /**
   * Buscar perfil de contratista por ID
   */
  async findById(id: string): Promise<ContractorProfileDTO | null> {
    const profile = await prisma.contractorProfile.findUnique({
      where: { id },
    });

    return profile as ContractorProfileDTO | null;
  },

  /**
   * Buscar perfil de contratista por userId
   */
  async findByUserId(userId: string): Promise<ContractorProfileDTO | null> {
    const profile = await prisma.contractorProfile.findUnique({
      where: { userId },
    });

    return profile as ContractorProfileDTO | null;
  },

  /**
   * Actualizar perfil de contratista
   */
  async update(
    id: string,
    data: UpdateContractorProfileDTO
  ): Promise<ContractorProfileDTO> {
    // Validar existencia antes de actualizar
    const existingProfile = await prisma.contractorProfile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      throw new ContractorProfileNotFoundError(id);
    }

    const profile = await prisma.contractorProfile.update({
      where: { id },
      data: {
        businessName: data.businessName,
        description: data.description,
        specialties: data.specialties,
        verificationDocuments: data.verificationDocuments as Prisma.InputJsonValue | undefined,
      },
    });

    return profile as ContractorProfileDTO;
  },

  /**
   * Actualizar estado de verificación del perfil
   */
  async updateVerificationStatus(
    id: string,
    verified: boolean
  ): Promise<ContractorProfileDTO> {
    // Validar existencia antes de actualizar
    const existingProfile = await prisma.contractorProfile.findUnique({
      where: { id },
    });

    if (!existingProfile) {
      throw new ContractorProfileNotFoundError(id);
    }

    const profile = await prisma.contractorProfile.update({
      where: { id },
      data: { verified },
    });

    return profile as ContractorProfileDTO;
  },

  /**
   * Obtener perfil público de contratista (sin datos sensibles)
   */
  async findPublicById(id: string): Promise<PublicContractorProfileDTO | null> {
    const profile = await prisma.contractorProfile.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        businessName: true,
        description: true,
        specialties: true,
        verified: true,
        // NO exponer verificationDocuments ni stripeConnectAccountId
      },
    });

    return profile;
  },
};
