/**
 * Tests de integración para endpoints de usuarios
 * TC-USER-001 a TC-USER-010
 *
 * @jest-environment node
 */

import { GET as getUserMe, PATCH as patchUserMe } from '../../../app/api/users/me/route';
import { GET as getUserPublic } from '../../../app/api/users/[id]/public/route';
import {
  POST as postAddress,
} from '../../../app/api/users/me/addresses/route';
import {
  PATCH as patchAddress,
  DELETE as deleteAddress,
} from '../../../app/api/users/me/addresses/[id]/route';
import { NextRequest } from 'next/server';

// Mock de Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    address: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
  db: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    address: {
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Mock de Clerk auth
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));

// Mock de getCurrentUser para retornar usuario autenticado por defecto
jest.mock('@/modules/auth/utils/getCurrentUser', () => ({
  getCurrentUser: jest.fn().mockResolvedValue({
    id: 'user-123',
    clerkUserId: 'user_clerk_123',
    email: 'test@example.com',
    firstName: 'Juan',
    lastName: 'Pérez',
    phone: '3312345678',
    avatarUrl: 'https://example.com/avatar.jpg',
    role: 'CLIENT',
    status: 'ACTIVE',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  }),
}));

import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/modules/auth/utils/getCurrentUser';
// import { auth } from '@clerk/nextjs'; // Comentado - usar el mock directamente

// Mock auth directamente sin importar
const mockAuth = jest.fn() as jest.MockedFunction<any>;

// Helper para crear mock de request
const createMockRequest = (body?: any, params?: any) => {
  return {
    json: async () => body || {},
    headers: new Headers(),
  } as unknown as NextRequest;
};

