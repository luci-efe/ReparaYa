import { addressRepository } from '../repositories/addressRepository';
import { createAddressSchema, updateAddressSchema } from '../validators';
import type { CreateAddressDTO, UpdateAddressDTO, Address } from '../types';

/**
 * Servicio de dominio para gestión de direcciones de usuario
 */
export const addressService = {
  /**
   * Crear nueva dirección para usuario
   * Valida datos con Zod antes de persistir
   * Regla BR-002: Solo una dirección puede ser isDefault: true
   */
  async create(userId: string, data: CreateAddressDTO): Promise<Address> {
    const validated = createAddressSchema.parse(data);
    return await addressRepository.create(userId, validated);
  },

  /**
   * Actualizar dirección existente
   * Valida datos con Zod y propiedad (userId)
   * Regla BR-002: Solo una dirección puede ser isDefault: true
   */
  async update(
    addressId: string,
    userId: string,
    data: UpdateAddressDTO
  ): Promise<Address> {
    const validated = updateAddressSchema.parse(data);
    return await addressRepository.update(addressId, userId, validated);
  },

  /**
   * Eliminar dirección
   * Valida propiedad (userId)
   * Regla BR-001: No permitir eliminar la única dirección
   */
  async delete(addressId: string, userId: string): Promise<void> {
    return await addressRepository.delete(addressId, userId);
  },

  /**
   * Obtener todas las direcciones de un usuario
   * Ordenadas por isDefault DESC
   */
  async getByUserId(userId: string): Promise<Address[]> {
    return await addressRepository.findByUserId(userId);
  },

  /**
   * Obtener dirección por ID
   * Valida propiedad (userId)
   */
  async getById(addressId: string, userId: string): Promise<Address> {
    return await addressRepository.findById(addressId, userId);
  },
};
