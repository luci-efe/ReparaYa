/**
 * Tests de integración para endpoints de contratistas
 * TC-CONTRACTOR-001 a TC-CONTRACTOR-007
 *
 * @jest-environment node
 */

import { POST as createProfile } from '../../../app/api/contractors/profile/route';
import {
  GET as getProfileMe,
  PATCH as patchProfileMe,
} from '../../../app/api/contractors/profile/me/route';
import { GET as getPublicProfile } from '../../../app/api/contractors/[id]/route';
import { NextRequest } from 'next/server';

// Mock de Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    contractorProfile: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
  db: {
    contractorProfile: {
      create: jest.fn(),
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
const mockContractorUser = {
  id: 'user-contractor-123',
  clerkUserId: 'clerk_contractor_abc123',
  email: 'juan.garcia@example.com',
  firstName: 'Juan',
  lastName: 'García',
  phone: '5551234567',
  avatarUrl: 'https://example.com/juan-avatar.jpg',
  role: 'CONTRACTOR',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  addresses: [],
};

const mockClientUser = {
  id: 'user-client-456',
  clerkUserId: 'clerk_client_xyz789',
  email: 'maria.lopez@example.com',
  firstName: 'María',
  lastName: 'López',
  phone: '5559876543',
  avatarUrl: null,
  role: 'CLIENT',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
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

const mockPublicContractorProfile = {
  id: 'contractor-profile-123',
  userId: 'user-contractor-123',
  businessName: 'García Plumbing',
  description: 'Professional plumbing services with 10 years of experience',
  specialties: ['plumbing', 'heating'],
  verified: false,
};

describe('Endpoints de gestión de perfiles de contratistas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/contractors/profile', () => {
    it('TC-CONTRACTOR-001: debe crear perfil de contratista exitosamente', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(null); // No existe perfil previo
      (prisma.contractorProfile.create as jest.Mock).mockResolvedValue(mockContractorProfile);

      const createData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services with 10 years of experience',
        specialties: ['plumbing', 'heating'],
        verificationDocuments: {
          idDocument: 'https://storage.example.com/docs/id-123.pdf',
        },
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createProfile(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.id).toBe('contractor-profile-123');
      expect(data.businessName).toBe('García Plumbing');
      expect(data.verified).toBe(false);
      expect(data.stripeConnectAccountId).toBeNull();
      expect(requireRole).toHaveBeenCalledWith('CONTRACTOR');
      expect(prisma.contractorProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockContractorUser.id,
          businessName: createData.businessName,
          description: createData.description,
          specialties: createData.specialties,
          verified: false,
          stripeConnectAccountId: null,
        }),
      });
    });

    it('TC-CONTRACTOR-002: debe rechazar perfil duplicado con 409', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockContractorProfile); // Ya existe perfil

      const createData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services',
        specialties: ['plumbing'],
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createProfile(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(data.error).toContain('ya tiene un perfil de contratista');
      expect(prisma.contractorProfile.create).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-003: debe rechazar usuario CLIENT con 403', async () => {
      // Arrange
      (requireRole as jest.Mock).mockRejectedValue(
        new ForbiddenError('Solo usuarios con rol CONTRACTOR pueden acceder a este recurso')
      );

      const createData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services',
        specialties: ['plumbing'],
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createProfile(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(prisma.contractorProfile.create).not.toHaveBeenCalled();
    });

    it('TC-CONTRACTOR-010: debe validar datos con Zod y retornar 400', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);

      const invalidData = {
        businessName: '', // Vacío (inválido)
        description: 'Short', // Menor a 10 caracteres (inválido)
        specialties: [], // Vacío (inválido)
      };

      // Act
      const req = createMockRequest(invalidData);
      const response = await createProfile(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos inválidos');
      expect(data.details).toBeDefined();
      expect(prisma.contractorProfile.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/contractors/profile/me', () => {
    it('TC-CONTRACTOR-004: debe retornar perfil completo del contratista autenticado', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockContractorProfile);

      // Act
      const response = await getProfileMe();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.id).toBe('contractor-profile-123');
      expect(data.businessName).toBe('García Plumbing');
      expect(data.verificationDocuments).toBeDefined();
      expect(data.stripeConnectAccountId).toBeNull();
      expect(requireRole).toHaveBeenCalledWith('CONTRACTOR');
      expect(prisma.contractorProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: mockContractorUser.id },
      });
    });

    it('TC-CONTRACTOR-004-02: debe retornar 404 si el contratista no tiene perfil', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await getProfileMe();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toContain('no encontrado');
    });
  });

  describe('PATCH /api/contractors/profile/me', () => {
    it('TC-CONTRACTOR-005: debe actualizar perfil del contratista autenticado', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockContractorProfile);
      (prisma.contractorProfile.update as jest.Mock).mockResolvedValue({
        ...mockContractorProfile,
        businessName: 'García Plumbing & Heating',
        description: 'Professional plumbing and heating services with over 10 years',
        specialties: ['plumbing', 'heating', 'air-conditioning'],
        updatedAt: new Date('2024-02-01'),
      });

      const updateData = {
        businessName: 'García Plumbing & Heating',
        description: 'Professional plumbing and heating services with over 10 years',
        specialties: ['plumbing', 'heating', 'air-conditioning'],
      };

      // Act
      const req = createMockRequest(updateData);
      const response = await patchProfileMe(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.businessName).toBe('García Plumbing & Heating');
      expect(data.specialties).toEqual(['plumbing', 'heating', 'air-conditioning']);
      expect(requireRole).toHaveBeenCalledWith('CONTRACTOR');
      expect(prisma.contractorProfile.update).toHaveBeenCalledWith({
        where: { id: mockContractorProfile.id },
        data: {
          businessName: updateData.businessName,
          description: updateData.description,
          specialties: updateData.specialties,
          verificationDocuments: undefined,
        },
      });
    });

    it('TC-CONTRACTOR-005-02: debe validar datos con Zod y retornar 400', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockContractorUser);

      const invalidData = {
        description: 'Short', // Menor a 10 caracteres (inválido)
      };

      // Act
      const req = createMockRequest(invalidData);
      const response = await patchProfileMe(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos inválidos');
      expect(data.details).toBeDefined();
      expect(prisma.contractorProfile.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/contractors/:id', () => {
    it('TC-CONTRACTOR-006: debe retornar perfil público de contratista', async () => {
      // Arrange
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(mockPublicContractorProfile);

      // Act
      const response = await getPublicProfile(
        createMockRequest(),
        { params: { id: 'contractor-profile-123' } }
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.id).toBe('contractor-profile-123');
      expect(data.businessName).toBe('García Plumbing');
      expect(data.specialties).toEqual(['plumbing', 'heating']);
      expect(data.verified).toBe(false);

      // TC-CONTRACTOR-007: Verificar que NO expone datos sensibles
      expect(data.verificationDocuments).toBeUndefined();
      expect(data.stripeConnectAccountId).toBeUndefined();
      expect(prisma.contractorProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'contractor-profile-123' },
        select: {
          id: true,
          userId: true,
          businessName: true,
          description: true,
          specialties: true,
          verified: true,
        },
      });
    });

    it('TC-CONTRACTOR-006-02: debe retornar 404 si el perfil no existe', async () => {
      // Arrange
      (prisma.contractorProfile.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const response = await getPublicProfile(
        createMockRequest(),
        { params: { id: 'contractor-profile-nonexistent' } }
      );
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toContain('no encontrado');
    });
  });
});
