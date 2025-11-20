/**
 * Integration tests for Contractor Location API endpoints
 * Tests TC-RF-CTR-LOC-001, TC-RF-CTR-LOC-003, TC-RF-CTR-LOC-005, TC-RF-CTR-LOC-006,
 *       TC-RF-CTR-LOC-008, TC-RF-CTR-LOC-009, TC-RF-CTR-LOC-010
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { UserRole, ContractorProfileStatus, GeocodingStatus } from '@prisma/client';

// Mock Clerk auth
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(),
}));

// Mock AWS Location Service
jest.mock('@/lib/aws/locationService', () => ({
  geocodeAddress: jest.fn(),
  reverseGeocode: jest.fn(),
}));

import { auth } from '@clerk/nextjs';
import * as awsLocationService from '@/lib/aws/locationService';

// Import API handlers (will be created)
import {
  POST as createLocation,
  GET as getLocation,
  PATCH as updateLocation,
} from '@/app/api/contractors/[id]/location/route';

// Helper to create mock request
const createMockRequest = (body?: any, params?: any) => {
  return {
    json: async () => body || {},
    headers: new Headers(),
  } as unknown as NextRequest;
};

describe('Contractor Location API Integration Tests', () => {
  let testContractorUser: any;
  let testContractorProfile: any;
  let testClientUser: any;
  let testAdminUser: any;

  beforeAll(async () => {
    // Create test contractor
    testContractorUser = await prisma.user.create({
      data: {
        clerkUserId: 'clerk_contractor_location_api',
        email: 'contractor.location@test.com',
        firstName: 'Contractor',
        lastName: 'Location',
        phone: '5550001111',
        role: UserRole.CONTRACTOR,
        status: 'ACTIVE',
      },
    });

    testContractorProfile = await prisma.contractorProfile.create({
      data: {
        userId: testContractorUser.id,
        businessName: 'Location Test Business',
        description: 'Testing contractor location API',
        specialties: ['plumbing'],
        verified: false,
        status: ContractorProfileStatus.DRAFT,
      },
    });

    // Create test client
    testClientUser = await prisma.user.create({
      data: {
        clerkUserId: 'clerk_client_location_api',
        email: 'client.location@test.com',
        firstName: 'Client',
        lastName: 'User',
        phone: '5550002222',
        role: UserRole.CLIENT,
        status: 'ACTIVE',
      },
    });

    // Create test admin
    testAdminUser = await prisma.user.create({
      data: {
        clerkUserId: 'clerk_admin_location_api',
        email: 'admin.location@test.com',
        firstName: 'Admin',
        lastName: 'User',
        phone: '5550003333',
        role: UserRole.ADMIN,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.contractorServiceLocation.deleteMany({
      where: { contractorProfileId: testContractorProfile.id },
    });
    await prisma.contractorProfile.deleteMany({
      where: { userId: testContractorUser.id },
    });
    await prisma.user.deleteMany({
      where: {
        clerkUserId: {
          in: [
            'clerk_contractor_location_api',
            'clerk_client_location_api',
            'clerk_admin_location_api',
          ],
        },
      },
    });

    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up locations after each test
    await prisma.contractorServiceLocation.deleteMany({
      where: { contractorProfileId: testContractorProfile.id },
    });
    jest.clearAllMocks();
  });

  describe('POST /api/contractors/[id]/location', () => {
    it('TC-RF-CTR-LOC-001-API-01: debe crear ubicación exitosamente (CONTRACTOR owner)', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testContractorUser.clerkUserId,
      });

      (awsLocationService.geocodeAddress as jest.Mock).mockResolvedValue({
        latitude: 19.432608,
        longitude: -99.133209,
        normalizedAddress: 'Avenida Insurgentes Sur 123, Roma Norte, CDMX, México',
        timezone: 'America/Mexico_City',
        relevance: 0.95,
      });

      const createData = {
        street: 'Av. Insurgentes Sur',
        exteriorNumber: '123',
        interiorNumber: 'Piso 5',
        neighborhood: 'Roma Norte',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '06700',
        country: 'MX',
        zoneType: 'RADIUS',
        radiusKm: 15,
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.street).toBe('Av. Insurgentes Sur');
      expect(data.geocodingStatus).toBe('SUCCESS');
      expect(data.baseLatitude).toBeDefined();
      expect(data.timezone).toBe('America/Mexico_City');
      expect(data.radiusKm).toBe(15);
    });

    it('TC-RF-CTR-LOC-008-API-01: debe rechazar si no es owner (403)', async () => {
      // Arrange - Different user trying to create location
      const otherUser = await prisma.user.create({
        data: {
          clerkUserId: 'clerk_other_user',
          email: 'other@test.com',
          firstName: 'Other',
          lastName: 'User',
          phone: '5559999999',
          role: UserRole.CONTRACTOR,
          status: 'ACTIVE',
        },
      });

      (auth as jest.Mock).mockReturnValue({
        userId: otherUser.clerkUserId,
      });

      const createData = {
        street: 'Test Street',
        exteriorNumber: '1',
        city: 'Test',
        state: 'Test',
        postalCode: '12345',
        country: 'MX',
        zoneType: 'RADIUS',
        radiusKm: 10,
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized');

      // Cleanup
      await prisma.user.deleteMany({ where: { id: otherUser.id } });
    });

    it('TC-RF-CTR-LOC-005-API-01: debe rechazar si perfil no es DRAFT (400)', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testContractorUser.clerkUserId,
      });

      // Change profile status to ACTIVE
      await prisma.contractorProfile.update({
        where: { id: testContractorProfile.id },
        data: { status: ContractorProfileStatus.ACTIVE },
      });

      const createData = {
        street: 'Test Street',
        exteriorNumber: '1',
        city: 'Test',
        state: 'Test',
        postalCode: '12345',
        country: 'MX',
        zoneType: 'RADIUS',
        radiusKm: 10,
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('DRAFT');

      // Restore to DRAFT
      await prisma.contractorProfile.update({
        where: { id: testContractorProfile.id },
        data: { status: ContractorProfileStatus.DRAFT },
      });
    });

    it('TC-RF-CTR-LOC-001-API-02: debe rechazar con dirección inválida (400 Zod error)', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testContractorUser.clerkUserId,
      });

      const invalidData = {
        street: '', // Invalid: empty
        exteriorNumber: '123',
        city: 'Test',
        state: 'Test',
        postalCode: '12345',
        country: 'MX',
        zoneType: 'RADIUS',
        radiusKm: 10,
      };

      // Act
      const req = createMockRequest(invalidData);
      const response = await createLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos inválidos');
      expect(data.details).toBeDefined();
    });

    it('TC-RF-CTR-LOC-003-API-01: debe crear con status FAILED cuando geocoding falla (201)', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testContractorUser.clerkUserId,
      });

      (awsLocationService.geocodeAddress as jest.Mock).mockRejectedValue(
        new Error('Geocoding service unavailable')
      );

      const createData = {
        street: 'Ambiguous Street',
        exteriorNumber: '1',
        city: 'Test',
        state: 'Test',
        postalCode: '12345',
        country: 'MX',
        zoneType: 'RADIUS',
        radiusKm: 10,
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.geocodingStatus).toBe('FAILED');
      expect(data.baseLatitude).toBeNull();
      expect(data.message).toContain('No pudimos validar la dirección');
    });

    it('TC-RF-CTR-LOC-001-API-03: debe rechazar usuario no autenticado (401)', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({ userId: null });

      const createData = {
        street: 'Test Street',
        exteriorNumber: '1',
        city: 'Test',
        state: 'Test',
        postalCode: '12345',
        country: 'MX',
        zoneType: 'RADIUS',
        radiusKm: 10,
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toContain('No autenticado');
    });
  });

  describe('PATCH /api/contractors/[id]/location', () => {
    beforeEach(async () => {
      // Create location before each update test
      await prisma.contractorServiceLocation.create({
        data: {
          contractorProfileId: testContractorProfile.id,
          street: 'Original Street',
          exteriorNumber: '100',
          city: 'CDMX',
          state: 'CDMX',
          postalCode: '06700',
          country: 'MX',
          baseLatitude: 19.43,
          baseLongitude: -99.13,
          timezone: 'America/Mexico_City',
          geocodingStatus: GeocodingStatus.SUCCESS,
          zoneType: 'RADIUS',
          radiusKm: 10,
        },
      });
    });

    it('TC-RF-CTR-LOC-006-API-01: debe actualizar zona exitosamente', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testContractorUser.clerkUserId,
      });

      const updateData = {
        radiusKm: 25,
      };

      // Act
      const req = createMockRequest(updateData);
      const response = await updateLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.radiusKm).toBe(25);

      // Verify address didn't change
      expect(data.street).toBe('Original Street');
    });

    it('TC-RF-CTR-LOC-005-API-02: debe rechazar en perfil ACTIVE (403)', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testContractorUser.clerkUserId,
      });

      // Change to ACTIVE
      await prisma.contractorProfile.update({
        where: { id: testContractorProfile.id },
        data: { status: ContractorProfileStatus.ACTIVE },
      });

      const updateData = {
        radiusKm: 20,
      };

      // Act
      const req = createMockRequest(updateData);
      const response = await updateLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toContain('admin');

      // Restore to DRAFT
      await prisma.contractorProfile.update({
        where: { id: testContractorProfile.id },
        data: { status: ContractorProfileStatus.DRAFT },
      });
    });

    it('TC-RF-CTR-LOC-009-API-01: debe permitir a ADMIN actualizar perfil ACTIVE', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testAdminUser.clerkUserId,
      });

      await prisma.contractorProfile.update({
        where: { id: testContractorProfile.id },
        data: { status: ContractorProfileStatus.ACTIVE },
      });

      const updateData = {
        radiusKm: 30,
      };

      // Act
      const req = createMockRequest(updateData);
      const response = await updateLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.radiusKm).toBe(30);

      // Restore
      await prisma.contractorProfile.update({
        where: { id: testContractorProfile.id },
        data: { status: ContractorProfileStatus.DRAFT },
      });
    });

    it('TC-RF-CTR-LOC-004-API-01: debe validar datos con Zod en actualización', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testContractorUser.clerkUserId,
      });

      const invalidUpdate = {
        radiusKm: 200, // Out of range
      };

      // Act
      const req = createMockRequest(invalidUpdate);
      const response = await updateLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Datos inválidos');
    });
  });

  describe('GET /api/contractors/[id]/location', () => {
    beforeEach(async () => {
      // Create location before each GET test
      await prisma.contractorServiceLocation.create({
        data: {
          contractorProfileId: testContractorProfile.id,
          street: 'Av. Insurgentes Sur',
          exteriorNumber: '123',
          interiorNumber: 'Piso 5',
          neighborhood: 'Roma Norte',
          city: 'Ciudad de México',
          state: 'CDMX',
          postalCode: '06700',
          country: 'MX',
          baseLatitude: 19.432608,
          baseLongitude: -99.133209,
          normalizedAddress: 'Normalized Address',
          timezone: 'America/Mexico_City',
          geocodingStatus: GeocodingStatus.SUCCESS,
          zoneType: 'RADIUS',
          radiusKm: 15,
        },
      });
    });

    it('TC-RF-CTR-LOC-009-API-02: debe devolver dirección completa para owner', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testContractorUser.clerkUserId,
      });

      // Act
      const req = createMockRequest();
      const response = await getLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.address).toBeDefined();
      expect(data.address.street).toBe('Av. Insurgentes Sur');
      expect(data.address.interiorNumber).toBe('Piso 5');
      expect(data.coordinates.latitude).toBe(19.432608);
      expect(data.coordinates.longitude).toBe(-99.133209);
      expect(data.timezone).toBe('America/Mexico_City');
      expect(data.serviceZone.radiusKm).toBe(15);
    });

    it('TC-RF-CTR-LOC-009-API-03: debe devolver dirección completa para ADMIN', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testAdminUser.clerkUserId,
      });

      // Act
      const req = createMockRequest();
      const response = await getLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.address).toBeDefined();
      expect(data.address.street).toBe('Av. Insurgentes Sur');
      expect(data.coordinates.latitude).toBe(19.432608);
      expect(data.timezone).toBe('America/Mexico_City');
    });

    it('TC-RF-CTR-LOC-010-API-01: debe devolver vista limitada para CLIENT', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testClientUser.clerkUserId,
      });

      // Act
      const req = createMockRequest();
      const response = await getLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.city).toBe('Ciudad de México');
      expect(data.state).toBe('CDMX');

      // Coordinates should be approximated (2 decimals)
      expect(data.coordinates.latitude).toBe(19.43);
      expect(data.coordinates.longitude).toBe(-99.13);

      // Should NOT include
      expect(data.address).toBeUndefined();
      expect(data.timezone).toBeUndefined();

      // Should include service zone
      expect(data.serviceZone).toBeDefined();
      expect(data.serviceZone.radiusKm).toBe(15);
    });

    it('TC-RF-CTR-LOC-001-API-04: debe rechazar sin autenticación (401)', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({ userId: null });

      // Act
      const req = createMockRequest();
      const response = await getLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toContain('No autenticado');
    });

    it('TC-RF-CTR-LOC-001-API-05: debe retornar 404 si ubicación no existe', async () => {
      // Arrange
      (auth as jest.Mock).mockReturnValue({
        userId: testContractorUser.clerkUserId,
      });

      // Delete location
      await prisma.contractorServiceLocation.deleteMany({
        where: { contractorProfileId: testContractorProfile.id },
      });

      // Act
      const req = createMockRequest();
      const response = await getLocation(req, { params: { id: testContractorProfile.id } });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('Authorization Edge Cases', () => {
    it('TC-RF-CTR-LOC-008-API-02: debe permitir solo a propietario o admin crear/modificar', async () => {
      // Create another contractor
      const anotherContractor = await prisma.user.create({
        data: {
          clerkUserId: 'clerk_another_contractor',
          email: 'another@contractor.com',
          firstName: 'Another',
          lastName: 'Contractor',
          phone: '5554444444',
          role: UserRole.CONTRACTOR,
          status: 'ACTIVE',
        },
      });

      (auth as jest.Mock).mockReturnValue({
        userId: anotherContractor.clerkUserId,
      });

      const createData = {
        street: 'Test Street',
        exteriorNumber: '1',
        city: 'Test',
        state: 'Test',
        postalCode: '12345',
        country: 'MX',
        zoneType: 'RADIUS',
        radiusKm: 10,
      };

      // Act
      const req = createMockRequest(createData);
      const response = await createLocation(req, { params: { id: testContractorProfile.id } });

      // Assert
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.user.deleteMany({ where: { id: anotherContractor.id } });
    });
  });
});
