import { userRepository } from '../repositories/userRepository';
import { updateUserProfileSchema } from '../validators';
import type { UpdateUserProfileDTO, UserProfile, PublicUserProfile } from '../types';

/**
 * Servicio de dominio para gestión de perfiles de usuario
 */
export const userService = {
  /**
   * Obtener perfil completo de usuario incluyendo direcciones
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    return await userRepository.findById(userId);
  },

  /**
   * Actualizar perfil de usuario
   * Valida datos con Zod antes de persistir
   */
  async updateProfile(
    userId: string,
    data: UpdateUserProfileDTO
  ): Promise<UserProfile> {
    // Validar con Zod
    const validated = updateUserProfileSchema.parse(data);
    return await userRepository.update(userId, validated);
  },

  /**
   * Obtener perfil público de usuario (sin datos sensibles)
   * Usado para mostrar información en servicios y calificaciones
   */
  async getPublicProfile(userId: string): Promise<PublicUserProfile> {
    return await userRepository.getPublicProfile(userId);
  },
};
