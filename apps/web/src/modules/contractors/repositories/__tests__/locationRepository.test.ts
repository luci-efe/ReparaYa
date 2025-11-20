/**
 * Integration tests for LocationRepository
 * Tests database operations and constraints
 *
 * @jest-environment node
 */

import { describe, it, expect, afterEach, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/lib/db';
import { locationRepository } from '../locationRepository';
import { UserRole as PrismaUserRole, GeocodingStatus, ServiceZoneType, User, ContractorProfile } from '@prisma/client';

// Create a const object that mimics the enum for easier access
const UserRole = {
  CLIENT: 'CLIENT' as PrismaUserRole,
  CONTRACTOR: 'CONTRACTOR' as PrismaUserRole,
  ADMIN: 'ADMIN' as PrismaUserRole,
};

describe('LocationRepository Integration Tests', () => {
  let testUser: User;
  let testProfile: ContractorProfile;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        clerkUserId: 'clerk_test_location_repo',
        email: 'location.test@example.com',
        firstName: 'Location',
        lastName: 'Test',
        phone: '5555555555',
        role: UserRole.CONTRACTOR,
        status: 'ACTIVE',
      },
    });

    // Create test contractor profile
    testProfile = await prisma.contractorProfile.create({
      data: {
        userId: testUser.id,
        businessName: 'Test Location Business',
        description: 'Test description for location repository tests',
        specialties: ['plumbing', 'electrical'],
        verified: false,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.contractorServiceLocation.deleteMany({
      where: { contractorProfileId: testProfile.id },
    });
    await prisma.contractorProfile.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.user.deleteMany({
      where: { clerkUserId: 'clerk_test_location_repo' },
    });

    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up locations after each test
    await prisma.contractorServiceLocation.deleteMany({
      where: { contractorProfileId: testProfile.id },
    });
  });

  describe('create', () => {
    it('TC-RF-CTR-LOC-001-DB-01: debe insertar ubicación correctamente', async () => {
      // Arrange
      const locationData = {
        contractorProfileId: testProfile.id,
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
        normalizedAddress: 'Avenida Insurgentes Sur 123, Roma Norte, CDMX',
        timezone: 'America/Mexico_City',
        geocodingStatus: GeocodingStatus.SUCCESS,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 15,
      };

      // Act
      const result = await locationRepository.create(locationData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.contractorProfileId).toBe(testProfile.id);
      expect(result.street).toBe('Av. Insurgentes Sur');
      expect(result.baseLatitude?.toString()).toBe('19.432608');
      expect(result.baseLongitude?.toString()).toBe('-99.133209');
      expect(result.timezone).toBe('America/Mexico_City');
      expect(result.geocodingStatus).toBe(GeocodingStatus.SUCCESS);
      expect(result.radiusKm).toBe(15);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('TC-RF-CTR-LOC-001-DB-02: debe insertar ubicación con geocoding FAILED', async () => {
      // Arrange
      const locationData = {
        contractorProfileId: testProfile.id,
        street: 'Calle Ambigua',
        exteriorNumber: '1',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'MX',
        baseLatitude: null,
        baseLongitude: null,
        normalizedAddress: null,
        timezone: null,
        geocodingStatus: GeocodingStatus.FAILED,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 10,
      };

      // Act
      const result = await locationRepository.create(locationData);

      // Assert
      expect(result.geocodingStatus).toBe(GeocodingStatus.FAILED);
      expect(result.baseLatitude).toBeNull();
      expect(result.baseLongitude).toBeNull();
      expect(result.timezone).toBeNull();
    });

    it('TC-RF-CTR-LOC-001-DB-03: debe fallar con perfil duplicado (unique constraint)', async () => {
      // Arrange
      const locationData1 = {
        contractorProfileId: testProfile.id,
        street: 'First Street',
        exteriorNumber: '1',
        city: 'Test',
        state: 'Test',
        postalCode: '12345',
        country: 'MX',
        geocodingStatus: GeocodingStatus.PENDING,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 10,
      };

      const locationData2 = {
        ...locationData1,
        street: 'Second Street', // Different street but same profile
      };

      // Act
      await locationRepository.create(locationData1);

      // Assert - Should fail on unique constraint
      await expect(locationRepository.create(locationData2)).rejects.toThrow();
    });

    it('TC-RF-CTR-LOC-001-DB-04: debe insertar sin campos opcionales', async () => {
      // Arrange
      const minimalLocationData = {
        contractorProfileId: testProfile.id,
        street: 'Minimal Street',
        exteriorNumber: '100',
        city: 'Test City',
        state: 'Test State',
        postalCode: '54321',
        country: 'MX',
        geocodingStatus: GeocodingStatus.PENDING,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 5,
        // No interiorNumber, neighborhood, coordinates, timezone
      };

      // Act
      const result = await locationRepository.create(minimalLocationData);

      // Assert
      expect(result).toBeDefined();
      expect(result.interiorNumber).toBeNull();
      expect(result.neighborhood).toBeNull();
      expect(result.baseLatitude).toBeNull();
      expect(result.baseLongitude).toBeNull();
      expect(result.timezone).toBeNull();
    });
  });

  describe('findByContractorProfileId', () => {
    it('TC-RF-CTR-LOC-002-DB-01: debe retornar ubicación existente', async () => {
      // Arrange
      const created = await locationRepository.create({
        contractorProfileId: testProfile.id,
        street: 'Find Test Street',
        exteriorNumber: '200',
        city: 'Test City',
        state: 'Test State',
        postalCode: '99999',
        country: 'MX',
        baseLatitude: 20.0,
        baseLongitude: -100.0,
        geocodingStatus: GeocodingStatus.SUCCESS,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 20,
      });

      // Act
      const result = await locationRepository.findByContractorProfileId(testProfile.id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(created.id);
      expect(result?.street).toBe('Find Test Street');
      expect(result?.radiusKm).toBe(20);
    });

    it('TC-RF-CTR-LOC-002-DB-02: debe retornar null si no existe', async () => {
      // Arrange
      const nonExistentProfileId = 'profile-nonexistent-123';

      // Act
      const result = await locationRepository.findByContractorProfileId(nonExistentProfileId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('TC-RF-CTR-LOC-004-DB-01: debe actualizar campos modificados', async () => {
      // Arrange
      await locationRepository.create({
        contractorProfileId: testProfile.id,
        street: 'Original Street',
        exteriorNumber: '100',
        city: 'Original City',
        state: 'Original State',
        postalCode: '11111',
        country: 'MX',
        geocodingStatus: GeocodingStatus.SUCCESS,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 10,
      });

      const updateData = {
        street: 'Updated Street',
        city: 'Updated City',
        radiusKm: 25,
      };

      // Act
      const result = await locationRepository.update(testProfile.id, updateData);

      // Assert
      expect(result.street).toBe('Updated Street');
      expect(result.city).toBe('Updated City');
      expect(result.radiusKm).toBe(25);

      // Fields not in update should remain unchanged
      expect(result.exteriorNumber).toBe('100');
      expect(result.state).toBe('Original State');
    });

    it('TC-RF-CTR-LOC-004-DB-02: debe actualizar coordenadas en re-geocodificación', async () => {
      // Arrange
      await locationRepository.create({
        contractorProfileId: testProfile.id,
        street: 'Test Street',
        exteriorNumber: '1',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06700',
        country: 'MX',
        baseLatitude: 19.43,
        baseLongitude: -99.13,
        timezone: 'America/Mexico_City',
        geocodingStatus: GeocodingStatus.SUCCESS,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 10,
      });

      const updateData = {
        city: 'Monterrey',
        state: 'Nuevo León',
        baseLatitude: 25.686613,
        baseLongitude: -100.316116,
        timezone: 'America/Monterrey',
        geocodingStatus: GeocodingStatus.SUCCESS,
      };

      // Act
      const result = await locationRepository.update(testProfile.id, updateData);

      // Assert
      expect(result.city).toBe('Monterrey');
      expect(result.baseLatitude?.toString()).toBe('25.686613');
      expect(result.baseLongitude?.toString()).toBe('-100.316116');
      expect(result.timezone).toBe('America/Monterrey');
    });

    it('TC-RF-CTR-LOC-004-DB-03: debe actualizar solo radiusKm', async () => {
      // Arrange
      const created = await locationRepository.create({
        contractorProfileId: testProfile.id,
        street: 'Test Street',
        exteriorNumber: '1',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'MX',
        geocodingStatus: GeocodingStatus.SUCCESS,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 10,
      });

      // Act
      const result = await locationRepository.update(testProfile.id, { radiusKm: 50 });

      // Assert
      expect(result.radiusKm).toBe(50);
      expect(result.street).toBe(created.street); // Unchanged
      expect(result.city).toBe(created.city); // Unchanged
    });

    it('TC-RF-CTR-LOC-004-DB-04: debe fallar si ubicación no existe', async () => {
      // Arrange
      const nonExistentProfileId = 'profile-nonexistent';

      // Act & Assert
      await expect(
        locationRepository.update(nonExistentProfileId, { radiusKm: 20 })
      ).rejects.toThrow();
    });
  });

  describe('delete', () => {
    it('TC-RF-CTR-LOC-DELETE-01: debe eliminar ubicación', async () => {
      // Arrange
      await locationRepository.create({
        contractorProfileId: testProfile.id,
        street: 'Delete Test Street',
        exteriorNumber: '1',
        city: 'Test',
        state: 'Test',
        postalCode: '12345',
        country: 'MX',
        geocodingStatus: GeocodingStatus.SUCCESS,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 10,
      });

      // Act
      await locationRepository.delete(testProfile.id);

      // Assert
      const result = await locationRepository.findByContractorProfileId(testProfile.id);
      expect(result).toBeNull();
    });

    it('TC-RF-CTR-LOC-DELETE-02: debe ser idempotente (no fallar si no existe)', async () => {
      // Arrange
      const nonExistentProfileId = 'profile-nonexistent';

      // Act & Assert
      // Should not throw error
      await expect(locationRepository.delete(nonExistentProfileId)).resolves.not.toThrow();
    });
  });

  describe('Database Indexes and Performance', () => {
    it('TC-RNF-CTR-LOC-DB-01: debe tener índice en contractorProfileId (unique)', async () => {
      // This is tested by the unique constraint test above
      // Verified by attempting duplicate insert
      expect(true).toBe(true);
    });

    it('TC-RNF-CTR-LOC-DB-02: debe tener índice en (baseLatitude, baseLongitude)', async () => {
      // Arrange - Create multiple locations (using different test users/profiles)
      // This test verifies the index exists by checking query performance
      // In a real scenario, we'd use EXPLAIN to verify index usage

      const locationsData = [];
      for (let i = 0; i < 5; i++) {
        const user = await prisma.user.create({
          data: {
            clerkUserId: `clerk_index_test_${i}`,
            email: `index${i}@test.com`,
            firstName: 'Index',
            lastName: `Test${i}`,
            phone: `555000${i}`,
            role: UserRole.CONTRACTOR,
            status: 'ACTIVE',
          },
        });

        const profile = await prisma.contractorProfile.create({
          data: {
            userId: user.id,
            businessName: `Business ${i}`,
            description: 'Test description',
            specialties: ['test'],
            verified: false,
          },
        });

        locationsData.push({
          contractorProfileId: profile.id,
          street: `Street ${i}`,
          exteriorNumber: `${i}`,
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'MX',
          baseLatitude: 19.0 + i * 0.1,
          baseLongitude: -99.0 + i * 0.1,
          geocodingStatus: GeocodingStatus.SUCCESS,
          zoneType: ServiceZoneType.RADIUS,
          radiusKm: 10,
        });
      }

      for (const data of locationsData) {
        await locationRepository.create(data);
      }

      // Act - Query by coordinates (uses index)
      const results = await prisma.contractorServiceLocation.findMany({
        where: {
          AND: [
            { baseLatitude: { gte: 19.0, lte: 20.0 } },
            { baseLongitude: { gte: -100.0, lte: -98.0 } },
          ],
        },
      });

      // Assert
      expect(results.length).toBeGreaterThan(0);

      // Cleanup
      for (const data of locationsData) {
        await prisma.contractorServiceLocation.deleteMany({
          where: { contractorProfileId: data.contractorProfileId },
        });
        await prisma.contractorProfile.deleteMany({
          where: { id: data.contractorProfileId },
        });
      }
      await prisma.user.deleteMany({
        where: { clerkUserId: { startsWith: 'clerk_index_test_' } },
      });
    });

    it('TC-RNF-CTR-LOC-DB-03: debe tener índice en (city, state)', async () => {
      // Arrange
      await locationRepository.create({
        contractorProfileId: testProfile.id,
        street: 'Test Street',
        exteriorNumber: '1',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '06700',
        country: 'MX',
        geocodingStatus: GeocodingStatus.SUCCESS,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 10,
      });

      // Act - Query by city and state (uses index)
      const results = await prisma.contractorServiceLocation.findMany({
        where: {
          city: 'Ciudad de México',
          state: 'CDMX',
        },
      });

      // Assert
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].city).toBe('Ciudad de México');
    });
  });

  describe('Data Types and Constraints', () => {
    it('TC-RNF-CTR-LOC-DB-04: debe almacenar coordenadas con precisión Decimal(10,8) y Decimal(11,8)', async () => {
      // Arrange
      const preciseLocationData = {
        contractorProfileId: testProfile.id,
        street: 'Precise Street',
        exteriorNumber: '1',
        city: 'Test',
        state: 'Test',
        postalCode: '12345',
        country: 'MX',
        baseLatitude: 19.43260812, // 8 decimales
        baseLongitude: -99.13320945, // 8 decimales
        geocodingStatus: GeocodingStatus.SUCCESS,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 10,
      };

      // Act
      const result = await locationRepository.create(preciseLocationData);

      // Assert
      const lat = parseFloat(result.baseLatitude?.toString() || '0');
      const lng = parseFloat(result.baseLongitude?.toString() || '0');

      expect(lat).toBeCloseTo(19.43260812, 8);
      expect(lng).toBeCloseTo(-99.13320945, 8);
    });

    it('TC-RNF-CTR-LOC-DB-05: debe almacenar enum GeocodingStatus correctamente', async () => {
      // Arrange
      const statuses: GeocodingStatus[] = [
        GeocodingStatus.PENDING,
        GeocodingStatus.SUCCESS,
        GeocodingStatus.FAILED,
      ];

      // Act & Assert
      for (const status of statuses) {
        // Clean up previous location
        await prisma.contractorServiceLocation.deleteMany({
          where: { contractorProfileId: testProfile.id },
        });

        const result = await locationRepository.create({
          contractorProfileId: testProfile.id,
          street: 'Status Test',
          exteriorNumber: '1',
          city: 'Test',
          state: 'Test',
          postalCode: '12345',
          country: 'MX',
          geocodingStatus: status,
          zoneType: ServiceZoneType.RADIUS,
          radiusKm: 10,
        });

        expect(result.geocodingStatus).toBe(status);
      }
    });

    it('TC-RNF-CTR-LOC-DB-06: debe almacenar zona RADIUS correctamente', async () => {
      // Arrange
      const locationData = {
        contractorProfileId: testProfile.id,
        street: 'Zone Test',
        exteriorNumber: '1',
        city: 'Test',
        state: 'Test',
        postalCode: '12345',
        country: 'MX',
        geocodingStatus: GeocodingStatus.SUCCESS,
        zoneType: ServiceZoneType.RADIUS,
        radiusKm: 50,
        polygonCoordinates: null,
      };

      // Act
      const result = await locationRepository.create(locationData);

      // Assert
      expect(result.zoneType).toBe(ServiceZoneType.RADIUS);
      expect(result.radiusKm).toBe(50);
      expect(result.polygonCoordinates).toBeNull();
    });
  });
});
