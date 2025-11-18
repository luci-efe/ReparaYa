import { prisma } from '@/lib/db';
import { UserNotFoundError } from '../errors';
import type { UpdateUserProfileDTO, UserProfile, PublicUserProfile } from '../types';

/**
 * Repositorio para acceso a datos de usuarios
 */
export const userRepository = {
  /**
   * Buscar usuario por ID incluyendo direcciones
   */
  async findById(id: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { addresses: true },
    });
    return user;
  },

  /**
   * Buscar usuario por Clerk User ID incluyendo direcciones
   */
  async findByClerkUserId(clerkUserId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { clerkUserId },
      include: { addresses: true },
    });
    return user;
  },

  /**
   * Actualizar perfil de usuario
   * Nota: Validamos existencia antes de actualizar para evitar depender del manejo de errores de Prisma
   */
  async update(id: string, data: UpdateUserProfileDTO): Promise<UserProfile> {
    // Validar existencia del usuario antes de actualizar
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new UserNotFoundError(id);
    }

    // Actualizar usuario
    const user = await prisma.user.update({
      where: { id },
      data,
      include: { addresses: true },
    });

    return user;
  },

  /**
   * Obtener perfil público de usuario (sin datos sensibles)
   * Usado para mostrar información en servicios y calificaciones
   */
  async getPublicProfile(id: string): Promise<PublicUserProfile> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });

    if (!user) {
      throw new UserNotFoundError(id);
    }

    return user;
  },
};
