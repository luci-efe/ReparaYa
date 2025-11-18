import { describe, it, expect, jest, beforeEach } from '@jest/globals';

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

import type { UserProfile } from '../types';

// Imports después del mock
import { userRepository } from '../repositories/userRepository';
import { UserNotFoundError } from '../errors';
import { prisma } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFindUnique = prisma.user.findUnique as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockUpdate = prisma.user.update as any;

describe('userRepository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('TC-RF-004-01: debe retornar usuario con addresses cuando existe', async () => {
      // Arrange
      const mockUser: UserProfile = {
        id: 'user-123',
        clerkUserId: 'clerk_abc123',
        email: 'juan.perez@example.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: '5551234567',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'CLIENT',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        addresses: [
          {
            id: 'addr-1',
            userId: 'user-123',
            addressLine1: 'Av. Insurgentes 1234',
            addressLine2: 'Apto 5B',
            city: 'Ciudad de México',
            state: 'CDMX',
            postalCode: '06700',
            country: 'MX',
            lat: null,
            lng: null,
            isDefault: true,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
          },
        ],
      };

      mockFindUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findById('user-123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: { addresses: true },
      });
    });

    it('TC-RF-004-02: debe retornar null cuando el usuario no existe', async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result = await userRepository.findById('user-nonexistent');

      // Assert
      expect(result).toBeNull();
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'user-nonexistent' },
        include: { addresses: true },
      });
    });
  });

  describe('findByClerkUserId', () => {
    it('TC-RF-004-03: debe retornar usuario por clerkUserId cuando existe', async () => {
      // Arrange
      const mockUser: UserProfile = {
        id: 'user-123',
        clerkUserId: 'clerk_abc123',
        email: 'maria.garcia@example.com',
        firstName: 'María',
        lastName: 'García',
        phone: '5559876543',
        avatarUrl: null,
        role: 'CONTRACTOR',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
        addresses: [],
      };

      mockFindUnique.mockResolvedValue(mockUser);

      // Act
      const result = await userRepository.findByClerkUserId('clerk_abc123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { clerkUserId: 'clerk_abc123' },
        include: { addresses: true },
      });
    });

    it('TC-RF-004-04: debe retornar null cuando el clerkUserId no existe', async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act
      const result = await userRepository.findByClerkUserId('clerk_nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('TC-RF-004-05: debe actualizar campos correctamente cuando el usuario existe', async () => {
      // Arrange
      const existingUser = {
        id: 'user-123',
        clerkUserId: 'clerk_abc123',
        email: 'pedro.lopez@example.com',
        firstName: 'Juan',
        lastName: 'López',
        phone: '5551111111',
        avatarUrl: 'https://example.com/old-avatar.jpg',
        role: 'CLIENT',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      };

      const updatedUser: UserProfile = {
        id: existingUser.id,
        clerkUserId: existingUser.clerkUserId,
        email: existingUser.email,
        firstName: 'Pedro',
        lastName: existingUser.lastName,
        phone: '5551112222',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        role: 'CLIENT',
        status: 'ACTIVE',
        createdAt: existingUser.createdAt,
        updatedAt: new Date('2024-02-01'),
        addresses: [],
      };

      // Mock findUnique para validar existencia
      mockFindUnique.mockResolvedValue(existingUser);
      // Mock update para la actualización
      mockUpdate.mockResolvedValue(updatedUser);

      // Act
      const result = await userRepository.update('user-123', {
        firstName: 'Pedro',
        phone: '5551112222',
        avatarUrl: 'https://example.com/new-avatar.jpg',
      });

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          firstName: 'Pedro',
          phone: '5551112222',
          avatarUrl: 'https://example.com/new-avatar.jpg',
        },
        include: { addresses: true },
      });
    });

    it('TC-RF-004-06: debe lanzar UserNotFoundError cuando el ID es inválido', async () => {
      // Arrange
      // Mock de findUnique retornando null (usuario no encontrado)
      mockFindUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userRepository.update('user-invalid', { firstName: 'Test' })
      ).rejects.toThrow(UserNotFoundError);

      await expect(
        userRepository.update('user-invalid', { firstName: 'Test' })
      ).rejects.toThrow('Usuario con ID user-invalid no encontrado');

      // Verificar que se llamó a findUnique
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'user-invalid' },
      });

      // Verificar que NO se llamó a update (porque el usuario no existe)
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getPublicProfile', () => {
    it('TC-RF-004-07: debe retornar solo campos públicos cuando el usuario existe', async () => {
      // Arrange
      const mockPublicProfile = {
        id: 'user-123',
        firstName: 'Ana',
        lastName: 'Martínez',
        avatarUrl: 'https://example.com/ana-avatar.jpg',
      };

      mockFindUnique.mockResolvedValue(mockPublicProfile);

      // Act
      const result = await userRepository.getPublicProfile('user-123');

      // Assert
      expect(result).toEqual(mockPublicProfile);
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('phone');
      expect(result).not.toHaveProperty('clerkUserId');
      expect(result).not.toHaveProperty('addresses');

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      });
    });

    it('TC-RF-004-08: debe lanzar UserNotFoundError cuando el usuario no existe', async () => {
      // Arrange
      mockFindUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userRepository.getPublicProfile('user-nonexistent')
      ).rejects.toThrow(UserNotFoundError);

      await expect(
        userRepository.getPublicProfile('user-nonexistent')
      ).rejects.toThrow('Usuario con ID user-nonexistent no encontrado');
    });

    it('TC-RF-004-09: debe manejar avatarUrl null correctamente', async () => {
      // Arrange
      const mockPublicProfile = {
        id: 'user-456',
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        avatarUrl: null,
      };

      mockFindUnique.mockResolvedValue(mockPublicProfile);

      // Act
      const result = await userRepository.getPublicProfile('user-456');

      // Assert
      expect(result).toEqual(mockPublicProfile);
      expect(result.avatarUrl).toBeNull();
    });
  });
});
