// Mock de Prisma - DEBE IR AL INICIO
jest.mock('@prisma/client');
jest.mock('@/lib/db', () => {
  const mockPrismaClient = {
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
    $transaction: jest.fn((callback) => callback(mockPrismaClient)),
  };

  return {
    prisma: mockPrismaClient,
    db: mockPrismaClient,
  };
});

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { UserProfile, PublicUserProfile } from '../types';
import { ZodError } from 'zod';

// Imports después del mock
import { userService } from '../services/userService';
import { prisma } from '@/lib/db';

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('TC-RF-004-10: debe retornar perfil completo con direcciones', async () => {
      // Arrange
      const userId = 'user-123';
      const mockProfile: UserProfile = {
        id: userId,
        clerkUserId: 'clerk_abc123',
        email: 'test@example.com',
        firstName: 'Luis',
        lastName: 'Hernández',
        phone: '5551234567',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'CLIENT',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        addresses: [
          {
            id: 'addr-1',
            userId,
            addressLine1: 'Calle Principal 123',
            addressLine2: null,
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

      mockFindById.mockResolvedValue(mockProfile);

      // Act
      const result = await userService.getProfile(userId);

      // Assert
      expect(result).toEqual(mockProfile);
      expect(result?.addresses).toHaveLength(1);
      expect(mockFindById).toHaveBeenCalledWith(userId);
    });

    it('TC-RF-004-11: debe retornar null cuando el usuario no existe', async () => {
      // Arrange
      const userId = 'user-nonexistent';
      mockFindById.mockResolvedValue(null);

      // Act
      const result = await userService.getProfile(userId);

      // Assert
      expect(result).toBeNull();
      expect(mockFindById).toHaveBeenCalledWith(userId);
    });
  });

  describe('updateProfile', () => {
    it('TC-RF-004-12: debe validar datos con Zod antes de actualizar', async () => {
      // Arrange
      const userId = 'user-123';
      const validData = {
        firstName: 'Roberto',
        lastName: 'Sánchez',
        phone: '5559876543',
      };

      const mockUpdatedProfile: UserProfile = {
        id: userId,
        clerkUserId: 'clerk_abc123',
        email: 'roberto@example.com',
        firstName: validData.firstName,
        lastName: validData.lastName,
        phone: validData.phone,
        avatarUrl: null,
        role: 'CLIENT',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-02-01'),
        addresses: [],
      };

      mockUpdate.mockResolvedValue(mockUpdatedProfile);

      // Act
      const result = await userService.updateProfile(userId, validData);

      // Assert
      expect(result).toEqual(mockUpdatedProfile);
      expect(mockUpdate).toHaveBeenCalledWith(userId, validData);
    });

    it('TC-RF-004-13: debe rechazar phone con formato inválido', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidData = {
        phone: '123', // Formato inválido (no son 10 dígitos)
      };

      // Act & Assert
      await expect(
        userService.updateProfile(userId, invalidData)
      ).rejects.toThrow(ZodError);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('TC-RF-004-14: debe rechazar phone con letras', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidData = {
        phone: 'abc1234567', // Contiene letras
      };

      // Act & Assert
      await expect(
        userService.updateProfile(userId, invalidData)
      ).rejects.toThrow(ZodError);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('TC-RF-004-15: debe rechazar firstName vacío', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidData = {
        firstName: '', // Vacío
      };

      // Act & Assert
      await expect(
        userService.updateProfile(userId, invalidData)
      ).rejects.toThrow(ZodError);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('TC-RF-004-16: debe rechazar firstName demasiado largo', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidData = {
        firstName: 'A'.repeat(101), // Más de 100 caracteres
      };

      // Act & Assert
      await expect(
        userService.updateProfile(userId, invalidData)
      ).rejects.toThrow(ZodError);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('TC-RF-004-17: debe rechazar avatarUrl con formato inválido', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidData = {
        avatarUrl: 'not-a-valid-url', // No es una URL válida
      };

      // Act & Assert
      await expect(
        userService.updateProfile(userId, invalidData)
      ).rejects.toThrow(ZodError);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('TC-RF-004-18: debe aceptar avatarUrl válida', async () => {
      // Arrange
      const userId = 'user-123';
      const validData = {
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const mockUpdatedProfile: UserProfile = {
        id: userId,
        clerkUserId: 'clerk_abc123',
        email: 'test@example.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: null,
        avatarUrl: validData.avatarUrl,
        role: 'CLIENT',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-02-01'),
        addresses: [],
      };

      mockUpdate.mockResolvedValue(mockUpdatedProfile);

      // Act
      const result = await userService.updateProfile(userId, validData);

      // Assert
      expect(result.avatarUrl).toBe(validData.avatarUrl);
      expect(mockUpdate).toHaveBeenCalledWith(userId, validData);
    });

    it('TC-RF-004-19: debe aceptar phone válido con 10 dígitos', async () => {
      // Arrange
      const userId = 'user-123';
      const validData = {
        phone: '5551234567',
      };

      const mockUpdatedProfile: UserProfile = {
        id: userId,
        clerkUserId: 'clerk_abc123',
        email: 'test@example.com',
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: validData.phone,
        avatarUrl: null,
        role: 'CLIENT',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-02-01'),
        addresses: [],
      };

      mockUpdate.mockResolvedValue(mockUpdatedProfile);

      // Act
      const result = await userService.updateProfile(userId, validData);

      // Assert
      expect(result.phone).toBe(validData.phone);
      expect(mockUpdate).toHaveBeenCalledWith(userId, validData);
    });

    it('TC-RF-004-20: debe permitir actualización parcial de campos', async () => {
      // Arrange
      const userId = 'user-123';
      const partialData = {
        firstName: 'NuevoNombre',
      };

      const mockUpdatedProfile: UserProfile = {
        id: userId,
        clerkUserId: 'clerk_abc123',
        email: 'test@example.com',
        firstName: partialData.firstName,
        lastName: 'Apellido Original',
        phone: null,
        avatarUrl: null,
        role: 'CLIENT',
        status: 'ACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-02-01'),
        addresses: [],
      };

      mockUpdate.mockResolvedValue(mockUpdatedProfile);

      // Act
      const result = await userService.updateProfile(userId, partialData);

      // Assert
      expect(result.firstName).toBe(partialData.firstName);
      expect(mockUpdate).toHaveBeenCalledWith(userId, partialData);
    });
  });

  describe('getPublicProfile', () => {
    it('TC-RF-004-21: debe retornar solo campos públicos', async () => {
      // Arrange
      const userId = 'user-123';
      const mockPublicProfile: PublicUserProfile = {
        id: userId,
        firstName: 'Elena',
        lastName: 'Torres',
        avatarUrl: 'https://example.com/elena.jpg',
      };

      mockGetPublicProfile.mockResolvedValue(mockPublicProfile);

      // Act
      const result = await userService.getPublicProfile(userId);

      // Assert
      expect(result).toEqual(mockPublicProfile);
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('phone');
      expect(result).not.toHaveProperty('clerkUserId');
      expect(result).not.toHaveProperty('addresses');
      expect(mockGetPublicProfile).toHaveBeenCalledWith(userId);
    });

    it('TC-RF-004-22: debe propagar UserNotFoundError del repositorio', async () => {
      // Arrange
      const userId = 'user-nonexistent';
      const error = new Error('Usuario con ID user-nonexistent no encontrado');
      error.name = 'UserNotFoundError';

      mockGetPublicProfile.mockRejectedValue(error);

      // Act & Assert
      await expect(
        userService.getPublicProfile(userId)
      ).rejects.toThrow('Usuario con ID user-nonexistent no encontrado');

      expect(mockGetPublicProfile).toHaveBeenCalledWith(userId);
    });
  });
});
