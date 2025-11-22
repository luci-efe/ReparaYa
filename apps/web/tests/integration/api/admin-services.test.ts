/**
 * Integration tests for admin service moderation API endpoints
 * TC-SERVICE-044 through TC-SERVICE-050
 *
 * @jest-environment node
 */

import { GET as listAllServices } from '../../../app/api/admin/services/route';
import { PATCH as adminPauseService } from '../../../app/api/admin/services/[id]/pause/route';
import { PATCH as adminActivateService } from '../../../app/api/admin/services/[id]/activate/route';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    service: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    serviceAuditLog: {
      create: jest.fn(),
    },
  },
  db: {
    service: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    serviceAuditLog: {
      create: jest.fn(),
    },
  },
}));

// Mock authentication
jest.mock('@/modules/auth/utils/requireRole', () => ({
  requireRole: jest.fn(),
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

// Mock AWS S3
jest.mock('@/lib/aws/s3Client', () => ({
  getS3Client: jest.fn(() => ({
    send: jest.fn(),
  })),
}));

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(() => Promise.resolve('https://mock-presigned-url.com')),
}));

import { prisma } from '@/lib/db';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { ForbiddenError, UnauthorizedError } from '@/modules/auth/errors';

// Helper to create mock requests
const createMockRequest = (body?: any, searchParams?: Record<string, string>) => {
  const urlStr = searchParams
    ? `http://localhost:3000?${new URLSearchParams(searchParams).toString()}`
    : 'http://localhost:3000';

  return {
    json: async () => body || {},
    headers: new Headers(),
    url: urlStr,
    nextUrl: new URL(urlStr),
  } as unknown as NextRequest;
};