// Fixtures de datos de prueba
const mockUser = {
  id: 'user-123',
  clerkUserId: 'user_clerk_123',
  email: 'test@example.com',
  firstName: 'Juan',
  lastName: 'Pérez',
  phone: '3312345678',
  avatarUrl: 'https://example.com/avatar.jpg',
  role: 'CLIENT',
  status: 'ACTIVE',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  addresses: [
    {
      id: 'addr-123',
      userId: 'user-123',
      addressLine1: 'Av. Chapultepec 123',
      addressLine2: null,
      city: 'Guadalajara',
      state: 'Jalisco',
      postalCode: '44100',
      country: 'MX',
      lat: null,
      lng: null,
      isDefault: true,
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
  ],
};

const mockAddress = {
  id: 'addr-123',
  userId: 'user-123',
  addressLine1: 'Av. Chapultepec 123',
  addressLine2: null,
  city: 'Guadalajara',
  state: 'Jalisco',
  postalCode: '44100',
  country: 'MX',
  lat: null,
  lng: null,
  isDefault: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('Endpoints de gestión de usuarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Restaurar mock de getCurrentUser a su valor por defecto
    (getCurrentUser as jest.Mock).mockResolvedValue({
      id: 'user-123',
      clerkUserId: 'user_clerk_123',
      email: 'test@example.com',
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '3312345678',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'CLIENT',
      status: 'ACTIVE',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    });
  });

  describe('GET /api/users/me (TC-USER-001)', () => {
    it('debe retornar perfil completo del usuario autenticado', async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: 'user_clerk_123' } as any);
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ ...mockUser }) // getCurrentUser
        .mockResolvedValueOnce({ ...mockUser }); // getProfile

      // Act
      const req = createMockRequest();
      const response = await getUserMe();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.id).toBe('user-123');
      expect(data.email).toBe('test@example.com');
      expect(data.addresses).toHaveLength(1);
      expect(data.addresses[0].id).toBe('addr-123');
    });

    it('debe retornar 401 si no está autenticado', async () => {
      // Arrange
      // Override del mock de getCurrentUser para simular usuario no autenticado
      (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

      // Act
      const req = createMockRequest();
      const response = await getUserMe();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('No autorizado');
    });
  });

  describe('PATCH /api/users/me (TC-USER-002)', () => {
    it('debe actualizar perfil del usuario autenticado', async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: 'user_clerk_123' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockUser });
      (prisma.user.update as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        phone: '3398765432',
      });

      const updateData = { phone: '3398765432' };

      // Act
      const req = createMockRequest(updateData);
      const response = await patchUserMe(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.phone).toBe('3398765432');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: updateData,
        include: { addresses: true },
      });
    });

    it('debe retornar 400 si los datos son inválidos', async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: 'user_clerk_123' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockUser });

      const invalidData = { phone: '123' }; // Teléfono inválido (debe tener 10 dígitos)

      // Act
      const req = createMockRequest(invalidData);
      const response = await patchUserMe(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos inválidos');
      expect(data.details).toBeDefined();
    });

    it('debe retornar 401 si no está autenticado (TC-USER-003)', async () => {
      // Arrange
      // Override del mock de getCurrentUser para simular usuario no autenticado
      (getCurrentUser as jest.Mock).mockResolvedValueOnce(null);

      // Act
      const req = createMockRequest({ firstName: 'Pedro' });
      const response = await patchUserMe(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('No autorizado');
    });
  });

  describe('GET /api/users/:id/public (TC-USER-004)', () => {
    it('debe retornar perfil público sin datos sensibles', async () => {
      // Arrange
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'user-123',
        firstName: 'Juan',
        lastName: 'Pérez',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      // Act
      const response = await getUserPublic(
        createMockRequest(),
        { params: { id: 'user-123' } }
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.id).toBe('user-123');
      expect(data.firstName).toBe('Juan');
      expect(data.lastName).toBe('Pérez');
      expect(data.avatarUrl).toBe('https://example.com/avatar.jpg');

      // Verificar que NO expone datos sensibles
      expect(data.email).toBeUndefined();
      expect(data.phone).toBeUndefined();
      expect(data.clerkUserId).toBeUndefined();
      expect(data.addresses).toBeUndefined();
    });

    it('debe retornar 404 si el usuario no existe', async () => {
      // Arrange
      // Reset completo y configuración explícita para retornar null
      (prisma.user.findUnique as jest.Mock).mockReset();
      (prisma.user.findUnique as jest.Mock).mockImplementation(() => Promise.resolve(null));

      // Act
      const response = await getUserPublic(
        createMockRequest(),
        { params: { id: 'user-nonexistent' } }
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe('Usuario no encontrado');
    });
  });

  describe('POST /api/users/me/addresses (TC-USER-005)', () => {
    it('debe crear nueva dirección para el usuario autenticado', async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: 'user_clerk_123' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockUser });
      (prisma.address.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
      (prisma.address.create as jest.Mock).mockResolvedValueOnce({
        ...mockAddress,
        id: 'addr-new',
        addressLine1: 'Nueva Dirección 456',
      });

      const newAddressData = {
        addressLine1: 'Nueva Dirección 456',
        city: 'Guadalajara',
        state: 'Jalisco',
        postalCode: '44200',
        isDefault: false,
      };

      // Act
      const req = createMockRequest(newAddressData);
      const response = await postAddress(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.id).toBe('addr-new');
      expect(data.addressLine1).toBe('Nueva Dirección 456');
      expect(prisma.address.create).toHaveBeenCalledWith({
        data: {
          ...newAddressData,
          userId: 'user-123',
          country: 'MX',
        },
      });
    });

    it('debe retornar 400 si los datos son inválidos', async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: 'user_clerk_123' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockUser });

      const invalidData = {
        addressLine1: '123', // Muy corto (mínimo 5 caracteres)
        city: 'Guadalajara',
        state: 'Jalisco',
        postalCode: '44100',
      };

      // Act
      const req = createMockRequest(invalidData);
      const response = await postAddress(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos inválidos');
    });
  });

  describe('PATCH /api/users/me/addresses/:id (TC-USER-006)', () => {
    it('debe actualizar dirección existente', async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: 'user_clerk_123' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockUser });
      (prisma.address.findFirst as jest.Mock).mockResolvedValueOnce({ ...mockAddress });
      (prisma.address.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
      (prisma.address.update as jest.Mock).mockResolvedValueOnce({
        ...mockAddress,
        addressLine1: 'Dirección Actualizada',
      });

      const updateData = { addressLine1: 'Dirección Actualizada' };

      // Act
      const req = createMockRequest(updateData);
      const response = await patchAddress(req, { params: { id: 'addr-123' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.addressLine1).toBe('Dirección Actualizada');
    });

    it('debe retornar 404 si la dirección no existe o no pertenece al usuario', async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: 'user_clerk_123' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockUser });
      (prisma.address.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const updateData = { addressLine1: 'Nueva dirección' };

      // Act
      const req = createMockRequest(updateData);
      const response = await patchAddress(req, { params: { id: 'addr-nonexistent' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe('Dirección no encontrada');
    });
  });

  describe('DELETE /api/users/me/addresses/:id (TC-USER-007 y TC-USER-008)', () => {
    it('debe eliminar dirección correctamente (TC-USER-007)', async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: 'user_clerk_123' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockUser });
      (prisma.address.count as jest.Mock).mockResolvedValueOnce(2); // Tiene 2 direcciones
      (prisma.address.findFirst as jest.Mock).mockResolvedValueOnce({ ...mockAddress });
      (prisma.address.delete as jest.Mock).mockResolvedValueOnce({ ...mockAddress });

      // Act
      const req = createMockRequest();
      const response = await deleteAddress(req, { params: { id: 'addr-123' } });

      // Assert
      expect(response.status).toBe(204);
      expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: 'addr-123' } });
    });

    it('debe retornar 400 si se intenta eliminar la única dirección (TC-USER-008 - BR-001)', async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: 'user_clerk_123' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockUser });
      (prisma.address.count as jest.Mock).mockResolvedValueOnce(1); // Solo tiene 1 dirección

      // Act
      const req = createMockRequest();
      const response = await deleteAddress(req, { params: { id: 'addr-123' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('No puedes eliminar tu única dirección');
      expect(prisma.address.delete).not.toHaveBeenCalled();
    });

    it('debe retornar 404 si la dirección no existe o no pertenece al usuario', async () => {
      // Arrange
      mockAuth.mockReturnValue({ userId: 'user_clerk_123' } as any);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockUser });
      (prisma.address.count as jest.Mock).mockResolvedValueOnce(2);
      (prisma.address.findFirst as jest.Mock).mockResolvedValueOnce(null);

      // Act
      const req = createMockRequest();
      const response = await deleteAddress(req, { params: { id: 'addr-nonexistent' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe('Dirección no encontrada');
    });
  });
});
