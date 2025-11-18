import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@prisma/client');
jest.mock('@/lib/db', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrismaClient: any = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
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

import { Decimal } from '@prisma/client/runtime/library';
import type { Address } from '../types';

// Imports después del mock
import { addressRepository } from '../repositories/addressRepository';
import { AddressNotFoundError, CannotDeleteLastAddressError } from '../errors';
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
const mockFindFirst = prisma.address.findFirst as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindMany = prisma.address.findMany as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCount = prisma.address.count as any;

describe('addressRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('TC-RF-005-01: debe crear dirección correctamente sin isDefault', async () => {
      // Arrange
      const userId = 'user-123';
      const addressData = {
        addressLine1: 'Av. Reforma 456',
        addressLine2: 'Piso 10',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '11000',
        isDefault: false,
      };

      const mockCreatedAddress: Address = {
        id: 'addr-new',
        userId,
        ...addressData,
        country: 'MX',
        lat: null,
        lng: null,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      };

      mockUpdateMany.mockResolvedValue({ count: 0 });
      mockCreate.mockResolvedValue(mockCreatedAddress);

      // Act
      const result = await addressRepository.create(userId, addressData);

      // Assert
      expect(result).toEqual(mockCreatedAddress);
      expect(mockUpdateMany).not.toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          ...addressData,
          userId,
          country: 'MX',
        },
      });
    });

    it('TC-RF-005-02: debe desactivar otras direcciones cuando isDefault es true (BR-002)', async () => {
      // Arrange
      const userId = 'user-123';
      const addressData = {
        addressLine1: 'Calle Principal 789',
        city: 'Guadalajara',
        state: 'Jalisco',
        postalCode: '44100',
        isDefault: true,
      };

      const mockCreatedAddress: Address = {
        id: 'addr-new',
        userId,
        addressLine1: addressData.addressLine1,
        addressLine2: null,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode,
        country: 'MX',
        lat: null,
        lng: null,
        isDefault: true,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      };

      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockCreate.mockResolvedValue(mockCreatedAddress);

      // Act
      const result = await addressRepository.create(userId, addressData);

      // Assert
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      expect(result.isDefault).toBe(true);
    });

    it('TC-RF-005-03: debe hardcodear country como MX', async () => {
      // Arrange
      const userId = 'user-123';
      const addressData = {
        addressLine1: 'Av. Universidad 100',
        city: 'Monterrey',
        state: 'Nuevo León',
        postalCode: '64000',
        isDefault: false,
      };

      const mockCreatedAddress: Address = {
        id: 'addr-new',
        userId,
        addressLine1: addressData.addressLine1,
        addressLine2: null,
        city: addressData.city,
        state: addressData.state,
        postalCode: addressData.postalCode,
        country: 'MX',
        lat: null,
        lng: null,
        isDefault: false,
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-02-01'),
      };

      mockCreate.mockResolvedValue(mockCreatedAddress);

      // Act
      const result = await addressRepository.create(userId, addressData);

      // Assert
      expect(result.country).toBe('MX');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ country: 'MX' }),
        })
      );
    });
  });

  describe('update', () => {
    it('TC-RF-005-04: debe actualizar campos correctamente', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';
      const updateData = {
        addressLine1: 'Calle Actualizada 999',
        city: 'Puebla',
      };

      const mockExistingAddress: Address = {
        id: addressId,
        userId,
        addressLine1: 'Calle Vieja 123',
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
        ...mockExistingAddress,
        ...updateData,
        updatedAt: new Date('2024-02-01'),
      };

      mockFindFirst.mockResolvedValue(mockExistingAddress);
      mockUpdate.mockResolvedValue(mockUpdatedAddress);

      // Act
      const result = await addressRepository.update(addressId, userId, updateData);

      // Assert
      expect(result).toEqual(mockUpdatedAddress);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: addressId, userId },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: addressId },
        data: updateData,
      });
    });

    it('TC-RF-005-05: debe validar propiedad (userId) antes de actualizar', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-456';
      const updateData = { city: 'Querétaro' };

      mockFindFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        addressRepository.update(addressId, userId, updateData)
      ).rejects.toThrow(AddressNotFoundError);

      await expect(
        addressRepository.update(addressId, userId, updateData)
      ).rejects.toThrow('Dirección con ID addr-123 no encontrada');

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('TC-RF-005-06: debe desactivar otras direcciones cuando isDefault es true (BR-002)', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';
      const updateData = { isDefault: true };

      const mockExistingAddress: Address = {
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
        ...mockExistingAddress,
        isDefault: true,
        updatedAt: new Date('2024-02-01'),
      };

      mockFindFirst.mockResolvedValue(mockExistingAddress);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockUpdate.mockResolvedValue(mockUpdatedAddress);

      // Act
      const result = await addressRepository.update(addressId, userId, updateData);

      // Assert
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      });
      expect(result.isDefault).toBe(true);
    });

    it('TC-RF-005-07: no debe desactivar la dirección actual al actualizar isDefault', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';
      const updateData = { isDefault: true };

      const mockExistingAddress: Address = {
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

      mockFindFirst.mockResolvedValue(mockExistingAddress);
      mockUpdateMany.mockResolvedValue({ count: 0 });
      mockUpdate.mockResolvedValue({
        ...mockExistingAddress,
        isDefault: true,
      });

      // Act
      await addressRepository.update(addressId, userId, updateData);

      // Assert
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true, NOT: { id: addressId } },
        data: { isDefault: false },
      });
    });
  });

  describe('delete', () => {
    it('TC-RF-005-08: debe eliminar dirección cuando hay más de una (BR-001)', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';

      const mockAddress: Address = {
        id: addressId,
        userId,
        addressLine1: 'Calle a Eliminar 456',
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

      mockCount.mockResolvedValue(2);
      mockFindFirst.mockResolvedValue(mockAddress);
      mockDelete.mockResolvedValue(mockAddress);

      // Act
      await addressRepository.delete(addressId, userId);

      // Assert
      expect(mockCount).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: addressId, userId },
      });
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: addressId },
      });
    });

    it('TC-RF-005-09: debe lanzar CannotDeleteLastAddressError cuando es la única dirección (BR-001)', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-123';

      mockCount.mockResolvedValue(1);

      // Act & Assert
      await expect(
        addressRepository.delete(addressId, userId)
      ).rejects.toThrow(CannotDeleteLastAddressError);

      await expect(
        addressRepository.delete(addressId, userId)
      ).rejects.toThrow('No puedes eliminar la única dirección de tu perfil');

      expect(mockDelete).not.toHaveBeenCalled();
    });

    it('TC-RF-005-10: debe validar propiedad (userId) antes de eliminar', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-456';

      mockCount.mockResolvedValue(2);
      mockFindFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        addressRepository.delete(addressId, userId)
      ).rejects.toThrow(AddressNotFoundError);

      await expect(
        addressRepository.delete(addressId, userId)
      ).rejects.toThrow('Dirección con ID addr-123 no encontrada');

      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('TC-RF-005-11: debe retornar todas las direcciones del usuario ordenadas por isDefault', async () => {
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
          addressLine2: 'Depto 3',
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
      const result = await addressRepository.findByUserId(userId);

      // Assert
      expect(result).toEqual(mockAddresses);
      expect(result[0].isDefault).toBe(true);
      expect(result[1].isDefault).toBe(false);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { isDefault: 'desc' },
      });
    });

    it('TC-RF-005-12: debe retornar array vacío cuando el usuario no tiene direcciones', async () => {
      // Arrange
      const userId = 'user-new';

      mockFindMany.mockResolvedValue([]);

      // Act
      const result = await addressRepository.findByUserId(userId);

      // Assert
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('findById', () => {
    it('TC-RF-005-13: debe retornar dirección cuando pertenece al usuario', async () => {
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
      const result = await addressRepository.findById(addressId, userId);

      // Assert
      expect(result).toEqual(mockAddress);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: addressId, userId },
      });
    });

    it('TC-RF-005-14: debe lanzar AddressNotFoundError cuando no pertenece al usuario', async () => {
      // Arrange
      const addressId = 'addr-123';
      const userId = 'user-456';

      mockFindFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        addressRepository.findById(addressId, userId)
      ).rejects.toThrow(AddressNotFoundError);

      await expect(
        addressRepository.findById(addressId, userId)
      ).rejects.toThrow('Dirección con ID addr-123 no encontrada');
    });

    it('TC-RF-005-15: debe lanzar AddressNotFoundError cuando el ID no existe', async () => {
      // Arrange
      const addressId = 'addr-nonexistent';
      const userId = 'user-123';

      mockFindFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        addressRepository.findById(addressId, userId)
      ).rejects.toThrow(AddressNotFoundError);
    });
  });
});
