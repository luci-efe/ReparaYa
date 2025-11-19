import { prisma } from '@/lib/db';
import { AddressNotFoundError, CannotDeleteLastAddressError } from '../errors';
import type { CreateAddressDTO, UpdateAddressDTO, Address } from '../types';

/**
 * Repositorio para acceso a datos de direcciones
 */
export const addressRepository = {
  /**
   * Crear nueva dirección para un usuario
   * Regla BR-002: Solo una dirección puede ser isDefault: true por usuario
   */
  async create(userId: string, data: CreateAddressDTO): Promise<Address> {
    // Si isDefault: true, desactivar otras direcciones
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: {
        ...data,
        userId,
        country: 'MX', // Hardcoded para México
      },
    });

    return address;
  },

  /**
   * Actualizar dirección existente
   * Valida que la dirección pertenece al usuario
   * Regla BR-002: Solo una dirección puede ser isDefault: true por usuario
   */
  async update(
    id: string,
    userId: string,
    data: UpdateAddressDTO
  ): Promise<Address> {
    // Verificar que la dirección pertenece al usuario
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new AddressNotFoundError(id);
    }

    // Si isDefault: true, desactivar otras direcciones (excepto la actual)
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id },
      data,
    });

    return updatedAddress;
  },

  /**
   * Eliminar dirección
   * Regla BR-001: No permitir eliminar la única dirección del usuario
   */
  async delete(id: string, userId: string): Promise<void> {
    // Verificar que no es la única dirección
    const addressCount = await prisma.address.count({
      where: { userId },
    });

    if (addressCount <= 1) {
      throw new CannotDeleteLastAddressError();
    }

    // Verificar que pertenece al usuario
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new AddressNotFoundError(id);
    }

    await prisma.address.delete({ where: { id } });
  },

  /**
   * Obtener todas las direcciones de un usuario
   * Ordenadas por isDefault DESC (la dirección default primero)
   */
  async findByUserId(userId: string): Promise<Address[]> {
    return await prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  },

  /**
   * Obtener dirección por ID
   * Valida que pertenece al usuario
   */
  async findById(id: string, userId: string): Promise<Address> {
    const address = await prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throw new AddressNotFoundError(id);
    }

    return address;
  },
};
