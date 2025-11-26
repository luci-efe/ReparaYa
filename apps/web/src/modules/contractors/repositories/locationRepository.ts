import { prisma } from '@/lib/db';
import type { ContractorServiceLocation } from '@prisma/client';
import type { LocationCreateInput, LocationUpdateInput } from '../types/location';

/**
 * Repository para operaciones de base de datos de ubicación de contratistas
 *
 * Responsabilidades:
 * - CRUD de ContractorServiceLocation
 * - Validación de ownership en mutaciones
 * - Queries optimizados con índices
 */
export const locationRepository = {
  /**
   * Crear nueva ubicación para un contratista
   *
   * @throws Si ya existe una ubicación para este perfil (unique constraint)
   */
  async create(data: LocationCreateInput): Promise<ContractorServiceLocation> {
    return await prisma.contractorServiceLocation.create({
      data: {
        contractorProfileId: data.contractorProfileId,
        street: data.street,
        exteriorNumber: data.exteriorNumber,
        interiorNumber: data.interiorNumber,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        baseLatitude: data.baseLatitude,
        baseLongitude: data.baseLongitude,
        normalizedAddress: data.normalizedAddress,
        timezone: data.timezone,
        geocodingStatus: data.geocodingStatus,
        zoneType: data.zoneType,
        radiusKm: data.radiusKm,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        polygonCoordinates: data.polygonCoordinates as any,
      },
    });
  },

  /**
   * Buscar ubicación por ID de perfil de contratista
   */
  async findByContractorProfileId(
    contractorProfileId: string
  ): Promise<ContractorServiceLocation | null> {
    return await prisma.contractorServiceLocation.findUnique({
      where: {
        contractorProfileId,
      },
    });
  },

  /**
   * Buscar ubicación por ID
   */
  async findById(id: string): Promise<ContractorServiceLocation | null> {
    return await prisma.contractorServiceLocation.findUnique({
      where: {
        id,
      },
    });
  },

  /**
   * Actualizar ubicación existente
   *
   * Validación de ownership debe hacerse en service layer
   */
  async update(
    contractorProfileId: string,
    data: LocationUpdateInput
  ): Promise<ContractorServiceLocation> {
    return await prisma.contractorServiceLocation.update({
      where: {
        contractorProfileId,
      },
      data: {
        ...data,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        polygonCoordinates: data.polygonCoordinates as any,
      },
    });
  },

  /**
   * Eliminar ubicación
   *
   * Validación de ownership debe hacerse en service layer
   */
  async delete(contractorProfileId: string): Promise<ContractorServiceLocation> {
    return await prisma.contractorServiceLocation.delete({
      where: {
        contractorProfileId,
      },
    });
  },

  /**
   * Verificar si existe ubicación para un perfil
   */
  async exists(contractorProfileId: string): Promise<boolean> {
    const count = await prisma.contractorServiceLocation.count({
      where: {
        contractorProfileId,
      },
    });

    return count > 0;
  },

  /**
   * Buscar ubicación con validación de ownership
   *
   * @param contractorProfileId - ID del perfil de contratista
   * @param userId - ID del usuario que solicita (para validar ownership)
   * @returns Ubicación si existe y el usuario es owner, null en caso contrario
   */
  async findByContractorProfileIdWithOwnership(
    contractorProfileId: string,
    userId: string
  ): Promise<ContractorServiceLocation | null> {
    return await prisma.contractorServiceLocation.findFirst({
      where: {
        contractorProfileId,
        contractorProfile: {
          userId,
        },
      },
    });
  },
};
