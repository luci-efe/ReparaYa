import { geocodeAddress } from '@/lib/aws/locationService';
import type { AddressInput as AWSAddressInput } from '@/lib/aws/locationService';
import {
  GeocodingTimeoutError,
  InvalidAddressFormatError,
  GeocodingServiceUnavailableError,
} from '@/lib/aws/locationService';
import { locationRepository } from '../repositories/locationRepository';
import { contractorProfileRepository } from '../repositories/contractorProfileRepository';
import {
  LocationNotFoundError,
  LocationAlreadyExistsError,
  ContractorProfileNotFoundError,
  InvalidVerificationStatusError,
  UnauthorizedContractorActionError,
} from '../errors';
import type {
  CreateLocationDTO,
  UpdateLocationDTO,
  LocationResponseDTO,
  PublicLocationResponseDTO,
  Address,
  ServiceZoneConfig,
  Coordinates,
  LocationCreateInput,
  LocationUpdateInput,
} from '../types/location';
import type { UserRole } from '@prisma/client';

/**
 * Servicio de dominio para gestión de ubicación de contratistas
 */
export const locationService = {
  /**
   * Crear ubicación para un contratista
   *
   * Reglas de negocio:
   * - Solo el owner del perfil puede crear su ubicación
   * - El perfil debe estar en estado DRAFT (verified: false)
   * - Un contratista solo puede tener una ubicación (1:1)
   * - Se intenta geocodificar automáticamente con AWS Location Service
   * - Si geocodificación falla, se guarda con status FAILED (permite editar después)
   *
   * @param contractorProfileId - ID del perfil de contratista
   * @param data - Datos de ubicación y zona de operación
   * @param userId - ID del usuario autenticado (para validar ownership)
   */
  async createLocation(
    contractorProfileId: string,
    data: CreateLocationDTO,
    userId: string
  ): Promise<LocationResponseDTO> {
    // Validar que el perfil existe y el usuario es owner
    const profile = await contractorProfileRepository.findById(contractorProfileId);
    if (!profile) {
      throw new ContractorProfileNotFoundError(contractorProfileId);
    }

    if (profile.userId !== userId) {
      throw new UnauthorizedContractorActionError(
        'Solo el propietario del perfil puede crear su ubicación'
      );
    }

    // Validar que el perfil está en estado DRAFT
    if (profile.verified) {
      throw new InvalidVerificationStatusError(
        'Solo se puede crear ubicación en perfiles en estado DRAFT (no verificados)'
      );
    }

    // Validar que no existe ubicación previa
    const existingLocation = await locationRepository.findByContractorProfileId(
      contractorProfileId
    );
    if (existingLocation) {
      throw new LocationAlreadyExistsError(contractorProfileId);
    }

    // Intentar geocodificar la dirección
    let geocodingResult: {
      latitude?: number;
      longitude?: number;
      normalizedAddress?: string;
      timezone?: string;
      status: 'PENDING' | 'SUCCESS' | 'FAILED';
    };

    try {
      const addressInput: AWSAddressInput = {
        street: data.street,
        exteriorNumber: data.exteriorNumber,
        interiorNumber: data.interiorNumber,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
      };

      const result = await geocodeAddress(addressInput);

      geocodingResult = {
        latitude: result.latitude,
        longitude: result.longitude,
        normalizedAddress: result.normalizedAddress,
        timezone: result.timezone,
        status: 'SUCCESS',
      };

      console.log('[LocationService] Geocodificación exitosa:', {
        contractorProfileId,
        latitude: result.latitude,
        longitude: result.longitude,
      });
    } catch (error) {
      // Si falla la geocodificación, guardar con status FAILED
      // pero permitir que el registro se complete
      console.error('[LocationService] Geocodificación fallida:', error);

      geocodingResult = {
        status: 'FAILED',
      };

      if (
        error instanceof GeocodingTimeoutError ||
        error instanceof InvalidAddressFormatError ||
        error instanceof GeocodingServiceUnavailableError
      ) {
        // Errores esperados - continuar con status FAILED
      } else {
        // Error inesperado - también continuar pero loguear
        console.error('[LocationService] Error inesperado en geocodificación:', error);
      }
    }

    // Preparar datos para crear en BD
    const createData: LocationCreateInput = {
      contractorProfileId,
      street: data.street,
      exteriorNumber: data.exteriorNumber,
      interiorNumber: data.interiorNumber,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode,
      country: data.country,
      baseLatitude: geocodingResult.latitude,
      baseLongitude: geocodingResult.longitude,
      normalizedAddress: geocodingResult.normalizedAddress,
      timezone: geocodingResult.timezone,
      geocodingStatus: geocodingResult.status,
      zoneType: data.zoneType,
      radiusKm: data.zoneType === 'RADIUS' ? data.radiusKm : undefined,
      polygonCoordinates:
        data.zoneType === 'POLYGON' ? data.polygonCoordinates : undefined,
    };

    // Crear ubicación en BD
    const location = await locationRepository.create(createData);

    // Transformar a DTO de respuesta
    return this.toLocationResponseDTO(location);
  },

  /**
   * Actualizar ubicación existente
   *
   * Reglas de negocio:
   * - Solo el owner puede actualizar (o ADMIN)
   * - Si perfil está ACTIVE, solo ADMIN puede editar
   * - Si cambia la dirección, re-geocodificar
   * - Si solo cambia la zona, no re-geocodificar
   */
  async updateLocation(
    contractorProfileId: string,
    data: UpdateLocationDTO,
    userId: string,
    userRole: UserRole
  ): Promise<LocationResponseDTO> {
    // Validar que el perfil existe
    const profile = await contractorProfileRepository.findById(contractorProfileId);
    if (!profile) {
      throw new ContractorProfileNotFoundError(contractorProfileId);
    }

    // Validar ownership
    const isOwner = profile.userId === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new UnauthorizedContractorActionError('Solo el propietario o un admin pueden editar la ubicación');
    }

    // Si el perfil está ACTIVE, solo admin puede editar
    if (profile.verified && !isAdmin) {
      throw new InvalidVerificationStatusError(
        'Solo un administrador puede editar la ubicación de un perfil verificado (ACTIVE)'
      );
    }

    // Obtener ubicación actual
    const currentLocation = await locationRepository.findByContractorProfileId(contractorProfileId);
    if (!currentLocation) {
      throw new LocationNotFoundError(contractorProfileId);
    }

    // Determinar si cambió la dirección (para re-geocodificar)
    const addressChanged =
      (data.street && data.street !== currentLocation.street) ||
      (data.exteriorNumber && data.exteriorNumber !== currentLocation.exteriorNumber) ||
      (data.city && data.city !== currentLocation.city) ||
      (data.state && data.state !== currentLocation.state) ||
      (data.postalCode && data.postalCode !== currentLocation.postalCode);

    const updateData: LocationUpdateInput = {};

    // Si cambió algún campo de dirección, actualizar
    if (data.street !== undefined) updateData.street = data.street;
    if (data.exteriorNumber !== undefined) updateData.exteriorNumber = data.exteriorNumber;
    if (data.interiorNumber !== undefined) updateData.interiorNumber = data.interiorNumber;
    if (data.neighborhood !== undefined) updateData.neighborhood = data.neighborhood;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    if (data.country !== undefined) updateData.country = data.country;

    // Si cambió la dirección, re-geocodificar
    if (addressChanged) {
      try {
        const addressInput: AWSAddressInput = {
          street: data.street ?? currentLocation.street,
          exteriorNumber: data.exteriorNumber ?? currentLocation.exteriorNumber,
          interiorNumber: data.interiorNumber ?? currentLocation.interiorNumber ?? undefined,
          neighborhood: data.neighborhood ?? currentLocation.neighborhood ?? undefined,
          city: data.city ?? currentLocation.city,
          state: data.state ?? currentLocation.state,
          postalCode: data.postalCode ?? currentLocation.postalCode,
          country: data.country ?? currentLocation.country,
        };

          const result = await geocodeAddress(addressInput);

          updateData.baseLatitude = result.latitude;
          updateData.baseLongitude = result.longitude;
          updateData.normalizedAddress = result.normalizedAddress;
          updateData.timezone = result.timezone;
          updateData.geocodingStatus = 'SUCCESS';

          console.log('[LocationService] Re-geocodificación exitosa en actualización:', {
            contractorProfileId,
            latitude: result.latitude,
            longitude: result.longitude,
          });
        } catch (error) {
          console.error('[LocationService] Re-geocodificación fallida en actualización:', error);

          // Marcar como FAILED pero permitir actualización
          updateData.geocodingStatus = 'FAILED';
          updateData.baseLatitude = undefined;
          updateData.baseLongitude = undefined;
        }
    }

    // Si cambió la zona de operación, actualizar
    if (data.zoneType !== undefined) {
      updateData.zoneType = data.zoneType;
    }
    if (data.radiusKm !== undefined) {
      updateData.radiusKm = data.radiusKm;
    }
    if (data.polygonCoordinates !== undefined) {
      updateData.polygonCoordinates = data.polygonCoordinates as unknown;
    }

    // Actualizar en BD
    const updatedLocation = await locationRepository.update(contractorProfileId, updateData);

    return this.toLocationResponseDTO(updatedLocation);
  },

  /**
   * Obtener ubicación con filtro de privacidad según rol
   *
   * - Owner y ADMIN: ven todo
   * - CLIENT: solo ciudad, estado, coordenadas aproximadas, zona
   */
  async getLocation(
    contractorProfileId: string,
    requestorUserId: string,
    requestorRole: UserRole
  ): Promise<LocationResponseDTO | PublicLocationResponseDTO> {
    // Validar que el perfil existe
    const profile = await contractorProfileRepository.findById(contractorProfileId);
    if (!profile) {
      throw new ContractorProfileNotFoundError(contractorProfileId);
    }

    const location = await locationRepository.findByContractorProfileId(contractorProfileId);
    if (!location) {
      throw new LocationNotFoundError(contractorProfileId);
    }

    // Determinar nivel de acceso
    const isOwner = profile.userId === requestorUserId;
    const isAdmin = requestorRole === 'ADMIN';

    if (isOwner || isAdmin) {
      // Acceso completo
      return this.toLocationResponseDTO(location);
    } else {
      // Acceso limitado (público)
      return this.toPublicLocationResponseDTO(location);
    }
  },

  /**
   * Transforma modelo de Prisma a DTO completo
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toLocationResponseDTO(location: any): LocationResponseDTO {
    const address: Address = {
      street: location.street,
      exteriorNumber: location.exteriorNumber,
      interiorNumber: location.interiorNumber ?? undefined,
      neighborhood: location.neighborhood ?? undefined,
      city: location.city,
      state: location.state,
      postalCode: location.postalCode,
      country: location.country,
    };

    const coordinates: Coordinates | null =
      location.baseLatitude && location.baseLongitude
        ? {
            latitude: Number(location.baseLatitude),
            longitude: Number(location.baseLongitude),
          }
        : null;

    const serviceZone: ServiceZoneConfig =
      location.zoneType === 'RADIUS'
        ? {
            type: 'RADIUS',
            radiusKm: location.radiusKm,
          }
        : {
            type: 'POLYGON',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            polygonCoordinates: location.polygonCoordinates as any,
          };

    return {
      id: location.id,
      contractorProfileId: location.contractorProfileId,
      address,
      coordinates,
      normalizedAddress: location.normalizedAddress,
      timezone: location.timezone,
      geocodingStatus: location.geocodingStatus,
      serviceZone,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  },

  /**
   * Transforma modelo de Prisma a DTO público (limitado)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toPublicLocationResponseDTO(location: any): PublicLocationResponseDTO {
    const coordinates =
      location.baseLatitude && location.baseLongitude
        ? {
            // Aproximar a 2 decimales (~1km precisión)
            latitude: Math.round(Number(location.baseLatitude) * 100) / 100,
            longitude: Math.round(Number(location.baseLongitude) * 100) / 100,
          }
        : null;

    const serviceZone: ServiceZoneConfig =
      location.zoneType === 'RADIUS'
        ? {
            type: 'RADIUS',
            radiusKm: location.radiusKm,
          }
        : {
            type: 'POLYGON',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            polygonCoordinates: location.polygonCoordinates as any,
          };

    return {
      city: location.city,
      state: location.state,
      coordinates,
      serviceZone,
    };
  },
};
