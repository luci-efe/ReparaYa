import { contractorProfileRepository } from '../repositories/contractorProfileRepository';
import { userRepository } from '@/modules/users/repositories/userRepository';
import { createContractorProfileSchema, updateContractorProfileSchema } from '../validators';
import {
  ContractorProfileNotFoundError,
  ContractorProfileAlreadyExistsError,
  InvalidVerificationStatusError,
  UnauthorizedContractorActionError,
} from '../errors';
import type {
  ContractorProfileDTO,
  CreateContractorProfileDTO,
  UpdateContractorProfileDTO,
  PublicContractorProfileDTO,
} from '../types';

/**
 * Servicio de dominio para gestión de perfiles de contratistas
 */
export const contractorProfileService = {
  /**
   * Crear perfil de contratista
   *
   * Reglas de negocio:
   * - Solo usuarios con role=CONTRACTOR pueden crear perfil
   * - Un usuario solo puede tener un perfil (1:1)
   * - Perfil inicia con verified: false (DRAFT)
   */
  async createProfile(
    userId: string,
    data: CreateContractorProfileDTO
  ): Promise<ContractorProfileDTO> {
    // Validar datos con Zod
    const validated = createContractorProfileSchema.parse(data);

    // Validar que el usuario tenga rol CONTRACTOR
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    if (user.role !== 'CONTRACTOR') {
      throw new UnauthorizedContractorActionError(
        'Solo usuarios con rol CONTRACTOR pueden crear un perfil de contratista'
      );
    }

    // Validar que no exista un perfil previo para este userId
    const existingProfile = await contractorProfileRepository.findByUserId(userId);
    if (existingProfile) {
      throw new ContractorProfileAlreadyExistsError(userId);
    }

    // Crear perfil
    const profile = await contractorProfileRepository.create(userId, validated);

    return profile;
  },

  /**
   * Obtener perfil de contratista por userId
   * Lanza error si no existe
   */
  async getProfileByUserId(userId: string): Promise<ContractorProfileDTO> {
    const profile = await contractorProfileRepository.findByUserId(userId);

    if (!profile) {
      throw new ContractorProfileNotFoundError(`userId: ${userId}`);
    }

    return profile;
  },

  /**
   * Actualizar perfil de contratista
   *
   * Reglas de negocio:
   * - Solo el dueño puede actualizar su perfil
   * - Solo se puede editar si verified: false (estado DRAFT)
   * - No se puede editar perfil verificado sin aprobación de admin
   */
  async updateProfile(
    userId: string,
    data: UpdateContractorProfileDTO
  ): Promise<ContractorProfileDTO> {
    // Validar datos con Zod
    const validated = updateContractorProfileSchema.parse(data);

    // Obtener perfil del usuario
    const profile = await contractorProfileRepository.findByUserId(userId);
    if (!profile) {
      throw new ContractorProfileNotFoundError(`userId: ${userId}`);
    }

    // Validar que el perfil esté en estado DRAFT
    if (profile.verified) {
      throw new InvalidVerificationStatusError(
        'No se puede editar un perfil verificado. Contacta a un administrador para realizar cambios.'
      );
    }

    // Actualizar perfil
    const updatedProfile = await contractorProfileRepository.update(profile.id, validated);

    return updatedProfile;
  },

  /**
   * Obtener perfil público de contratista (sin datos sensibles)
   * Usado para mostrar información en servicios y bookings
   */
  async getPublicProfile(contractorId: string): Promise<PublicContractorProfileDTO> {
    const profile = await contractorProfileRepository.findPublicById(contractorId);

    if (!profile) {
      throw new ContractorProfileNotFoundError(contractorId);
    }

    return profile;
  },

  /**
   * Verificar o rechazar perfil de contratista (solo admins)
   *
   * Reglas de negocio:
   * - Solo admins pueden cambiar el estado de verificación
   * - Contratistas no pueden auto-aprobarse
   * - verified: true → estado ACTIVE
   * - verified: false → estado DRAFT
   */
  async verifyProfile(
    adminUserId: string,
    contractorId: string,
    verified: boolean
  ): Promise<ContractorProfileDTO> {
    // Validar que el usuario que ejecuta la acción sea admin
    const adminUser = await userRepository.findById(adminUserId);
    if (!adminUser) {
      throw new Error('Usuario no encontrado');
    }
    if (adminUser.role !== 'ADMIN') {
      throw new UnauthorizedContractorActionError(
        'Solo administradores pueden verificar perfiles de contratistas'
      );
    }

    // Validar que el perfil exista
    const profile = await contractorProfileRepository.findById(contractorId);
    if (!profile) {
      throw new ContractorProfileNotFoundError(contractorId);
    }

    // Validar que el admin no esté intentando verificar su propio perfil
    if (profile.userId === adminUserId) {
      throw new UnauthorizedContractorActionError(
        'No puedes verificar tu propio perfil'
      );
    }

    // Actualizar estado de verificación
    const updatedProfile = await contractorProfileRepository.updateVerificationStatus(
      contractorId,
      verified
    );

    return updatedProfile;
  },
};
