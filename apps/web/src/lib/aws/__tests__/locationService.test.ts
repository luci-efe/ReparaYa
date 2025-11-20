/**
 * Unit tests for AWS Location Service client
 * Tests TC-RF-CTR-LOC-003, TC-RNF-CTR-LOC-005
 *
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import {
  LocationClient,
  SearchPlaceIndexForTextCommand,
  SearchPlaceIndexForPositionCommand,
  ThrottlingException,
  ValidationException,
} from '@aws-sdk/client-location';

// Import the module to test (will be created)
import { geocodeAddress, reverseGeocode } from '../locationService';
import type { AddressInput } from '@/modules/contractors/types/location';

// Create mock client
const locationClientMock = mockClient(LocationClient);

describe('AWS Location Service Client', () => {
  beforeEach(() => {
    locationClientMock.reset();
    // Clear any environment variable mocks
    process.env.AWS_LOCATION_PLACE_INDEX = 'reparaya-places';
    process.env.AWS_REGION = 'us-east-1';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('geocodeAddress', () => {
    const validAddress: AddressInput = {
      street: 'Av. Insurgentes Sur',
      exteriorNumber: '123',
      interiorNumber: 'Piso 5',
      neighborhood: 'Roma Norte',
      city: 'Ciudad de México',
      state: 'CDMX',
      postalCode: '06700',
      country: 'MX',
    };

    it('TC-RF-CTR-LOC-002-01: debe geocodificar dirección exitosamente con alta relevancia', async () => {
      // Arrange
      const mockResponse = {
        Results: [
          {
            Place: {
              Label: 'Avenida Insurgentes Sur 123, Colonia Roma Norte, Ciudad de México, CDMX 06700, México',
              Geometry: {
                Point: [-99.133209, 19.432608], // AWS returns [lng, lat]
              },
            },
            Relevance: 0.95,
          },
        ],
      };

      locationClientMock.on(SearchPlaceIndexForTextCommand).resolves(mockResponse);

      // Act
      const result = await geocodeAddress(validAddress);

      // Assert
      expect(result).toBeDefined();
      expect(result.latitude).toBe(19.432608);
      expect(result.longitude).toBe(-99.133209);
      expect(result.normalizedAddress).toBe(
        'Avenida Insurgentes Sur 123, Colonia Roma Norte, Ciudad de México, CDMX 06700, México'
      );
      expect(result.relevance).toBe(0.95);
      expect(result.timezone).toBe('America/Mexico_City');

      // Verify command was called with correct parameters
      const calls = locationClientMock.commandCalls(SearchPlaceIndexForTextCommand);
      expect(calls.length).toBe(1);
      expect(calls[0].args[0].input.IndexName).toBe('reparaya-places');
      expect(calls[0].args[0].input.Text).toContain('Av. Insurgentes Sur 123');
    });

    it('TC-RF-CTR-LOC-002-02: debe elegir resultado con mayor relevancia cuando hay múltiples', async () => {
      // Arrange
      const mockResponse = {
        Results: [
          {
            Place: {
              Label: 'Calle 5 de Mayo 10, Puebla, México',
              Geometry: { Point: [-98.2, 19.0] },
            },
            Relevance: 0.7,
          },
          {
            Place: {
              Label: 'Calle 5 de Mayo 10, Centro, Ciudad de México, México',
              Geometry: { Point: [-99.13, 19.43] },
            },
            Relevance: 0.85,
          },
          {
            Place: {
              Label: 'Calle 5 de Mayo, Guadalajara, México',
              Geometry: { Point: [-103.35, 20.67] },
            },
            Relevance: 0.6,
          },
        ],
      };

      locationClientMock.on(SearchPlaceIndexForTextCommand).resolves(mockResponse);

      const address = {
        ...validAddress,
        street: 'Calle 5 de Mayo',
        exteriorNumber: '10',
        neighborhood: undefined,
      };

      // Act
      const result = await geocodeAddress(address);

      // Assert
      expect(result.relevance).toBe(0.85);
      expect(result.latitude).toBe(19.43);
      expect(result.longitude).toBe(-99.13);
      expect(result.normalizedAddress).toContain('Centro, Ciudad de México');
    });

    it('TC-RF-CTR-LOC-002-03: debe rechazar resultado con relevancia baja (< 0.8)', async () => {
      // Arrange
      const mockResponse = {
        Results: [
          {
            Place: {
              Label: 'Some ambiguous address',
              Geometry: { Point: [-99.0, 19.0] },
            },
            Relevance: 0.65,
          },
        ],
      };

      locationClientMock.on(SearchPlaceIndexForTextCommand).resolves(mockResponse);

      // Act & Assert
      await expect(geocodeAddress(validAddress)).rejects.toThrow(
        'Geocoding result has low relevance (0.65). Address may be ambiguous.'
      );
    });

    it('TC-RF-CTR-LOC-003-01: debe manejar timeout de AWS con retry', async () => {
      // Arrange
      locationClientMock
        .on(SearchPlaceIndexForTextCommand)
        .rejectsOnce(new Error('TimeoutError'))
        .rejectsOnce(new Error('TimeoutError'))
        .resolves({
          Results: [
            {
              Place: {
                Label: 'Valid Address',
                Geometry: { Point: [-99.13, 19.43] },
              },
              Relevance: 0.9,
            },
          ],
        });

      // Act
      const result = await geocodeAddress(validAddress);

      // Assert
      expect(result).toBeDefined();
      expect(result.latitude).toBe(19.43);

      // Verify retry happened (3 calls total)
      const calls = locationClientMock.commandCalls(SearchPlaceIndexForTextCommand);
      expect(calls.length).toBe(3);
    });

    it('TC-RNF-CTR-LOC-005-01: debe reintentar en ThrottlingException', async () => {
      // Arrange
      const throttlingError = new ThrottlingException({
        message: 'Rate exceeded',
        $metadata: {},
      });

      locationClientMock
        .on(SearchPlaceIndexForTextCommand)
        .rejectsOnce(throttlingError)
        .resolves({
          Results: [
            {
              Place: {
                Label: 'Valid Address',
                Geometry: { Point: [-99.13, 19.43] },
              },
              Relevance: 0.9,
            },
          ],
        });

      // Act
      const result = await geocodeAddress(validAddress);

      // Assert
      expect(result).toBeDefined();
      const calls = locationClientMock.commandCalls(SearchPlaceIndexForTextCommand);
      expect(calls.length).toBe(2); // First failed, second succeeded
    });

    it('TC-RF-CTR-LOC-003-02: debe fallar después de 3 reintentos', async () => {
      // Arrange
      locationClientMock
        .on(SearchPlaceIndexForTextCommand)
        .rejects(new Error('Service unavailable'));

      // Act & Assert
      await expect(geocodeAddress(validAddress)).rejects.toThrow(
        'Geocoding service unavailable after 3 attempts'
      );

      // Verify 3 attempts were made
      const calls = locationClientMock.commandCalls(SearchPlaceIndexForTextCommand);
      expect(calls.length).toBe(3);
    });

    it('TC-RF-CTR-LOC-002-04: debe manejar ValidationException con mensaje claro', async () => {
      // Arrange
      const validationError = new ValidationException({
        message: 'Invalid address format',
        $metadata: {},
      });

      locationClientMock.on(SearchPlaceIndexForTextCommand).rejects(validationError);

      // Act & Assert
      await expect(geocodeAddress(validAddress)).rejects.toThrow('Invalid address format');
    });

    it('TC-RF-CTR-LOC-002-05: debe rechazar cuando no hay resultados', async () => {
      // Arrange
      locationClientMock.on(SearchPlaceIndexForTextCommand).resolves({
        Results: [],
      });

      // Act & Assert
      await expect(geocodeAddress(validAddress)).rejects.toThrow(
        'No geocoding results found for the provided address'
      );
    });

    it('TC-RF-CTR-LOC-002-06: debe construir query de texto correctamente', async () => {
      // Arrange
      locationClientMock.on(SearchPlaceIndexForTextCommand).resolves({
        Results: [
          {
            Place: {
              Label: 'Test Address',
              Geometry: { Point: [-99.13, 19.43] },
            },
            Relevance: 0.9,
          },
        ],
      });

      // Act
      await geocodeAddress(validAddress);

      // Assert
      const calls = locationClientMock.commandCalls(SearchPlaceIndexForTextCommand);
      const textQuery = calls[0].args[0].input.Text;

      expect(textQuery).toContain('Av. Insurgentes Sur 123');
      expect(textQuery).toContain('Roma Norte');
      expect(textQuery).toContain('Ciudad de México');
      expect(textQuery).toContain('CDMX');
      expect(textQuery).toContain('06700');
      expect(textQuery).toContain('MX');
    });

    it('TC-RF-CTR-LOC-002-07: debe manejar dirección sin número interior', async () => {
      // Arrange
      const addressWithoutInterior = {
        ...validAddress,
        interiorNumber: undefined,
      };

      locationClientMock.on(SearchPlaceIndexForTextCommand).resolves({
        Results: [
          {
            Place: {
              Label: 'Test Address',
              Geometry: { Point: [-99.13, 19.43] },
            },
            Relevance: 0.9,
          },
        ],
      });

      // Act
      const result = await geocodeAddress(addressWithoutInterior);

      // Assert
      expect(result).toBeDefined();
      const calls = locationClientMock.commandCalls(SearchPlaceIndexForTextCommand);
      const textQuery = calls[0].args[0].input.Text;
      expect(textQuery).not.toContain('Piso 5');
    });
  });

  describe('reverseGeocode', () => {
    it('TC-RF-CTR-LOC-002-08: debe obtener dirección desde coordenadas exitosamente', async () => {
      // Arrange
      const mockResponse = {
        Results: [
          {
            Place: {
              Label: 'Avenida Insurgentes Sur, Roma Norte, Ciudad de México, CDMX, México',
            },
          },
        ],
      };

      locationClientMock.on(SearchPlaceIndexForPositionCommand).resolves(mockResponse);

      // Act
      const result = await reverseGeocode(19.432608, -99.133209);

      // Assert
      expect(result).toBeDefined();
      expect(result.normalizedAddress).toBe(
        'Avenida Insurgentes Sur, Roma Norte, Ciudad de México, CDMX, México'
      );

      // Verify command was called with correct coordinates
      const calls = locationClientMock.commandCalls(SearchPlaceIndexForPositionCommand);
      expect(calls.length).toBe(1);
      expect(calls[0].args[0].input.Position).toEqual([-99.133209, 19.432608]); // [lng, lat]
    });

    it('TC-RF-CTR-LOC-002-09: debe manejar error de reverse geocoding', async () => {
      // Arrange
      locationClientMock
        .on(SearchPlaceIndexForPositionCommand)
        .rejects(new Error('Invalid coordinates'));

      // Act & Assert
      await expect(reverseGeocode(999, 999)).rejects.toThrow('Invalid coordinates');
    });

    it('TC-RF-CTR-LOC-002-10: debe manejar coordenadas sin resultados', async () => {
      // Arrange
      locationClientMock.on(SearchPlaceIndexForPositionCommand).resolves({
        Results: [],
      });

      // Act & Assert
      await expect(reverseGeocode(0, 0)).rejects.toThrow(
        'No reverse geocoding results found for coordinates'
      );
    });
  });

  describe('Configuration', () => {
    it('debe usar variables de entorno correctamente', async () => {
      // Arrange
      process.env.AWS_LOCATION_PLACE_INDEX = 'custom-index';

      locationClientMock.on(SearchPlaceIndexForTextCommand).resolves({
        Results: [
          {
            Place: {
              Label: 'Test',
              Geometry: { Point: [-99.13, 19.43] },
            },
            Relevance: 0.9,
          },
        ],
      });

      const validAddress: AddressInput = {
        street: 'Test St',
        exteriorNumber: '1',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'MX',
      };

      // Act
      await geocodeAddress(validAddress);

      // Assert
      const calls = locationClientMock.commandCalls(SearchPlaceIndexForTextCommand);
      expect(calls[0].args[0].input.IndexName).toBe('custom-index');
    });
  });
});
