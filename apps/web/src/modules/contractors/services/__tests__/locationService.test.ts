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

// Create the mock function BEFORE the mock declaration
const mockGeocodeAddressFn = jest.fn<any>();

// Setup mocks BEFORE any imports
jest.mock('@/lib/aws/locationService', () => ({
  __esModule: true,
  geocodeAddress: (...args: any[]) => mockGeocodeAddressFn(...args),
  GeocodingTimeoutError: class GeocodingTimeoutError extends Error {
    constructor(message = 'Geocoding service timeout') {
      super(message);
      this.name = 'GeocodingTimeoutError';
    }
  },
  InvalidAddressFormatError: class InvalidAddressFormatError extends Error {
    constructor(message = 'Invalid address format') {
      super(message);
      this.name = 'InvalidAddressFormatError';
    }
  },
  GeocodingServiceUnavailableError: class GeocodingServiceUnavailableError extends Error {
    constructor(message = 'Geocoding service unavailable') {
      super(message);
      this.name = 'GeocodingServiceUnavailableError';
    }
  },
}));

// Import service and dependencies AFTER mocks
import { locationService } from '../locationService';
import { locationRepository } from '../../repositories/locationRepository';
import { contractorProfileRepository } from '../../repositories/contractorProfileRepository';

// Use the mock function we created
const mockGeocodeAddress = mockGeocodeAddressFn;

