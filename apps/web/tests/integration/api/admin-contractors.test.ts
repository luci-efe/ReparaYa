/**
 * Tests de integración para endpoints de administración de contratistas
 * TC-CONTRACTOR-008 a TC-CONTRACTOR-009
 *
 * @jest-environment node
 */

import { PATCH as verifyProfile } from '../../../app/api/admin/contractors/[id]/verify/route';
import { NextRequest } from 'next/server';

// Mock de Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    contractorProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
  db: {
    contractorProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock de requireRole
jest.mock('@/modules/auth/utils/requireRole', () => ({
  requireRole: jest.fn(),
}));

import { prisma } from '@/lib/db';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { ForbiddenError } from '@/modules/auth/errors';

// Helper para crear mock de request
const createMockRequest = (body?: any) => {
  return {
    json: async () => body || {},
    headers: new Headers(),
  } as unknown as NextRequest;
};

// Fixtures de datos de prueba
const mockAdminUser = {
  id: 'user-admin-789',
  clerkUserId: 'clerk_admin_def456',
  email: 'admin@reparaya.com',
  firstName: 'Admin',
  lastName: 'Sistema',
  phone: '5551111111',
  avatarUrl: null,
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  addresses: [],
};

const mockContractorProfile = {
  id: 'contractor-profile-123',
  userId: 'user-contractor-123',
  businessName: 'García Plumbing',
  description: 'Professional plumbing services with 10 years of experience',
  specialties: ['plumbing', 'heating'],
  verified: false,
  verificationDocuments: {
    idDocument: 'https://storage.example.com/docs/id-123.pdf',
  },
  stripeConnectAccountId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockVerifiedContractorProfile = {
  ...mockContractorProfile,
  verified: true,
  updatedAt: new Date('2024-01-15'),
};

describe('Endpoints de administración de contratistas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PATCH /api/admin/contractors/:id/verify', () => {
    it('TC-CONTRACTOR-008: debe permitir a admin aprobar perfil de contratista', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.contractorProfile.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockContractorProfile) // Primera llamada: findById
        .mockResolvedValueOnce(mockContractorProfile); // Segunda llamada: validar existencia antes de update
      (prisma.contractorProfile.update as jest.Mock).mockResolvedValue(mockVerifiedContractorProfile);

      const verifyData = {
        verified: true,
      };

      // Act
      const req = createMockRequest(verifyData);
      const response = await verifyProfile(req, {
        params: { id: 'contractor-profile-123' },
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.verified).toBe(true);
      expect(requireRole).toHaveBeenCalledWith('ADMIN');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockAdminUser.id },
        include: { addresses: true },
      });
      expect(prisma.contractorProfile.update).toHaveBeenCalledWith({
        where: { id: 'contractor-profile-123' },
        data: { verified: true },
      });
    });

    it('TC-CONTRACTOR-008-02: debe permitir a admin rechazar perfil de contratista', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.contractorProfile.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockVerifiedContractorProfile) // Primera llamada: findById
        .mockResolvedValueOnce(mockVerifiedContractorProfile); // Segunda llamada: validar existencia
      (prisma.contractorProfile.update as jest.Mock).mockResolvedValue({
        ...mockVerifiedContractorProfile,
        verified: false,
      });

      const verifyData = {
        verified: false,
      };

      // Act
      const req = createMockRequest(verifyData);
      const response = await verifyProfile(req, {
        params: { id: 'contractor-profile-123' },
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.verified).toBe(false);
      expect(requireRole).toHaveBeenCalledWith('ADMIN');
      expect(prisma.contractorProfile.update).toHaveBeenCalledWith({
        where: { id: 'contractor-profile-123' },
        data: { verified: false },
      });
    });

    it('TC-CONTRACTOR-009: debe rechazar auto-aprobación del contratista', async () => {
      // Arrange
      // Mock admin user que es el mismo que tiene el perfil
      const contractorAdminUser = {
        ...mockAdminUser,
        id: mockContractorProfile.userId, // Mismo ID que el userId del perfil
      };

      (requireRole as jest.Mock).mockResolvedValue(contractorAdminUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(contractorAdminUser);
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockContractorProfile);

      const verifyData = {
        verified: true,
      };

      // Act
      const req = createMockRequest(verifyData);
      const response = await verifyProfile(req, {
        params: { id: 'contractor-profile-123' },
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toContain('No puedes verificar tu propio perfil');
      expect(prisma.contractorProfile.update).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-009-02: debe rechazar verificación por usuario no-admin con 403', async () => {
      // Arrange
      (requireRole as jest.Mock).mockRejectedValue(
        new ForbiddenError('Solo usuarios con rol ADMIN pueden acceder a este recurso')
      );

      const verifyData = {
        verified: true,
      };

      // Act
      const req = createMockRequest(verifyData);
      const response = await verifyProfile(req, {
        params: { id: 'contractor-profile-123' },
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(prisma.contractorProfile.update).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-009-03: debe validar datos con Zod y retornar 400', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);

      const invalidData = {
        verified: 'true', // String en lugar de boolean (inválido)
      };

      // Act
      const req = createMockRequest(invalidData);
      const response = await verifyProfile(req, {
        params: { id: 'contractor-profile-123' },
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos inválidos');
      expect(data.details).toBeDefined();
      expect(prisma.contractorProfile.update).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-009-04: debe retornar 404 si el perfil no existe', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const verifyData = {
        verified: true,
      };

      // Act
      const req = createMockRequest(verifyData);
      const response = await verifyProfile(req, {
        params: { id: 'contractor-profile-nonexistent' },
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toContain('no encontrado');
      expect(prisma.contractorProfile.update).not.toHaveBeenCalled();
    });
  });
});
