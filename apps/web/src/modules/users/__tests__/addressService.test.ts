// Mock del repositorio - DEBE IR AL INICIO ANTES DE CUALQUIER IMPORT
jest.mock('../repositories/addressRepository', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRepo: any = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findByUserId: jest.fn(),
    findById: jest.fn(),
  };

  return {
    addressRepository: mockRepo,
  };
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Address } from '../types';
import { ZodError } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// Imports después del mock
import { addressService } from '../services/addressService';
import { addressRepository } from '../repositories/addressRepository';

// Obtener las funciones mock tipadas
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreate = addressRepository.create as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdate = addressRepository.update as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDelete = addressRepository.delete as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindByUserId = addressRepository.findByUserId as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindById = addressRepository.findById as any;

describe('addressService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('TC-RF-005-16: debe validar dirección con Zod antes de crear', async () => {
      // Arrange
      const userId = 'user-123';
      const validData = {
        addressLine1: 'Av. Insurgentes 1234',
        addressLine2: 'Depto 5B',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '06700',
        isDefault: false,
      };

      const mockCreatedAddress: Address = {
        id: 'addr-new',
        userId,
        ...validData,
        country: 'MX',
        lat: null,
        lng: null,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      };

      mockCreate.mockResolvedValue(mockCreatedAddress);

      // Act
      const result = await addressService.create(userId, validData);

      // Assert
      expect(result).toEqual(mockCreatedAddress);
      expect(mockCreate).toHaveBeenCalledWith(userId, validData);
    });

    it('TC-RF-005-17: debe rechazar postalCode con formato inválido', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidData = {
        addressLine1: 'Calle Test 123',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '123', // Formato inválido (no son 5 dígitos)
      };

      // Act & Assert
      await expect(
        addressService.create(userId, invalidData)
      ).rejects.toThrow(ZodError);

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('TC-RF-005-18: debe rechazar postalCode con letras', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidData = {
        addressLine1: 'Calle Test 123',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: 'ABC12', // Contiene letras
      };

      // Act & Assert
      await expect(
        addressService.create(userId, invalidData)
      ).rejects.toThrow(ZodError);

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('TC-RF-005-19: debe rechazar addressLine1 muy corta', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidData = {
        addressLine1: 'Cll', // Menos de 5 caracteres
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '06700',
      };

      // Act & Assert
      await expect(
        addressService.create(userId, invalidData)
      ).rejects.toThrow(ZodError);

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('TC-RF-005-20: debe rechazar city muy corta', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidData = {
        addressLine1: 'Calle Test 123',
        city: 'A', // Menos de 2 caracteres
        state: 'CDMX',
        postalCode: '06700',
      };

      // Act & Assert
      await expect(
        addressService.create(userId, invalidData)
      ).rejects.toThrow(ZodError);

      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('TC-RF-005-21: debe aceptar dirección válida sin addressLine2', async () => {
      // Arrange
      const userId = 'user-123';
      const validData = {
        addressLine1: 'Av. Reforma 456',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '11000',
      };

      const mockCreatedAddress: Address = {
        id: 'addr-new',
        userId,
        addressLine1: validData.addressLine1,
        addressLine2: null,
        city: validData.city,
        state: validData.state,
        postalCode: validData.postalCode,
        country: 'MX',
        lat: null,
        lng: null,
        isDefault: false,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      };

      mockCreate.mockResolvedValue(mockCreatedAddress);

      // Act
      const result = await addressService.create(userId, validData);

      // Assert
      expect(result.addressLine2).toBeNull();
      expect(mockCreate).toHaveBeenCalled();
    });

    it('TC-RF-005-22: debe propagar regla BR-002 del repositorio (isDefault)', async () => {
      // Arrange
      const userId = 'user-123';
      const validData = {
        addressLine1: 'Calle Nueva 789',
        city: 'Guadalajara',
        state: 'Jalisco',
        postalCode: '44100',
        isDefault: true,
      };

      const mockCreatedAddress: Address = {
        id: 'addr-new',
        userId,
        addressLine1: validData.addressLine1,
        addressLine2: null,
        city: validData.city,
        state: validData.state,
        postalCode: validData.postalCode,
        country: 'MX',
        lat: null,
        lng: null,
        isDefault: true,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      };

      mockCreate.mockResolvedValue(mockCreatedAddress);

      // Act
      const result = await addressService.create(userId, validData);

      // Assert
      expect(result.isDefault).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(userId, validData);
    });
  });

  describe('update', () => {
    it('TC-RF-005-23: debe validar datos con Zod antes de actualizar', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';
      const validData = {
        addressLine1: 'Calle Actualizada 999',
        city: 'Puebla',
      };

      const mockUpdatedAddress: Address = {
        id: addressId,
        userId,
        addressLine1: validData.addressLine1,
        addressLine2: null,
        city: validData.city,
        state: 'Puebla',
        postalCode: '72000',
        country: 'MX',
        lat: null,
        lng: null,
        isDefault: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-02-01'),
      };

      mockUpdate.mockResolvedValue(mockUpdatedAddress);

      // Act
      const result = await addressService.update(addressId, userId, validData);

      // Assert
      expect(result).toEqual(mockUpdatedAddress);
      expect(mockUpdate).toHaveBeenCalledWith(addressId, userId, validData);
    });

    it('TC-RF-005-24: debe rechazar postalCode inválido en actualización', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';
      const invalidData = {
        postalCode: '123', // Formato inválido
      };

      // Act & Assert
      await expect(
        addressService.update(addressId, userId, invalidData)
      ).rejects.toThrow(ZodError);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('TC-RF-005-25: debe rechazar addressLine1 muy corta en actualización', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';
      const invalidData = {
        addressLine1: 'Cll', // Menos de 5 caracteres
      };

      // Act & Assert
      await expect(
        addressService.update(addressId, userId, invalidData)
      ).rejects.toThrow(ZodError);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('TC-RF-005-26: debe permitir actualización parcial de campos', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';
      const partialData = {
        city: 'Querétaro',
      };

      const mockUpdatedAddress: Address = {
        id: addressId,
        userId,
        addressLine1: 'Calle Original 123',
        addressLine2: null,
        city: partialData.city,
        state: 'Querétaro',
        postalCode: '76000',
        country: 'MX',
        lat: null,
        lng: null,
        isDefault: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-02-01'),
      };

      mockUpdate.mockResolvedValue(mockUpdatedAddress);

      // Act
      const result = await addressService.update(addressId, userId, partialData);

      // Assert
      expect(result.city).toBe(partialData.city);
      expect(mockUpdate).toHaveBeenCalledWith(addressId, userId, partialData);
    });

    it('TC-RF-005-27: debe propagar regla BR-002 del repositorio al actualizar isDefault', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';
      const updateData = {
        isDefault: true,
      };

      const mockUpdatedAddress: Address = {
        id: addressId,
        userId,
        addressLine1: 'Calle Test 123',
        addressLine2: null,
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '06700',
        country: 'MX',
        lat: null,
        lng: null,
        isDefault: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-02-01'),
      };

      mockUpdate.mockResolvedValue(mockUpdatedAddress);

      // Act
      const result = await addressService.update(addressId, userId, updateData);

      // Assert
      expect(result.isDefault).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(addressId, userId, updateData);
    });
  });

  describe('delete', () => {
    it('TC-RF-005-28: debe eliminar dirección cuando cumple reglas', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';

      mockDelete.mockResolvedValue(undefined);

      // Act
      await addressService.delete(addressId, userId);

      // Assert
      expect(mockDelete).toHaveBeenCalledWith(addressId, userId);
    });

    it('TC-RF-005-29: debe propagar CannotDeleteLastAddressError del repositorio (BR-001)', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';
      const error = new Error('No puedes eliminar la única dirección de tu perfil');
      error.name = 'CannotDeleteLastAddressError';

      mockDelete.mockRejectedValue(error);

      // Act & Assert
      await expect(
        addressService.delete(addressId, userId)
      ).rejects.toThrow('No puedes eliminar la única dirección de tu perfil');

      expect(mockDelete).toHaveBeenCalledWith(addressId, userId);
    });

    it('TC-RF-005-30: debe propagar AddressNotFoundError del repositorio', async () => {
      // Arrange
      const addressId = 'addr-nonexistent';
      const userId = 'user-123';
      const error = new Error('Dirección con ID addr-nonexistent no encontrada');
      error.name = 'AddressNotFoundError';

      mockDelete.mockRejectedValue(error);

      // Act & Assert
      await expect(
        addressService.delete(addressId, userId)
      ).rejects.toThrow('Dirección con ID addr-nonexistent no encontrada');

      expect(mockDelete).toHaveBeenCalledWith(addressId, userId);
    });
  });

  describe('getByUserId', () => {
    it('TC-RF-005-31: debe retornar todas las direcciones del usuario', async () => {
      // Arrange
      const userId = 'user-123';
      const mockAddresses: Address[] = [
        {
          id: 'addr-1',
          userId,
          addressLine1: 'Dirección Principal',
          addressLine2: null,
          city: 'Ciudad de México',
          state: 'CDMX',
          postalCode: '06700',
          country: 'MX',
          lat: new Decimal('19.4326'),
          lng: new Decimal('-99.1332'),
          isDefault: true,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 'addr-2',
          userId,
          addressLine1: 'Dirección Secundaria',
          addressLine2: null,
          city: 'Guadalajara',
          state: 'Jalisco',
          postalCode: '44100',
          country: 'MX',
          lat: null,
          lng: null,
          isDefault: false,
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
        },
      ];

      mockFindByUserId.mockResolvedValue(mockAddresses);

      // Act
      const result = await addressService.getByUserId(userId);

      // Assert
      expect(result).toEqual(mockAddresses);
      expect(result).toHaveLength(2);
      expect(result[0].isDefault).toBe(true);
      expect(mockFindByUserId).toHaveBeenCalledWith(userId);
    });

    it('TC-RF-005-32: debe retornar array vacío cuando no hay direcciones', async () => {
      // Arrange
      const userId = 'user-new';

      mockFindByUserId.mockResolvedValue([]);

      // Act
      const result = await addressService.getByUserId(userId);

      // Assert
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getById', () => {
    it('TC-RF-005-33: debe retornar dirección cuando pertenece al usuario', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';

      const mockAddress: Address = {
        id: addressId,
        userId,
        addressLine1: 'Calle Test 789',
        addressLine2: null,
        city: 'Monterrey',
        state: 'Nuevo León',
        postalCode: '64000',
        country: 'MX',
        lat: new Decimal('25.6866'),
        lng: new Decimal('-100.3161'),
        isDefault: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockFindById.mockResolvedValue(mockAddress);

      // Act
      const result = await addressService.getById(addressId, userId);

      // Assert
      expect(result).toEqual(mockAddress);
      expect(mockFindById).toHaveBeenCalledWith(addressId, userId);
    });

    it('TC-RF-005-34: debe propagar AddressNotFoundError del repositorio', async () => {
      // Arrange
      const addressId = 'addr-nonexistent';
      const userId = 'user-123';
      const error = new Error('Dirección con ID addr-nonexistent no encontrada');
      error.name = 'AddressNotFoundError';

      mockFindById.mockRejectedValue(error);

      // Act & Assert
      await expect(
        addressService.getById(addressId, userId)
      ).rejects.toThrow('Dirección con ID addr-nonexistent no encontrada');

      expect(mockFindById).toHaveBeenCalledWith(addressId, userId);
    });
  });
});
