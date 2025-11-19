import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import {
  createContractorProfileSchema,
  updateContractorProfileSchema,
  verifyContractorProfileSchema,
} from '../validators';

describe('validators - createContractorProfileSchema', () => {
  describe('businessName', () => {
    it('TC-CONTRACTOR-010-01: debe aceptar businessName válido', () => {
      // Arrange
      const validData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services with 10 years of experience',
        specialties: ['plumbing'],
      };

      // Act
      const result = createContractorProfileSchema.parse(validData);

      // Assert
      expect(result.businessName).toBe(validData.businessName);
    });

    it('TC-CONTRACTOR-010-02: debe rechazar businessName vacío', () => {
      // Arrange
      const invalidData = {
        businessName: '',
        description: 'Professional plumbing services',
        specialties: ['plumbing'],
      };

      // Act & Assert
      expect(() => createContractorProfileSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-CONTRACTOR-010-03: debe rechazar businessName mayor a 100 caracteres', () => {
      // Arrange
      const invalidData = {
        businessName: 'A'.repeat(101),
        description: 'Professional plumbing services',
        specialties: ['plumbing'],
      };

      // Act & Assert
      expect(() => createContractorProfileSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-CONTRACTOR-010-04: debe aceptar businessName de exactamente 100 caracteres', () => {
      // Arrange
      const validData = {
        businessName: 'A'.repeat(100),
        description: 'Professional plumbing services',
        specialties: ['plumbing'],
      };

      // Act
      const result = createContractorProfileSchema.parse(validData);

      // Assert
      expect(result.businessName).toHaveLength(100);
    });
  });

  describe('description', () => {
    it('TC-CONTRACTOR-010-05: debe aceptar description válida', () => {
      // Arrange
      const validData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services with 10 years of experience',
        specialties: ['plumbing'],
      };

      // Act
      const result = createContractorProfileSchema.parse(validData);

      // Assert
      expect(result.description).toBe(validData.description);
    });

    it('TC-CONTRACTOR-010-06: debe rechazar description menor a 10 caracteres', () => {
      // Arrange
      const invalidData = {
        businessName: 'García Plumbing',
        description: 'Short',
        specialties: ['plumbing'],
      };

      // Act & Assert
      expect(() => createContractorProfileSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-CONTRACTOR-010-07: debe rechazar description mayor a 500 caracteres', () => {
      // Arrange
      const invalidData = {
        businessName: 'García Plumbing',
        description: 'A'.repeat(501),
        specialties: ['plumbing'],
      };

      // Act & Assert
      expect(() => createContractorProfileSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-CONTRACTOR-010-08: debe aceptar description de exactamente 500 caracteres', () => {
      // Arrange
      const validData = {
        businessName: 'García Plumbing',
        description: 'A'.repeat(500),
        specialties: ['plumbing'],
      };

      // Act
      const result = createContractorProfileSchema.parse(validData);

      // Assert
      expect(result.description).toHaveLength(500);
    });

    it('TC-CONTRACTOR-010-09: debe aceptar description de exactamente 10 caracteres', () => {
      // Arrange
      const validData = {
        businessName: 'García Plumbing',
        description: 'A'.repeat(10),
        specialties: ['plumbing'],
      };

      // Act
      const result = createContractorProfileSchema.parse(validData);

      // Assert
      expect(result.description).toHaveLength(10);
    });
  });

  describe('specialties', () => {
    it('TC-CONTRACTOR-010-10: debe aceptar specialties con un elemento', () => {
      // Arrange
      const validData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services',
        specialties: ['plumbing'],
      };

      // Act
      const result = createContractorProfileSchema.parse(validData);

      // Assert
      expect(result.specialties).toEqual(['plumbing']);
    });

    it('TC-CONTRACTOR-010-11: debe rechazar specialties vacío', () => {
      // Arrange
      const invalidData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services',
        specialties: [],
      };

      // Act & Assert
      expect(() => createContractorProfileSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-CONTRACTOR-010-12: debe rechazar specialties con más de 10 elementos', () => {
      // Arrange
      const invalidData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services',
        specialties: Array(11).fill('specialty'),
      };

      // Act & Assert
      expect(() => createContractorProfileSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-CONTRACTOR-010-13: debe aceptar specialties con exactamente 10 elementos', () => {
      // Arrange
      const validData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services',
        specialties: Array(10).fill('specialty'),
      };

      // Act
      const result = createContractorProfileSchema.parse(validData);

      // Assert
      expect(result.specialties).toHaveLength(10);
    });

    it('TC-CONTRACTOR-010-14: debe aceptar specialties con múltiples valores', () => {
      // Arrange
      const validData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services',
        specialties: ['plumbing', 'heating', 'air-conditioning'],
      };

      // Act
      const result = createContractorProfileSchema.parse(validData);

      // Assert
      expect(result.specialties).toEqual(['plumbing', 'heating', 'air-conditioning']);
    });
  });

  describe('verificationDocuments', () => {
    it('TC-CONTRACTOR-010-15: debe aceptar verificationDocuments opcional', () => {
      // Arrange
      const validData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services',
        specialties: ['plumbing'],
      };

      // Act
      const result = createContractorProfileSchema.parse(validData);

      // Assert
      expect(result.verificationDocuments).toBeUndefined();
    });

    it('TC-CONTRACTOR-010-16: debe aceptar verificationDocuments como objeto', () => {
      // Arrange
      const validData = {
        businessName: 'García Plumbing',
        description: 'Professional plumbing services',
        specialties: ['plumbing'],
        verificationDocuments: {
          idDocument: 'https://storage.example.com/docs/id-123.pdf',
          certificate: 'https://storage.example.com/docs/cert-123.pdf',
        },
      };

      // Act
      const result = createContractorProfileSchema.parse(validData);

      // Assert
      expect(result.verificationDocuments).toEqual({
        idDocument: 'https://storage.example.com/docs/id-123.pdf',
        certificate: 'https://storage.example.com/docs/cert-123.pdf',
      });
    });
  });
});

