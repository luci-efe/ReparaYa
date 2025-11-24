import {
  LocationClient,
  SearchPlaceIndexForTextCommand,
  SearchPlaceIndexForPositionCommand,
} from '@aws-sdk/client-location';
import { find as findTimezone } from 'geo-tz';

/**
 * Cliente AWS Location Service para geocodificación
 *
 * Configuración requerida en .env:
 * - AWS_REGION
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_LOCATION_PLACE_INDEX
 */

const locationClient = new LocationClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Helper function to get the place index name (allows dynamic env var changes in tests)
function getPlaceIndex(): string {
  return process.env.AWS_LOCATION_PLACE_INDEX || 'reparaya-places';
}

const GEOCODING_TIMEOUT = 5000; // 5 segundos
const MAX_RETRIES = 3;
const MIN_RELEVANCE = 0.8;

/**
 * Input para geocodificación
 */
export interface AddressInput {
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
 * Resultado de geocodificación exitosa
 */
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  normalizedAddress: string;
  timezone: string;
  relevance: number;
}

/**
 * Resultado de geocodificación inversa
 */
export interface ReverseGeocodingResult {
  normalizedAddress: string;
  city: string;
  state: string;
  country: string;
}

/**
 * Errores personalizados
 */
export class GeocodingTimeoutError extends Error {
  constructor(message = 'Geocoding service timeout') {
    super(message);
    this.name = 'GeocodingTimeoutError';
  }
}

export class InvalidAddressFormatError extends Error {
  constructor(message = 'Invalid address format') {
    super(message);
    this.name = 'InvalidAddressFormatError';
  }
}

export class GeocodingServiceUnavailableError extends Error {
  constructor(message = 'Geocoding service unavailable') {
    super(message);
    this.name = 'GeocodingServiceUnavailableError';
  }
}

/**
 * Sleep utility para retry con exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Construye el texto de búsqueda para AWS Location Service
 */
function buildSearchText(address: AddressInput): string {
  const parts: string[] = [];

  parts.push(`${address.street} ${address.exteriorNumber}`);

  if (address.interiorNumber) {
    parts.push(address.interiorNumber);
  }

  if (address.neighborhood) {
    parts.push(address.neighborhood);
  }

  parts.push(address.city);
  parts.push(address.state);
  parts.push(address.postalCode);
  parts.push(address.country);

  return parts.join(', ');
}

/**
 * Infiere timezone por coordenadas usando la librería geo-tz
 */
function inferTimezone(latitude: number, longitude: number): string {
  try {
    const timezones = findTimezone(latitude, longitude);
    return timezones[0] || 'America/Mexico_City';
  } catch (error) {
    console.error('Error inferring timezone:', error);
    // Fallback para otros países
    return 'America/Mexico_City';
  }
}

/**
 * Geocodifica una dirección usando AWS Location Service
 *
 * Características:
 * - Timeout de 5 segundos
 * - Retry con exponential backoff (3 intentos)
 * - Valida relevance >= 0.8
 * - Si múltiples resultados, elige el de mayor relevance
 *
 * @throws GeocodingTimeoutError si el servicio no responde a tiempo
 * @throws InvalidAddressFormatError si AWS rechaza la dirección
 * @throws GeocodingServiceUnavailableError si el servicio falla después de retries
 */
export async function geocodeAddress(address: AddressInput): Promise<GeocodingResult> {
  const searchText = buildSearchText(address);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT);

      const command = new SearchPlaceIndexForTextCommand({
        IndexName: getPlaceIndex(),
        Text: searchText,
        MaxResults: 5,
      });

      // Ejecutar comando con timeout
      const response = await Promise.race([
        locationClient.send(command),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new GeocodingTimeoutError());
          });
        }),
      ]);

      clearTimeout(timeoutId);

      // Validar que hay resultados
      if (!response.Results || response.Results.length === 0) {
        throw new InvalidAddressFormatError('No geocoding results found for the provided address');
      }

      // Filtrar por relevance >= MIN_RELEVANCE
      const relevantResults = response.Results.filter(
        (result) => (result.Relevance ?? 0) >= MIN_RELEVANCE
      );

      if (relevantResults.length === 0) {
        const actualRelevance = response.Results[0]?.Relevance ?? 0;
        throw new InvalidAddressFormatError(
          `Geocoding result has low relevance (${actualRelevance}). Address may be ambiguous.`
        );
      }

      // Elegir el de mayor relevance
      const bestResult = relevantResults.reduce((prev, current) =>
        (current.Relevance ?? 0) > (prev.Relevance ?? 0) ? current : prev
      );

      const place = bestResult.Place;
      if (!place || !place.Geometry?.Point) {
        throw new InvalidAddressFormatError('Resultado de geocodificación inválido');
      }

      const [longitude, latitude] = place.Geometry.Point;

      // Construir dirección normalizada
      const normalizedAddress = place.Label || searchText;

      // Inferir timezone
      const timezone = inferTimezone(latitude, longitude);

      console.log(`[Geocoding] Éxito en intento ${attempt}/${MAX_RETRIES}`, {
        searchText,
        latitude,
        longitude,
        relevance: bestResult.Relevance,
      });

      return {
        latitude,
        longitude,
        normalizedAddress,
        timezone,
        relevance: bestResult.Relevance ?? 0,
      };
    } catch (error) {
      lastError = error as Error;

      // Si es error de validación o timeout, no reintentar
      if (
        error instanceof InvalidAddressFormatError ||
        error instanceof GeocodingTimeoutError
      ) {
        throw error;
      }

      // Si es ValidationException de AWS, no reintentar
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'ValidationException'
      ) {
        throw error;
      }

      // Si es ThrottlingException de AWS, reintentar con backoff
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'ThrottlingException'
      ) {
        console.warn(`[Geocoding] ThrottlingException en intento ${attempt}/${MAX_RETRIES}. Reintentando...`);

        if (attempt < MAX_RETRIES) {
          // Exponential backoff: 1s, 2s, 4s
          await sleep(Math.pow(2, attempt - 1) * 1000);
          continue;
        }
      }

      // Otros errores
      console.error(`[Geocoding] Error en intento ${attempt}/${MAX_RETRIES}:`, error);

      if (attempt < MAX_RETRIES) {
        await sleep(1000 * attempt);
        continue;
      }
    }
  }

  // Si llegamos aquí, fallaron todos los intentos
  const errorMessage = lastError
    ? `Geocoding service unavailable after ${MAX_RETRIES} attempts. Last error: ${lastError.message}`
    : `Geocoding service unavailable after ${MAX_RETRIES} attempts`;

  throw new GeocodingServiceUnavailableError(errorMessage);
}

/**
 * Geocodificación inversa: obtiene dirección desde coordenadas
 *
 * @throws GeocodingServiceUnavailableError si el servicio falla
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodingResult> {
  try {
    const command = new SearchPlaceIndexForPositionCommand({
      IndexName: getPlaceIndex(),
      Position: [longitude, latitude],
      MaxResults: 1,
    });

    const response = await locationClient.send(command);

    if (!response.Results || response.Results.length === 0) {
      throw new Error('No reverse geocoding results found for coordinates');
    }

    const place = response.Results[0].Place;
    if (!place) {
      throw new Error('Invalid reverse geocoding result');
    }

    return {
      normalizedAddress: place.Label || '',
      city: place.Municipality || '',
      state: place.Region || '',
      country: place.Country || '',
    };
  } catch (error) {
    console.error('[ReverseGeocoding] Error:', error);
    // Re-throw the original error to preserve the message
    throw error;
  }
}
