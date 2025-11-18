// Mock de Prisma - DEBE IR AL INICIO ANTES DE CUALQUIER IMPORT
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@prisma/client');
jest.mock('@/lib/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrismaClient: any = {
    address: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction: jest.fn((callback: any) => callback(mockPrismaClient)),
  };

  return {
    prisma: mockPrismaClient,
    db: mockPrismaClient,
  };
});

import type { Address } from '../types';
import { ZodError } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// Imports después del mock
import { addressService } from '../services/addressService';
import { prisma } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreate = prisma.address.create as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdate = prisma.address.update as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdateMany = prisma.address.updateMany as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockDelete = prisma.address.delete as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindMany = prisma.address.findMany as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindFirst = prisma.address.findFirst as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCount = prisma.address.count as any;

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
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId,
          ...validData,
          country: 'MX',
        },
      });
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

      mockUpdateMany.mockResolvedValue({ count: 0 });
      mockCreate.mockResolvedValue(mockCreatedAddress);

      // Act
      const result = await addressService.create(userId, validData);

      // Assert
      expect(result.isDefault).toBe(true);
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

      const existingAddress = {
        id: addressId,
        userId,
        addressLine1: 'Old Address',
        addressLine2: null,
        city: 'Old City',
        state: 'Puebla',
        postalCode: '72000',
        country: 'MX',
        lat: null,
        lng: null,
        isDefault: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockUpdatedAddress: Address = {
        ...existingAddress,
        ...validData,
        updatedAt: new Date('2024-02-01'),
      };

      mockFindFirst.mockResolvedValue(existingAddress);
      mockUpdate.mockResolvedValue(mockUpdatedAddress);

      // Act
      const result = await addressService.update(addressId, userId, validData);

      // Assert
      expect(result).toEqual(mockUpdatedAddress);
      expect(mockFindFirst).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
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

      const existingAddress = {
        id: addressId,
        userId,
        addressLine1: 'Calle Original 123',
        addressLine2: null,
        city: 'Old City',
        state: 'Querétaro',
        postalCode: '76000',
        country: 'MX',
        lat: null,
        lng: null,
        isDefault: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockUpdatedAddress: Address = {
        ...existingAddress,
        city: partialData.city,
        updatedAt: new Date('2024-02-01'),
      };

      mockFindFirst.mockResolvedValue(existingAddress);
      mockUpdate.mockResolvedValue(mockUpdatedAddress);

      // Act
      const result = await addressService.update(addressId, userId, partialData);

      // Assert
      expect(result.city).toBe(partialData.city);
    });

    it('TC-RF-005-27: debe propagar regla BR-002 del repositorio al actualizar isDefault', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';
      const updateData = {
        isDefault: true,
      };

      const existingAddress = {
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
        isDefault: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const mockUpdatedAddress: Address = {
        ...existingAddress,
        isDefault: true,
        updatedAt: new Date('2024-02-01'),
      };

      mockFindFirst.mockResolvedValue(existingAddress);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockUpdate.mockResolvedValue(mockUpdatedAddress);

      // Act
      const result = await addressService.update(addressId, userId, updateData);

      // Assert
      expect(result.isDefault).toBe(true);
    });
  });

  describe('delete', () => {
    it('TC-RF-005-28: debe eliminar dirección cuando cumple reglas', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';

      const existingAddress = {
        id: addressId,
        userId,
      };

      mockFindFirst.mockResolvedValue(existingAddress);
      mockCount.mockResolvedValue(2); // Más de una dirección
      mockDelete.mockResolvedValue(existingAddress);

      // Act
      await addressService.delete(addressId, userId);

      // Assert
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: addressId } });
    });

    it('TC-RF-005-29: debe propagar CannotDeleteLastAddressError del repositorio (BR-001)', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';

      const existingAddress = {
        id: addressId,
        userId,
      };

      mockFindFirst.mockResolvedValue(existingAddress);
      mockCount.mockResolvedValue(1); // Solo una dirección

      // Act & Assert
      await expect(
        addressService.delete(addressId, userId)
      ).rejects.toThrow('No puedes eliminar la única dirección de tu perfil');
    });

    it('TC-RF-005-30: debe propagar AddressNotFoundError del repositorio', async () => {
      // Arrange
      const addressId = 'addr-nonexistent';
      const userId = 'user-123';

      mockCount.mockResolvedValue(2); // Más de una dirección, para pasar la primera verificación
      mockFindFirst.mockResolvedValue(null); // Pero la dirección específica no existe

      // Act & Assert
      await expect(
        addressService.delete(addressId, userId)
      ).rejects.toThrow('Dirección con ID addr-nonexistent no encontrada');
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

      mockFindMany.mockResolvedValue(mockAddresses);

      // Act
      const result = await addressService.getByUserId(userId);

      // Assert
      expect(result).toEqual(mockAddresses);
      expect(result).toHaveLength(2);
      expect(result[0].isDefault).toBe(true);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { isDefault: 'desc' },
      });
    });

    it('TC-RF-005-32: debe retornar array vacío cuando no hay direcciones', async () => {
      // Arrange
      const userId = 'user-new';

      mockFindMany.mockResolvedValue([]);

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

      mockFindFirst.mockResolvedValue(mockAddress);

      // Act
      const result = await addressService.getById(addressId, userId);

      // Assert
      expect(result).toEqual(mockAddress);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: addressId,
          userId,
        },
      });
    });

    it('TC-RF-005-34: debe propagar AddressNotFoundError del repositorio', async () => {
      // Arrange
      const addressId = 'addr-nonexistent';
      const userId = 'user-123';

      mockFindFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        addressService.getById(addressId, userId)
      ).rejects.toThrow('Dirección con ID addr-nonexistent no encontrada');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: addressId,
          userId,
        },
      });
    });
  });
});