describe('LocationService', () => {
  // Mock repository methods
  let mockRepositoryCreate: ReturnType<typeof jest.spyOn>;
  let mockRepositoryFindByContractorProfileId: ReturnType<typeof jest.spyOn>;
  let mockRepositoryUpdate: ReturnType<typeof jest.spyOn>;
  let _mockRepositoryDelete: ReturnType<typeof jest.spyOn>;

  let mockProfileFindById: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
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
      const result = await locationService.createLocation(userId, profileId, validCreateData);

      // Assert
      expect(result).toHaveProperty('id', 'location-123');
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
      const result = await locationService.createLocation(userId, profileId, validCreateData);

      // Assert
      expect(result.geocodingStatus).toBe('FAILED');
      expect(result.coordinates).toBeNull();
      expect(result.normalizedAddress).toBeNull();
      expect(mockRepositoryCreate).toHaveBeenCalledWith(
        profileId,
        expect.objectContaining({
          ...validCreateData,
          geocodingStatus: 'FAILED',
        })
      );
    });

    it('TC-RF-CTR-LOC-005-01: debe rechazar si perfil está verificado', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';
      const verifiedProfile = { ...mockProfile, verified: true };

      mockProfileFindById.mockResolvedValue(verifiedProfile);

      // Act & Assert
      await expect(
        locationService.createLocation(userId, profileId, validCreateData)
      ).rejects.toThrow('no puede modificar su ubicación');
    });

    it('TC-RF-CTR-LOC-001-02: debe rechazar si ubicación ya existe', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue({
        id: 'existing-location',
        contractorProfileId: profileId,
        ...validCreateData,
        baseLatitude: 0,
        baseLongitude: 0,
        normalizedAddress: '',
        timezone: '',
        geocodingStatus: 'SUCCESS' as const,
        polygonCoordinates: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act & Assert
      await expect(
        locationService.createLocation(userId, profileId, validCreateData)
      ).rejects.toThrow('ya tiene una ubicación registrada');
    });

    it('TC-RF-CTR-LOC-008-01: debe rechazar si usuario no es el owner', async () => {
      // Arrange
      const userId = 'different-user-id';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);

      // Act & Assert
      await expect(
        locationService.createLocation(userId, profileId, validCreateData)
      ).rejects.toThrow('No tienes permiso');
    });

    it('TC-RF-CTR-LOC-001-03: debe validar datos con Zod antes de crear', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';
      const invalidData = { ...validCreateData, street: '' }; // Invalid: empty street

      // Act & Assert
      await expect(
        locationService.createLocation(userId, profileId, invalidData as CreateLocationDTO)
      ).rejects.toThrow();
    });

    it('TC-RF-CTR-LOC-001-04: debe rechazar si perfil no existe', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'non-existent-profile';

      mockProfileFindById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        locationService.createLocation(userId, profileId, validCreateData)
      ).rejects.toThrow('Perfil de contratista no encontrado');
    });
  });

  describe('updateLocation', () => {
    const updateData: UpdateLocationDTO = {
      radiusKm: 20,
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

    const existingLocation = {
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
      normalizedAddress: 'Test Address',
      timezone: 'America/Mexico_City',
      geocodingStatus: 'SUCCESS' as const,
      radiusKm: 15,
      polygonCoordinates: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('TC-RF-CTR-LOC-004-01: debe actualizar ubicación en perfil DRAFT', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(existingLocation);
      mockRepositoryUpdate.mockResolvedValue({
        ...existingLocation,
        radiusKm: 20,
      });

      // Act
      const result = await locationService.updateLocation(userId, profileId, updateData);

      // Assert
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
      const verifiedProfile = { ...mockProfile, verified: true };

      mockProfileFindById.mockResolvedValue(verifiedProfile);

      // Act & Assert
      await expect(
        locationService.updateLocation(userId, profileId, updateData)
      ).rejects.toThrow('no puede modificar su ubicación');
    });

    it('TC-RF-CTR-LOC-009-01: debe permitir a admin actualizar perfil verificado', async () => {
      // Arrange
      const adminUserId = 'admin-user-123';
      const profileId = 'profile-123';
      const verifiedProfile = { ...mockProfile, verified: true };

      mockProfileFindById.mockResolvedValue(verifiedProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(existingLocation);
      mockRepositoryUpdate.mockResolvedValue({
        ...existingLocation,
        radiusKm: 20,
      });

      // Act
      const result = await locationService.updateLocation(
        adminUserId,
        profileId,
        updateData,
        UserRole.ADMIN
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockRepositoryUpdate).toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-011-01: debe re-geocodificar cuando cambia dirección', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';
      const addressUpdate: UpdateLocationDTO = {
        city: 'Monterrey',
        state: 'Nuevo León',
      };

      const newGeocodingResult = {
        latitude: 25.686613,
        longitude: -100.316113,
        normalizedAddress: 'Nueva dirección',
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
        baseLatitude: newGeocodingResult.latitude,
        baseLongitude: newGeocodingResult.longitude,
        normalizedAddress: newGeocodingResult.normalizedAddress,
        timezone: newGeocodingResult.timezone,
        geocodingStatus: 'SUCCESS' as const,
      });

      // Act
      const result = await locationService.updateLocation(userId, profileId, addressUpdate);

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
      const zoneUpdate: UpdateLocationDTO = {
        radiusKm: 30,
      };

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(existingLocation);
      mockRepositoryUpdate.mockResolvedValue({
        ...existingLocation,
        radiusKm: 30,
      });

      // Act
      const result = await locationService.updateLocation(userId, profileId, zoneUpdate);

      // Assert
      expect(result.serviceZone.type).toBe('RADIUS');
      if (result.serviceZone.type === 'RADIUS') {
        expect(result.serviceZone.radiusKm).toBe(30);
      }
      expect(mockGeocodeAddress).not.toHaveBeenCalled();
    });

    it('TC-RF-CTR-LOC-008-02: debe rechazar si usuario no es owner', async () => {
      // Arrange
      const userId = 'different-user-id';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);

      // Act & Assert
      await expect(
        locationService.updateLocation(userId, profileId, updateData)
      ).rejects.toThrow('No tienes permiso');
    });

    it('TC-RF-CTR-LOC-004-02: debe rechazar si ubicación no existe', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      mockProfileFindById.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(null);

      // Act & Assert
      await expect(
        locationService.updateLocation(userId, profileId, updateData)
      ).rejects.toThrow('Ubicación no encontrada');
    });
  });

  describe('getLocation', () => {
    const existingLocation = {
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
      normalizedAddress: 'Test Address',
      timezone: 'America/Mexico_City',
      geocodingStatus: 'SUCCESS' as const,
      radiusKm: 15,
      polygonCoordinates: null,
      createdAt: new Date(),
      updatedAt: new Date(),
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

    let mockProfileFindByIdForGet: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
      mockProfileFindByIdForGet = jest.spyOn(contractorProfileRepository, 'findById');
    });

    it('TC-RF-CTR-LOC-009-02: debe devolver ubicación completa para owner', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      mockProfileFindByIdForGet.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(existingLocation);

      // Act
      const result = await locationService.getLocation(userId, profileId);

      // Assert
      expect(result).toHaveProperty('address');
      expect(result.address.street).toBe('Av. Insurgentes Sur');
      expect(result).toHaveProperty('coordinates');
      expect(result).toHaveProperty('normalizedAddress');
      expect(result).toHaveProperty('timezone');
    });

    it('TC-RF-CTR-LOC-009-03: debe devolver ubicación completa para admin', async () => {
      // Arrange
      const adminUserId = 'admin-user-123';
      const profileId = 'profile-123';

      mockProfileFindByIdForGet.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(existingLocation);

      // Act
      const result = await locationService.getLocation(adminUserId, profileId, UserRole.ADMIN);

      // Assert
      expect(result).toHaveProperty('address');
      expect(result.address.street).toBe('Av. Insurgentes Sur');
    });

    it('TC-RF-CTR-LOC-010-01: debe devolver vista limitada para cliente', async () => {
      // Arrange
      const clientUserId = 'client-user-123';
      const profileId = 'profile-123';

      mockProfileFindByIdForGet.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(existingLocation);

      // Act
      const result = await locationService.getLocation(clientUserId, profileId, UserRole.CLIENT);

      // Assert - Public view should not have full address
      expect(result).not.toHaveProperty('address');
      expect(result).toHaveProperty('city');
      expect(result).toHaveProperty('state');
    });

    it('TC-RF-CTR-LOC-010-02: debe devolver zona de servicio para todos los roles', async () => {
      // Arrange
      const profileId = 'profile-123';

      mockProfileFindByIdForGet.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(existingLocation);

      // Act - Test with different roles
      const ownerResult = await locationService.getLocation('user-contractor-123', profileId);
      const clientResult = await locationService.getLocation('client-123', profileId, UserRole.CLIENT);

      // Assert
      expect(ownerResult.serviceZone).toBeDefined();
      expect(clientResult.serviceZone).toBeDefined();
    });

    it('TC-RF-CTR-LOC-004-03: debe rechazar si ubicación no existe', async () => {
      // Arrange
      const userId = 'user-contractor-123';
      const profileId = 'profile-123';

      mockProfileFindByIdForGet.mockResolvedValue(mockProfile);
      mockRepositoryFindByContractorProfileId.mockResolvedValue(null);

      // Act & Assert
      await expect(
        locationService.getLocation(userId, profileId)
      ).rejects.toThrow('Ubicación no encontrada');
    });
  });
});
