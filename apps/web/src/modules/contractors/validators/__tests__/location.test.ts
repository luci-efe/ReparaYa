/**
 * Unit tests for location validators
 * Tests TC-RF-CTR-LOC-006, TC-RF-CTR-LOC-007
 *
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';

// Import validators (will be created)
import {
  addressSchema,
  serviceZoneSchema,
  createLocationSchema,
  updateLocationSchema,
} from '../location';

describe('Location Validators', () => {
  describe('addressSchema', () => {
    it('TC-RF-CTR-LOC-001-01: debe validar dirección completa exitosamente', () => {
      // Arrange
      const validAddress = {
        street: 'Av. Insurgentes Sur',
        exteriorNumber: '123',
        interiorNumber: 'Piso 5',
        neighborhood: 'Roma Norte',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '06700',
        country: 'MX',
      };

      // Act
      const result = addressSchema.parse(validAddress);

      // Assert
      expect(result).toEqual(validAddress);
    });

    it('TC-RF-CTR-LOC-001-02: debe validar dirección sin interiorNumber', () => {
      // Arrange
      const addressWithoutInterior = {
        street: 'Calle Morelos',
        exteriorNumber: '456',
        city: 'Monterrey',
        state: 'Nuevo León',
        postalCode: '64000',
        country: 'MX',
      };

      // Act
      const result = addressSchema.parse(addressWithoutInterior);

      // Assert
      expect(result).toBeDefined();
      expect(result.interiorNumber).toBeUndefined();
    });

    it('TC-RF-CTR-LOC-001-03: debe validar dirección sin neighborhood', () => {
      // Arrange
      const addressWithoutNeighborhood = {
        street: 'Av. Reforma',
        exteriorNumber: '100',
        city: 'Guadalajara',
        state: 'Jalisco',
        postalCode: '44100',
        country: 'MX',
      };

      // Act
      const result = addressSchema.parse(addressWithoutNeighborhood);

      // Assert
      expect(result).toBeDefined();
      expect(result.neighborhood).toBeUndefined();
    });

    it('TC-RF-CTR-LOC-001-04: debe rechazar calle vacía', () => {
      // Arrange
      const invalidAddress = {
        street: '',
        exteriorNumber: '123',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06700',
        country: 'MX',
      };

      // Act & Assert
      expect(() => addressSchema.parse(invalidAddress)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-001-05: debe rechazar calle muy corta (< 3 caracteres)', () => {
      // Arrange
      const invalidAddress = {
        street: 'AB',
        exteriorNumber: '123',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06700',
        country: 'MX',
      };

      // Act & Assert
      expect(() => addressSchema.parse(invalidAddress)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-001-06: debe rechazar calle muy larga (> 200 caracteres)', () => {
      // Arrange
      const invalidAddress = {
        street: 'A'.repeat(201),
        exteriorNumber: '123',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06700',
        country: 'MX',
      };

      // Act & Assert
      expect(() => addressSchema.parse(invalidAddress)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-001-07: debe rechazar código postal inválido (no 5 dígitos para MX)', () => {
      // Arrange
      const invalidAddress = {
        street: 'Av. Test',
        exteriorNumber: '123',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '123', // Solo 3 dígitos
        country: 'MX',
      };

      // Act & Assert
      expect(() => addressSchema.parse(invalidAddress)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-001-08: debe rechazar código postal con letras', () => {
      // Arrange
      const invalidAddress = {
        street: 'Av. Test',
        exteriorNumber: '123',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: 'ABC12',
        country: 'MX',
      };

      // Act & Assert
      expect(() => addressSchema.parse(invalidAddress)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-001-09: debe rechazar ciudad vacía', () => {
      // Arrange
      const invalidAddress = {
        street: 'Av. Test',
        exteriorNumber: '123',
        city: '',
        state: 'CDMX',
        postalCode: '06700',
        country: 'MX',
      };

      // Act & Assert
      expect(() => addressSchema.parse(invalidAddress)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-001-10: debe rechazar estado vacío', () => {
      // Arrange
      const invalidAddress = {
        street: 'Av. Test',
        exteriorNumber: '123',
        city: 'CDMX',
        state: '',
        postalCode: '06700',
        country: 'MX',
      };

      // Act & Assert
      expect(() => addressSchema.parse(invalidAddress)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-001-11: debe validar países soportados (MX, US, CO, PE, AR)', () => {
      // Arrange
      const countries = ['MX', 'US', 'CO', 'PE', 'AR'];

      // Act & Assert
      countries.forEach((country) => {
        const address = {
          street: 'Test Street',
          exteriorNumber: '123',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country,
        };
        expect(() => addressSchema.parse(address)).not.toThrow();
      });
    });

    it('TC-RF-CTR-LOC-001-12: debe rechazar país no soportado', () => {
      // Arrange
      const invalidAddress = {
        street: 'Test Street',
        exteriorNumber: '123',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'DE', // Alemania, no soportado
      };

      // Act & Assert
      expect(() => addressSchema.parse(invalidAddress)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-001-13: debe validar número exterior', () => {
      // Arrange
      const validAddress = {
        street: 'Test St',
        exteriorNumber: '123-B',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'MX',
      };

      // Act
      const result = addressSchema.parse(validAddress);

      // Assert
      expect(result.exteriorNumber).toBe('123-B');
    });

    it('TC-RF-CTR-LOC-001-14: debe rechazar número exterior vacío', () => {
      // Arrange
      const invalidAddress = {
        street: 'Test St',
        exteriorNumber: '',
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'MX',
      };

      // Act & Assert
      expect(() => addressSchema.parse(invalidAddress)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-001-15: debe rechazar número exterior muy largo (> 20 caracteres)', () => {
      // Arrange
      const invalidAddress = {
        street: 'Test St',
        exteriorNumber: 'A'.repeat(21),
        city: 'Test City',
        state: 'Test State',
        postalCode: '12345',
        country: 'MX',
      };

      // Act & Assert
      expect(() => addressSchema.parse(invalidAddress)).toThrow(ZodError);
    });
  });

  describe('serviceZoneSchema', () => {
    it('TC-RF-CTR-LOC-006-01: debe validar zona RADIUS con 10 km', () => {
      // Arrange
      const validZone = {
        zoneType: 'RADIUS',
        radiusKm: 10,
      };

      // Act
      const result = serviceZoneSchema.parse(validZone);

      // Assert
      expect(result).toEqual(validZone);
    });

    it('TC-RF-CTR-LOC-006-02: debe validar radio mínimo de 1 km', () => {
      // Arrange
      const validZone = {
        zoneType: 'RADIUS',
        radiusKm: 1,
      };

      // Act
      const result = serviceZoneSchema.parse(validZone);

      // Assert
      expect(result.radiusKm).toBe(1);
    });

    it('TC-RF-CTR-LOC-006-03: debe validar radio máximo de 100 km', () => {
      // Arrange
      const validZone = {
        zoneType: 'RADIUS',
        radiusKm: 100,
      };

      // Act
      const result = serviceZoneSchema.parse(validZone);

      // Assert
      expect(result.radiusKm).toBe(100);
    });

    it('TC-RF-CTR-LOC-007-01: debe rechazar radio de 0 km', () => {
      // Arrange
      const invalidZone = {
        zoneType: 'RADIUS',
        radiusKm: 0,
      };

      // Act & Assert
      expect(() => serviceZoneSchema.parse(invalidZone)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-007-02: debe rechazar radio negativo', () => {
      // Arrange
      const invalidZone = {
        zoneType: 'RADIUS',
        radiusKm: -5,
      };

      // Act & Assert
      expect(() => serviceZoneSchema.parse(invalidZone)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-007-03: debe rechazar radio mayor a 100 km', () => {
      // Arrange
      const invalidZone = {
        zoneType: 'RADIUS',
        radiusKm: 150,
      };

      // Act & Assert
      expect(() => serviceZoneSchema.parse(invalidZone)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-007-04: debe rechazar radio decimal (debe ser entero)', () => {
      // Arrange
      const invalidZone = {
        zoneType: 'RADIUS',
        radiusKm: 10.5,
      };

      // Act & Assert
      expect(() => serviceZoneSchema.parse(invalidZone)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-003-01: debe rechazar tipo RADIUS sin radiusKm', () => {
      // Arrange
      const invalidZone = {
        zoneType: 'RADIUS',
      };

      // Act & Assert
      expect(() => serviceZoneSchema.parse(invalidZone)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-003-02: debe rechazar tipo POLYGON en MVP (no implementado)', () => {
      // Arrange
      const polygonZone = {
        zoneType: 'POLYGON',
        polygonCoordinates: [
          { lat: 19.43, lng: -99.13 },
          { lat: 19.44, lng: -99.14 },
          { lat: 19.45, lng: -99.13 },
        ],
      };

      // Act & Assert
      // En MVP, solo RADIUS está permitido
      expect(() => serviceZoneSchema.parse(polygonZone)).toThrow();
    });
  });

  describe('createLocationSchema', () => {
    it('TC-RF-CTR-LOC-001-16: debe validar creación con dirección y zona completas', () => {
      // Arrange
      const validData = {
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
      const result = createLocationSchema.parse(validData);

      // Assert
      expect(result).toBeDefined();
      expect(result.street).toBe('Av. Insurgentes Sur');
      expect(result.radiusKm).toBe(15);
    });

    it('TC-RF-CTR-LOC-001-17: debe validar creación sin campos opcionales', () => {
      // Arrange
      const minimalData = {
        street: 'Calle Principal',
        exteriorNumber: '100',
        city: 'Monterrey',
        state: 'Nuevo León',
        postalCode: '64000',
        country: 'MX',
        zoneType: 'RADIUS',
        radiusKm: 20,
      };

      // Act
      const result = createLocationSchema.parse(minimalData);

      // Assert
      expect(result).toBeDefined();
      expect(result.interiorNumber).toBeUndefined();
      expect(result.neighborhood).toBeUndefined();
    });

    it('TC-RF-CTR-LOC-001-18: debe rechazar datos incompletos', () => {
      // Arrange
      const incompleteData = {
        street: 'Av. Test',
        // Falta exteriorNumber
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06700',
        country: 'MX',
        zoneType: 'RADIUS',
        radiusKm: 10,
      };

      // Act & Assert
      expect(() => createLocationSchema.parse(incompleteData)).toThrow(ZodError);
    });
  });

  describe('updateLocationSchema', () => {
    it('TC-RF-CTR-LOC-004-01: debe validar actualización parcial de dirección', () => {
      // Arrange
      const partialUpdate = {
        street: 'Nueva Calle',
      };

      // Act
      const result = updateLocationSchema.parse(partialUpdate);

      // Assert
      expect(result.street).toBe('Nueva Calle');
    });

    it('TC-RF-CTR-LOC-004-02: debe validar actualización solo de zona', () => {
      // Arrange
      const zoneUpdate = {
        radiusKm: 25,
      };

      // Act
      const result = updateLocationSchema.parse(zoneUpdate);

      // Assert
      expect(result.radiusKm).toBe(25);
    });

    it('TC-RF-CTR-LOC-004-03: debe validar actualización de múltiples campos', () => {
      // Arrange
      const multipleUpdate = {
        city: 'Guadalajara',
        state: 'Jalisco',
        postalCode: '44100',
        radiusKm: 30,
      };

      // Act
      const result = updateLocationSchema.parse(multipleUpdate);

      // Assert
      expect(result.city).toBe('Guadalajara');
      expect(result.radiusKm).toBe(30);
    });

    it('TC-RF-CTR-LOC-004-04: debe rechazar valores inválidos en update', () => {
      // Arrange
      const invalidUpdate = {
        radiusKm: 200, // Fuera de rango
      };

      // Act & Assert
      expect(() => updateLocationSchema.parse(invalidUpdate)).toThrow(ZodError);
    });

    it('TC-RF-CTR-LOC-004-05: debe permitir actualización vacía (opcional)', () => {
      // Arrange
      const emptyUpdate = {};

      // Act
      const result = updateLocationSchema.parse(emptyUpdate);

      // Assert
      expect(result).toEqual({});
    });

    it('TC-RF-CTR-LOC-004-06: debe validar actualización de código postal', () => {
      // Arrange
      const validUpdate = {
        postalCode: '64000',
      };

      // Act
      const result = updateLocationSchema.parse(validUpdate);

      // Assert
      expect(result.postalCode).toBe('64000');
    });

    it('TC-RF-CTR-LOC-004-07: debe rechazar código postal inválido en update', () => {
      // Arrange
      const invalidUpdate = {
        postalCode: '123', // Formato incorrecto
      };

      // Act & Assert
      expect(() => updateLocationSchema.parse(invalidUpdate)).toThrow(ZodError);
    });
  });

  describe('Edge Cases', () => {
    it('debe manejar caracteres especiales en dirección', () => {
      // Arrange
      const addressWithSpecialChars = {
        street: 'Av. 16 de Septiembre #100-A',
        exteriorNumber: '100-A',
        neighborhood: 'Colonia Centro (Área 1)',
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '06000',
        country: 'MX',
      };

      // Act
      const result = addressSchema.parse(addressWithSpecialChars);

      // Assert
      expect(result).toBeDefined();
      expect(result.street).toContain('#');
      expect(result.neighborhood).toContain('(');
    });

    it('debe normalizar espacios en blanco', () => {
      // Arrange
      const addressWithSpaces = {
        street: '  Av. Test  ',
        exteriorNumber: ' 123 ',
        city: ' CDMX ',
        state: ' CDMX ',
        postalCode: '06700',
        country: 'MX',
      };

      // Act
      const result = addressSchema.parse(addressWithSpaces);

      // Assert
      // Zod should trim strings
      expect(result.street).toBe('Av. Test');
      expect(result.exteriorNumber).toBe('123');
    });

    it('debe rechazar código postal con espacios', () => {
      // Arrange
      const invalidAddress = {
        street: 'Av. Test',
        exteriorNumber: '123',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06 700',
        country: 'MX',
      };

      // Act & Assert
      expect(() => addressSchema.parse(invalidAddress)).toThrow(ZodError);
    });
  });
});
