import type { GeocodingStatus, ServiceZoneType } from '@prisma/client';

/**
 * Tipos de dominio para ubicación y zona de operación de contratistas
 */

/**
 * Configuración de zona de servicio (discriminated union)
 */
export type ServiceZoneConfig =
  | {
      type: 'RADIUS';
      radiusKm: number;
    }
  | {
      type: 'POLYGON';
      polygonCoordinates: Array<{ lat: number; lng: number }>;
    };

/**
 * Coordenadas geográficas
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Dirección estructurada
 */
export interface Address {
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * DTO completo de ubicación (para owner y admin)
 */
export interface LocationResponseDTO {
  id: string;
  contractorProfileId: string;
  address: Address;
  coordinates: Coordinates | null;
  normalizedAddress: string | null;
  timezone: string | null;
  geocodingStatus: GeocodingStatus;
  serviceZone: ServiceZoneConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO limitado de ubicación (para clientes - sin dirección exacta)
 */
export interface PublicLocationResponseDTO {
  city: string;
  state: string;
  coordinates: {
    latitude: number; // Aproximado a 2 decimales (~1km precisión)
    longitude: number; // Aproximado a 2 decimales
  } | null;
  serviceZone: ServiceZoneConfig;
}

/**
 * DTO para crear ubicación (flat structure - matches validator)
 */
export interface CreateLocationDTO {
  // Address fields
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  // Service zone fields
  zoneType: 'RADIUS' | 'POLYGON';
  radiusKm: number;
  polygonCoordinates?: Array<{ lat: number; lng: number }>;
}

/**
 * DTO para actualizar ubicación (flat structure - all optional)
 */
export interface UpdateLocationDTO {
  // Address fields (optional)
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  // Service zone fields (optional)
  zoneType?: 'RADIUS' | 'POLYGON';
  radiusKm?: number;
  polygonCoordinates?: Array<{ lat: number; lng: number }>;
}

/**
 * Input para repositorio (datos crudos de Prisma)
 */
export interface LocationCreateInput {
  contractorProfileId: string;
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  baseLatitude?: number;
  baseLongitude?: number;
  normalizedAddress?: string;
  timezone?: string;
  geocodingStatus: GeocodingStatus;
  zoneType: ServiceZoneType;
  radiusKm?: number;
  polygonCoordinates?: unknown;
}

/**
 * Input para actualización en repositorio
 */
export interface LocationUpdateInput {
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  baseLatitude?: number;
  baseLongitude?: number;
  normalizedAddress?: string;
  timezone?: string;
  geocodingStatus?: GeocodingStatus;
  zoneType?: ServiceZoneType;
  radiusKm?: number;
  polygonCoordinates?: unknown;
}