describe('validators - updateContractorProfileSchema', () => {
  it('TC-CONTRACTOR-010-17: debe aceptar todos los campos opcionales', () => {
    // Arrange
    const validData = {};

    // Act
    const result = updateContractorProfileSchema.parse(validData);

    // Assert
    expect(result).toEqual({});
  });

  it('TC-CONTRACTOR-010-18: debe aceptar solo businessName', () => {
    // Arrange
    const validData = {
      businessName: 'García Plumbing & Heating',
    };

    // Act
    const result = updateContractorProfileSchema.parse(validData);

    // Assert
    expect(result.businessName).toBe('García Plumbing & Heating');
    expect(result.description).toBeUndefined();
    expect(result.specialties).toBeUndefined();
  });

  it('TC-CONTRACTOR-010-19: debe rechazar businessName mayor a 100 caracteres', () => {
    // Arrange
    const invalidData = {
      businessName: 'A'.repeat(101),
    };

    // Act & Assert
    expect(() => updateContractorProfileSchema.parse(invalidData)).toThrow(ZodError);
  });

  it('TC-CONTRACTOR-010-20: debe rechazar description menor a 10 caracteres', () => {
    // Arrange
    const invalidData = {
      description: 'Short',
    };

    // Act & Assert
    expect(() => updateContractorProfileSchema.parse(invalidData)).toThrow(ZodError);
  });

  it('TC-CONTRACTOR-010-21: debe rechazar specialties vacío si se proporciona', () => {
    // Arrange
    const invalidData = {
      specialties: [],
    };

    // Act & Assert
    expect(() => updateContractorProfileSchema.parse(invalidData)).toThrow(ZodError);
  });
});

describe('validators - verifyContractorProfileSchema', () => {
  it('TC-CONTRACTOR-010-22: debe aceptar verified como true', () => {
    // Arrange
    const validData = {
      verified: true,
    };

    // Act
    const result = verifyContractorProfileSchema.parse(validData);

    // Assert
    expect(result.verified).toBe(true);
  });

  it('TC-CONTRACTOR-010-23: debe aceptar verified como false', () => {
    // Arrange
    const validData = {
      verified: false,
    };

    // Act
    const result = verifyContractorProfileSchema.parse(validData);

    // Assert
    expect(result.verified).toBe(false);
  });

  it('TC-CONTRACTOR-010-24: debe rechazar verified como string', () => {
    // Arrange
    const invalidData = {
      verified: 'true',
    };

    // Act & Assert
    expect(() => verifyContractorProfileSchema.parse(invalidData)).toThrow(ZodError);
  });

  it('TC-CONTRACTOR-010-25: debe rechazar verified ausente', () => {
    // Arrange
    const invalidData = {};

    // Act & Assert
    expect(() => verifyContractorProfileSchema.parse(invalidData)).toThrow(ZodError);
  });
});