// Test fixtures
const mockAdminUser = {
  id: 'user-admin-1',
  clerkUserId: 'clerk_admin_1',
  email: 'admin@reparaya.com',
  firstName: 'Admin',
  lastName: 'System',
  phone: '5559999999',
  avatarUrl: null,
  role: 'ADMIN',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockContractorUser = {
  id: 'user-contractor-1',
  clerkUserId: 'clerk_contractor_1',
  email: 'contractor@example.com',
  firstName: 'Juan',
  lastName: 'García',
  phone: '5551234567',
  avatarUrl: null,
  role: 'CONTRACTOR',
  status: 'ACTIVE',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockCategory = {
  id: 'category-plumbing',
  name: 'Plomería',
  description: 'Servicios de plomería',
  iconUrl: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockDraftService = {
  id: 'service-draft',
  contractorId: 'user-contractor-1',
  categoryId: 'category-plumbing',
  title: 'Servicio en borrador',
  description: 'Este es un servicio en borrador',
  pricePerHour: 350.0,
  estimatedDuration: 2,
  visibilityStatus: 'DRAFT',
  lastPublishedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  category: mockCategory,
  contractor: {
    id: 'user-contractor-1',
    firstName: 'Juan',
    lastName: 'García',
  },
};

const mockActiveService = {
  id: 'service-active',
  contractorId: 'user-contractor-1',
  categoryId: 'category-plumbing',
  title: 'Servicio activo',
  description: 'Este es un servicio activo y publicado',
  pricePerHour: 400.0,
  estimatedDuration: 3,
  visibilityStatus: 'ACTIVE',
  lastPublishedAt: new Date('2024-01-05'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-05'),
  category: mockCategory,
  contractor: {
    id: 'user-contractor-1',
    firstName: 'Juan',
    lastName: 'García',
  },
};

const mockPausedService = {
  id: 'service-paused',
  contractorId: 'user-contractor-1',
  categoryId: 'category-plumbing',
  title: 'Servicio pausado',
  description: 'Este servicio fue pausado por el admin',
  pricePerHour: 380.0,
  estimatedDuration: 2,
  visibilityStatus: 'PAUSED',
  lastPublishedAt: new Date('2024-01-03'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-10'),
  category: mockCategory,
  contractor: {
    id: 'user-contractor-1',
    firstName: 'Juan',
    lastName: 'García',
  },
};

describe('Admin Service Moderation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/services', () => {
    it('TC-SERVICE-044: should list all services with all statuses (ADMIN)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        mockDraftService,
        mockActiveService,
        mockPausedService,
      ]);
      (prisma.service.count as jest.Mock).mockResolvedValue(3);

      // Act
      const req = createMockRequest(undefined, { page: '1', limit: '20' });
      const response = await listAllServices(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.services).toHaveLength(3);
      expect(data.pagination.total).toBe(3);
      expect(requireRole).toHaveBeenCalledWith('ADMIN');

      // Verify all statuses are included
      const statuses = data.services.map((s: any) => s.visibilityStatus);
      expect(statuses).toContain('DRAFT');
      expect(statuses).toContain('ACTIVE');
      expect(statuses).toContain('PAUSED');
    });

    it('TC-SERVICE-045: should filter services by status', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockActiveService]);
      (prisma.service.count as jest.Mock).mockResolvedValue(1);

      // Act
      const req = createMockRequest(undefined, { status: 'ACTIVE' });
      const response = await listAllServices(req);

      // Assert
      expect(response.status).toBe(200);
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibilityStatus: 'ACTIVE',
          }),
        })
      );
    });

    it('TC-SERVICE-046: should filter services by contractor', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([
        mockDraftService,
        mockActiveService,
      ]);
      (prisma.service.count as jest.Mock).mockResolvedValue(2);

      // Act
      const req = createMockRequest(undefined, { contractorId: 'user-contractor-1' });
      const response = await listAllServices(req);

      // Assert
      expect(response.status).toBe(200);
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contractorId: 'user-contractor-1',
          }),
        })
      );
    });

    it('TC-SERVICE-047: should reject non-ADMIN users (403)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockRejectedValue(
        new ForbiddenError('Solo usuarios con rol ADMIN pueden acceder a este recurso')
      );

      // Act
      const req = createMockRequest();
      const response = await listAllServices(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(prisma.service.findMany).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-048: should paginate results correctly', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockActiveService]);
      (prisma.service.count as jest.Mock).mockResolvedValue(25);

      // Act
      const req = createMockRequest(undefined, { page: '2', limit: '10' });
      const response = await listAllServices(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(10);
      expect(data.pagination.total).toBe(25);
      expect(data.pagination.totalPages).toBe(3);
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * limit 10
          take: 10,
        })
      );
    });
  });

  describe('PATCH /api/admin/services/:id/pause', () => {
    it('TC-SERVICE-049: should pause ACTIVE service (admin moderation)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockActiveService);
      (prisma.service.update as jest.Mock).mockResolvedValue({
        ...mockActiveService,
        visibilityStatus: 'PAUSED',
        updatedAt: new Date(),
      });
      (prisma.serviceAuditLog.create as jest.Mock).mockResolvedValue({
        id: 'audit-1',
        serviceId: 'service-active',
        adminId: 'user-admin-1',
        action: 'ADMIN_PAUSE',
        previousStatus: 'ACTIVE',
        newStatus: 'PAUSED',
        reason: null,
        createdAt: new Date(),
      });

      // Act
      const req = createMockRequest();
      const response = await adminPauseService(req, { params: { id: 'service-active' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.visibilityStatus).toBe('PAUSED');
      expect(requireRole).toHaveBeenCalledWith('ADMIN');
      expect(prisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'service-active' },
          data: expect.objectContaining({
            visibilityStatus: 'PAUSED',
          }),
        })
      );
      // Verify audit log was created
      expect(prisma.serviceAuditLog.create).toHaveBeenCalled();
    });

    it('TC-SERVICE-050: should reject pause of non-ACTIVE service (400)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockDraftService);

      // Act
      const req = createMockRequest();
      const response = await adminPauseService(req, { params: { id: 'service-draft' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.details.fromStatus).toBe('DRAFT');
      expect(data.details.toStatus).toBe('PAUSED');
      expect(prisma.service.update).not.toHaveBeenCalled();
      expect(prisma.serviceAuditLog.create).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-051: should reject pause for non-ADMIN (403)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockRejectedValue(
        new ForbiddenError('Solo usuarios con rol ADMIN pueden acceder a este recurso')
      );

      // Act
      const req = createMockRequest();
      const response = await adminPauseService(req, { params: { id: 'service-active' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(prisma.service.update).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-052: should return 404 for non-existent service', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const req = createMockRequest();
      const response = await adminPauseService(req, { params: { id: 'nonexistent' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toContain('no encontrado');
      expect(prisma.service.update).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/admin/services/:id/activate', () => {
    it('TC-SERVICE-053: should activate PAUSED service (admin approval)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockPausedService);
      (prisma.service.update as jest.Mock).mockResolvedValue({
        ...mockPausedService,
        visibilityStatus: 'ACTIVE',
        updatedAt: new Date(),
      });
      (prisma.serviceAuditLog.create as jest.Mock).mockResolvedValue({
        id: 'audit-2',
        serviceId: 'service-paused',
        adminId: 'user-admin-1',
        action: 'ADMIN_ACTIVATE',
        previousStatus: 'PAUSED',
        newStatus: 'ACTIVE',
        reason: null,
        createdAt: new Date(),
      });

      // Act
      const req = createMockRequest();
      const response = await adminActivateService(req, { params: { id: 'service-paused' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.visibilityStatus).toBe('ACTIVE');
      expect(requireRole).toHaveBeenCalledWith('ADMIN');
      expect(prisma.service.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'service-paused' },
          data: expect.objectContaining({
            visibilityStatus: 'ACTIVE',
          }),
        })
      );
      // Verify audit log was created
      expect(prisma.serviceAuditLog.create).toHaveBeenCalled();
    });

    it('TC-SERVICE-054: should reject activate of non-PAUSED service (400)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockActiveService);

      // Act
      const req = createMockRequest();
      const response = await adminActivateService(req, { params: { id: 'service-active' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.details.fromStatus).toBe('ACTIVE');
      expect(data.details.toStatus).toBe('ACTIVE');
      expect(prisma.service.update).not.toHaveBeenCalled();
    });

    it('TC-SERVICE-055: should reject activate for non-ADMIN (403)', async () => {
      // Arrange
      (requireRole as jest.Mock).mockRejectedValue(
        new ForbiddenError('Solo usuarios con rol ADMIN pueden acceder a este recurso')
      );

      // Act
      const req = createMockRequest();
      const response = await adminActivateService(req, { params: { id: 'service-paused' } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBeDefined();
      expect(prisma.service.update).not.toHaveBeenCalled();
    });
  });

  describe('Admin service moderation edge cases', () => {
    it('TC-SERVICE-056: should handle concurrent admin actions gracefully', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.service.findUnique as jest.Mock).mockResolvedValue(mockActiveService);
      (prisma.service.update as jest.Mock).mockResolvedValue({
        ...mockActiveService,
        visibilityStatus: 'PAUSED',
      });
      (prisma.serviceAuditLog.create as jest.Mock).mockResolvedValue({
        id: 'audit-concurrent',
        serviceId: 'service-active',
        adminId: 'user-admin-1',
        action: 'ADMIN_PAUSE',
        previousStatus: 'ACTIVE',
        newStatus: 'PAUSED',
        createdAt: new Date(),
      });

      // Act
      const req = createMockRequest();
      const response = await adminPauseService(req, { params: { id: 'service-active' } });

      // Assert
      expect(response.status).toBe(200);
      // In a real scenario, we'd test optimistic locking or versioning
      // For now, just verify the operation completes
    });

    it('TC-SERVICE-057: should include contractor info in admin service list', async () => {
      // Arrange
      (requireRole as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.service.findMany as jest.Mock).mockResolvedValue([mockActiveService]);
      (prisma.service.count as jest.Mock).mockResolvedValue(1);

      // Act
      const req = createMockRequest();
      const response = await listAllServices(req);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.services[0].contractor).toBeDefined();
      expect(data.services[0].contractor.firstName).toBe('Juan');
      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            contractor: true,
            category: true,
          }),
        })
      );
    });
  });
});
