/**
 * Unit tests for LocationService
 * Tests TC-RF-CTR-LOC-001, TC-RF-CTR-LOC-004, TC-RF-CTR-LOC-005, TC-RF-CTR-LOC-011, TC-RF-CTR-LOC-012
 *
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Import types
import type { CreateLocationDTO, UpdateLocationDTO } from '../../types/location';
import { UserRole as PrismaUserRole } from '@prisma/client';

// Create a const object that mimics the enum for easier access
const UserRole = {
  CLIENT: 'CLIENT' as PrismaUserRole,
  CONTRACTOR: 'CONTRACTOR' as PrismaUserRole,
  ADMIN: 'ADMIN' as PrismaUserRole,
};

// Setup mocks BEFORE any imports
jest.mock('@/lib/aws/locationService', () => {
  const actual = jest.requireActual<typeof import('@/lib/aws/locationService')>('@/lib/aws/locationService');
  return {
    ...actual,
    geocodeAddress: jest.fn(),
  };
});

// Import service and dependencies AFTER mocks
import { locationService } from '../locationService';
import { locationRepository } from '../../repositories/locationRepository';
import { contractorProfileRepository } from '../../repositories/contractorProfileRepository';
import { geocodeAddress } from '@/lib/aws/locationService';

// Get reference to the mocked function after import
const mockGeocodeAddress = geocodeAddress as jest.MockedFunction<typeof geocodeAddress>;

describe('LocationService', () => {
  // Mock repository methods
  let mockRepositoryCreate: ReturnType<typeof jest.spyOn>;
  let mockRepositoryFindByContractorProfileId: ReturnType<typeof jest.spyOn>;
  let mockRepositoryUpdate: ReturnType<typeof jest.spyOn>;
  let _mockRepositoryDelete: ReturnType<typeof jest.spyOn>;

  let mockProfileFindById: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    // Use real timers for this test suite
    jest.useRealTimers();
    // Clear all mocks
    jest.clearAllMocks();

    // Set up spies
    mockRepositoryCreate = jest.spyOn(locationRepository, 'create');
    mockRepositoryFindByContractorProfileId = jest.spyOn(
      locationRepository,
      'findByContractorProfileId'
    );
    mockRepositoryUpdate = jest.spyOn(locationRepository, 'update');
    _mockRepositoryDelete = jest.spyOn(locationRepository, 'delete');

    mockProfileFindById = jest.spyOn(contractorProfileRepository, 'findById');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createLocation', () => {
    const validCreateData: CreateLocationDTO = {
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

    const mockProfile = {
      id: 'profile-123',
      userId: 'user-contractor-123',
      businessName: 'Test Business',
      description: 'Test description',
      specialties: ['plumbing'],
      verified: false,
      verificationDocuments: null,
      stripeConnectAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockGeocodingResult = {
      latitude: 19.432608,
      longitude: -99.133209,
      normalizedAddress: 'Avenida Insurgentes Sur 123, Roma Norte, CDMX, México',
      timezone: 'America/Mexico_City',
      relevance: 0.95,
    };

    it('TC-RF-CTR-LOC-001-01: debe crear ubicación con geocoding exitoso', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(null);
      mockGeocodeAddress.mockResolvedValue(mockGeocodingResult);
      mockRepositoryCreate.mockResolvedValue({
        id: 'location-123',
        contractorProfileId: profileId,
        ...validCreateData,
        baseLatitude: mockGeocodingResult.latitude,
        baseLongitude: mockGeocodingResult.longitude,
        normalizedAddress: mockGeocodingResult.normalizedAddress,
        timezone: mockGeocodingResult.timezone,
        geocodingStatus: 'SUCCESS' as const,
        polygonCoordinates: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await locationService.createLocation(profileId, validCreateData, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.geocodingStatus).toBe('SUCCESS');
      expect(result.coordinates).toBeDefined();
      expect(result.coordinates?.latitude).toBe(19.432608);
      expect(result.coordinates?.longitude).toBe(-99.133209);
      expect(result.timezone).toBe('America/Mexico_City');
      expect(result.serviceZone.type).toBe('RADIUS');

      expect(mockProfileFindById).toHaveBeenCalledWith(profileId);
      expect(mockGeocodeAddress).toHaveBeenCalledWith(
        expect.objectContaining({
          street: validCreateData.street,
          city: validCreateData.city,
        })
      );
      expect(mockRepositoryCreate).toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-003-01: debe guardar con status FAILED cuando geocoding falla', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(null);
      mockGeocodeAddress.mockRejectedValue(new Error('Geocoding service unavailable'));
      mockRepositoryCreate.mockResolvedValue({
        id: 'location-123',
        contractorProfileId: profileId,
        ...validCreateData,
        baseLatitude: null,
        baseLongitude: null,
        normalizedAddress: null,
        timezone: null,
        geocodingStatus: 'FAILED' as const,
        polygonCoordinates: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await locationService.createLocation(profileId, validCreateData, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.geocodingStatus).toBe('FAILED');
      expect(result.coordinates).toBeNull();

      expect(mockRepositoryCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          geocodingStatus: 'FAILED',
        })
      );
    });

    it('TC-RF-CTR-LOC-005-01: debe rechazar si perfil está verificado', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      const verifiedProfile = {
        ...mockProfile,
        verified: true,
      };

      mockProfileFindById.mockResolvedValue(verifiedProfile);

      // Act & Assert
      await expect(
        locationService.createLocation(profileId, validCreateData, userId)
      ).rejects.toThrow('Solo se puede crear ubicación en perfiles en estado DRAFT (no verificados)');

      expect(mockRepositoryCreate).not.toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-001-02: debe rechazar si ubicación ya existe', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue({
        id: 'existing-location',
        contractorProfileId: profileId,
        street: 'Existing St',
        exteriorNumber: '1',
        city: 'Test',
        state: 'Test',
        postalCode: '12345',
        country: 'MX',
        baseLatitude: 19.0,
        baseLongitude: -99.0,
        normalizedAddress: null,
        timezone: null,
        geocodingStatus: 'SUCCESS',
        zoneType: 'RADIUS',
        radiusKm: 10,
        polygonCoordinates: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        interiorNumber: null,
        neighborhood: null,
      });

      // Act & Assert
      await expect(
        locationService.createLocation(profileId, validCreateData, userId)
      ).rejects.toThrow('ya tiene una ubicación registrada');

      expect(mockRepositoryCreate).not.toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-008-01: debe rechazar si usuario no es el owner', async () => {
      // Arrange
      const userId = 'user-other-456';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile); // userId doesn't match

      // Act & Assert
      await expect(
        locationService.createLocation(profileId, validCreateData, userId)
      ).rejects.toThrow('Solo el propietario del perfil puede crear su ubicación');

      expect(mockRepositoryCreate).not.toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-001-03: debe validar datos con Zod antes de crear', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      const invalidData = {
        street: '', // Invalid
        exteriorNumber: '123',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06700',
        country: 'MX',
        zoneType: 'RADIUS',
        radiusKm: 10,
      } as CreateLocationDTO;

      // Act & Assert
      await expect(
        locationService.createLocation(profileId, invalidData, userId)
      ).rejects.toThrow();

      expect(mockRepositoryCreate).not.toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-001-04: debe rechazar si perfil no existe', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-nonexistent';

      mockProfileFindById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        locationService.createLocation(profileId, validCreateData, userId)
      ).rejects.toThrow('no encontrado');

      expect(mockRepositoryCreate).not.toHaveBeenCalled();
    });
  });

  describe('updateLocation', () => {
    const mockProfile = {
      id: 'profile-123',
      userId: 'user-contractor-123',
      businessName: 'Test Business',
      description: 'Test description',
      specialties: ['plumbing'],
      verified: false,
      verificationDocuments: null,
      stripeConnectAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingLocation = {
      id: 'location-123',
      contractorProfileId: 'profile-123',
      street: 'Old Street',
      exteriorNumber: '100',
      interiorNumber: null,
      neighborhood: null,
      city: 'CDMX',
      state: 'CDMX',
      postalCode: '06700',
      country: 'MX',
      baseLatitude: 19.43,
      baseLongitude: -99.13,
      normalizedAddress: 'Old normalized address',
      timezone: 'America/Mexico_City',
      geocodingStatus: 'SUCCESS',
      zoneType: 'RADIUS',
      radiusKm: 10,
      polygonCoordinates: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('TC-RF-CTR-LOC-004-01: debe actualizar ubicación en perfil DRAFT', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';
      const updateData: UpdateLocationDTO = {
        radiusKm: 20,
      };

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(existingLocation);
      mockRepositoryUpdate.mockResolvedValue({
        ...existingLocation,
        radiusKm: 20,
      });

      // Act
      const result = await locationService.updateLocation(profileId, updateData, userId, UserRole.CONTRACTOR);

      // Assert
      expect(result.serviceZone).toBeDefined();
      expect(result.serviceZone.type).toBe('RADIUS');
      if (result.serviceZone.type === 'RADIUS') {
        expect(result.serviceZone.radiusKm).toBe(20);
      }
      expect(mockRepositoryUpdate).toHaveBeenCalledWith(
        profileId,
        expect.objectContaining({ radiusKm: 20 })
      );

      // No re-geocoding since address didn't change
      expect(mockGeocodeAddress).not.toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-005-02: debe rechazar actualización en perfil verificado (no admin)', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';
      const updateData: UpdateLocationDTO = {
        radiusKm: 20,
      };

      const verifiedProfile = {
        ...mockProfile,
        verified: true,
      };

      mockProfileFindById.mockResolvedValue(verifiedProfile);

      // Act & Assert
      await expect(
        locationService.updateLocation(profileId, updateData, userId, UserRole.CONTRACTOR)
      ).rejects.toThrow('Solo un administrador puede editar la ubicación');

      expect(mockRepositoryUpdate).not.toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-009-01: debe permitir a admin actualizar perfil verificado', async () => {
      // Arrange
      const adminUserId = 'user-admin-789';
      const profileId = 'profile-123';
      const updateData: UpdateLocationDTO = {
        radiusKm: 25,
      };

      const verifiedProfile = {
        ...mockProfile,
        verified: true,
      };

      mockProfileFindById.mockResolvedValue(verifiedProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(existingLocation);
      mockRepositoryUpdate.mockResolvedValue({
        ...existingLocation,
        radiusKm: 25,
      });

      // Act
      const result = await locationService.updateLocation(
        profileId,
        updateData,
        adminUserId,
        UserRole.ADMIN
      );

      // Assert
      expect(result.serviceZone.type).toBe('RADIUS');
      if (result.serviceZone.type === 'RADIUS') {
        expect(result.serviceZone.radiusKm).toBe(25);
      }
      expect(mockRepositoryUpdate).toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-011-01: debe re-geocodificar cuando cambia dirección', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';
      const updateData: UpdateLocationDTO = {
        city: 'Monterrey',
        state: 'Nuevo León',
        postalCode: '64000',
      };

      const newGeocodingResult = {
        latitude: 25.686613,
        longitude: -100.316116,
        normalizedAddress: 'Old Street 100, Monterrey, Nuevo León, México',
        timezone: 'America/Monterrey',
        relevance: 0.9,
      };

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(existingLocation);
      mockGeocodeAddress.mockResolvedValue(newGeocodingResult);
      mockRepositoryUpdate.mockResolvedValue({
        ...existingLocation,
        city: 'Monterrey',
        state: 'Nuevo León',
        postalCode: '64000',
        baseLatitude: 25.686613,
        baseLongitude: -100.316116,
        timezone: 'America/Monterrey',
        geocodingStatus: 'SUCCESS',
      });

      // Act
      const result = await locationService.updateLocation(
        profileId,
        updateData,
        userId,
        UserRole.CONTRACTOR
      );

      // Assert
      expect(result.address.city).toBe('Monterrey');
      expect(result.coordinates?.latitude).toBe(25.686613);
      expect(result.timezone).toBe('America/Monterrey');

      expect(mockGeocodeAddress).toHaveBeenCalled();
      expect(mockRepositoryUpdate).toHaveBeenCalledWith(
        profileId,
        expect.objectContaining({
          city: 'Monterrey',
          geocodingStatus: 'SUCCESS',
        })
      );
    });

    it('TC-RF-CTR-LOC-012-01: NO debe re-geocodificar si solo cambia zona', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';
      const updateData: UpdateLocationDTO = {
        radiusKm: 30,
      };

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(existingLocation);
      mockRepositoryUpdate.mockResolvedValue({
        ...existingLocation,
        radiusKm: 30,
      });

      // Act
      const result = await locationService.updateLocation(profileId, updateData, userId, UserRole.CONTRACTOR);

      // Assert
      expect(result.serviceZone.type).toBe('RADIUS');
      if (result.serviceZone.type === 'RADIUS') {
        expect(result.serviceZone.radiusKm).toBe(30);
      }
      expect(mockGeocodeAddress).not.toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-008-02: debe rechazar si usuario no es owner', async () => {
      // Arrange
      const userId = 'user-other-456';
      const profileId = 'profile-123';
      const updateData: UpdateLocationDTO = {
        radiusKm: 20,
      };

      mockProfileFindById.mockResolvedValue(mockProfile);

      // Act & Assert
      await expect(
        locationService.updateLocation(profileId, updateData, userId, UserRole.CONTRACTOR)
      ).rejects.toThrow('Solo el propietario o un admin');

      expect(mockRepositoryUpdate).not.toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-004-02: debe rechazar si ubicación no existe', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';
      const updateData: UpdateLocationDTO = {
        radiusKm: 20,
      };

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(null);

      // Act & Assert
      await expect(
        locationService.updateLocation(profileId, updateData, userId, UserRole.CONTRACTOR)
      ).rejects.toThrow('Ubicación para el perfil de contratista');

      expect(mockRepositoryUpdate).not.toHaveBeenCalled();
    });
  });

  describe('getLocation', () => {
    const mockProfile = {
      id: 'profile-123',
      userId: 'user-contractor-123',
      businessName: 'Test Business',
      description: 'Test description',
      specialties: ['plumbing'],
      verified: true,
      verificationDocuments: null,
      stripeConnectAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const fullLocation = {
      id: 'location-123',
      contractorProfileId: 'profile-123',
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
      geocodingStatus: 'SUCCESS',
      zoneType: 'RADIUS',
      radiusKm: 15,
      polygonCoordinates: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('TC-RF-CTR-LOC-009-02: debe devolver ubicación completa para owner', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(fullLocation);

      // Act
      const result = await locationService.getLocation(profileId, userId, UserRole.CONTRACTOR);

      // Assert
      expect(result).toBeDefined();
      expect('address' in result && result.address).toBeDefined();
      expect('address' in result && result.address?.street).toBe('Av. Insurgentes Sur');
      expect('address' in result && result.address?.interiorNumber).toBe('Piso 5');
      expect(result.coordinates?.latitude).toBe(19.432608);
      expect(result.coordinates?.longitude).toBe(-99.133209);
      expect('timezone' in result && result.timezone).toBe('America/Mexico_City');
    });

    it('TC-RF-CTR-LOC-009-03: debe devolver ubicación completa para admin', async () => {
      // Arrange
      const adminUserId = 'user-admin-789';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(fullLocation);

      // Act
      const result = await locationService.getLocation(profileId, adminUserId, UserRole.ADMIN);

      // Assert
      expect('address' in result && result.address).toBeDefined();
      expect('address' in result && result.address?.street).toBe('Av. Insurgentes Sur');
      expect(result.coordinates?.latitude).toBe(19.432608);
      expect('timezone' in result && result.timezone).toBe('America/Mexico_City');
    });

    it('TC-RF-CTR-LOC-010-01: debe devolver vista limitada para cliente', async () => {
      // Arrange
      const clientUserId = 'user-client-456';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(fullLocation);

      // Act
      const result = await locationService.getLocation(profileId, clientUserId, UserRole.CLIENT);

      // Assert
      expect('city' in result && result.city).toBe('Ciudad de México');
      expect('state' in result && result.state).toBe('CDMX');

      // Coordinates should be approximated (2 decimals)
      expect(result.coordinates?.latitude).toBe(19.43);
      expect(result.coordinates?.longitude).toBe(-99.13);

      // Should NOT include full address or timezone
      expect('address' in result && result.address).toBeUndefined();
      expect('timezone' in result && result.timezone).toBeUndefined();
    });

    it('TC-RF-CTR-LOC-010-02: debe devolver zona de servicio para todos los roles', async () => {
      // Arrange
      const clientUserId = 'user-client-456';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(fullLocation);

      // Act
      const result = await locationService.getLocation(profileId, clientUserId, UserRole.CLIENT);

      // Assert
      expect(result.serviceZone).toBeDefined();
      expect(result.serviceZone?.type).toBe('RADIUS');
      if (result.serviceZone?.type === 'RADIUS') {
        expect(result.serviceZone.radiusKm).toBe(15);
      }
    });

    it('TC-RF-CTR-LOC-004-03: debe rechazar si ubicación no existe', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(null);

      // Act & Assert
      await expect(
        locationService.getLocation(profileId, userId, UserRole.CONTRACTOR)
      ).rejects.toThrow('Ubicación para el perfil');
    });
  });
});
