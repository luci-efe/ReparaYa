import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import {
  createServiceSchema,
  updateServiceSchema,
  serviceSearchFiltersSchema,
  publishServiceValidationSchema,
} from '../validators/service';
import {
  imageUploadRequestSchema,
  imageUploadConfirmSchema,
  updateImageOrderSchema,
  updateImageAltTextSchema,
} from '../validators/image';
import { IMAGE_LIMITS } from '../types/image';

describe('validators - createServiceSchema', () => {
  describe('categoryId', () => {
    it('TC-SERVICE-001: debe aceptar categoryId UUID válido', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.categoryId).toBe(validData.categoryId);
    });

    it('TC-SERVICE-001-02: debe rechazar categoryId no UUID', () => {
      const invalidData = {
        categoryId: 'not-a-uuid',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 120,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });
  });

  describe('title', () => {
    it('TC-SERVICE-002: debe aceptar título válido', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.title).toBe(validData.title);
    });

    it('TC-SERVICE-002-02: debe rechazar título menor a 5 caracteres', () => {
      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Rep',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 120,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-SERVICE-002-03: debe rechazar título mayor a 100 caracteres', () => {
      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'A'.repeat(101),
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 120,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-SERVICE-002-04: debe aceptar título de exactamente 5 caracteres', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Título',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.title).toHaveLength(6); // "Título" has 6 chars
    });

    it('TC-SERVICE-002-05: debe aceptar título de exactamente 100 caracteres', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'A'.repeat(100),
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.title).toHaveLength(100);
    });
  });

  describe('description', () => {
    it('TC-SERVICE-003: debe aceptar descripción válida', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.description).toBe(validData.description);
    });

    it('TC-SERVICE-003-02: debe rechazar descripción menor a 50 caracteres', () => {
      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Descripción corta',
        basePrice: 500,
        durationMinutes: 120,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-SERVICE-003-03: debe rechazar descripción mayor a 2000 caracteres', () => {
      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'A'.repeat(2001),
        basePrice: 500,
        durationMinutes: 120,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-SERVICE-003-04: debe aceptar descripción de exactamente 50 caracteres', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'A'.repeat(50),
        basePrice: 500,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.description).toHaveLength(50);
    });

    it('TC-SERVICE-003-05: debe aceptar descripción de exactamente 2000 caracteres', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'A'.repeat(2000),
        basePrice: 500,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.description).toHaveLength(2000);
    });
  });

  describe('basePrice', () => {
    it('TC-SERVICE-004: debe aceptar precio válido', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500.00,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.basePrice).toBe(500.00);
    });

    it('TC-SERVICE-004-02: debe rechazar precio negativo', () => {
      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: -100,
        durationMinutes: 120,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-SERVICE-004-03: debe rechazar precio menor al mínimo (50 MXN)', () => {
      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 49.99,
        durationMinutes: 120,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-SERVICE-004-04: debe rechazar precio mayor al máximo (50,000 MXN)', () => {
      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 50000.01,
        durationMinutes: 120,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-SERVICE-004-05: debe aceptar precio mínimo (50 MXN)', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 50.00,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.basePrice).toBe(50.00);
    });

    it('TC-SERVICE-004-06: debe aceptar precio máximo (50,000 MXN)', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 50000.00,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.basePrice).toBe(50000.00);
    });

    it('TC-SERVICE-004-07: debe aceptar precio con 2 decimales', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500.50,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.basePrice).toBe(500.50);
    });

    it('TC-SERVICE-004-08: debe rechazar precio con más de 2 decimales', () => {
      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500.123,
        durationMinutes: 120,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });
  });

  describe('durationMinutes', () => {
    it('TC-SERVICE-009: debe aceptar duración válida', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 120,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.durationMinutes).toBe(120);
    });

    it('TC-SERVICE-009-02: debe rechazar duración menor al mínimo (30 minutos)', () => {
      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 29,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-SERVICE-009-03: debe rechazar duración mayor al máximo (480 minutos)', () => {
      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 481,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });

    it('TC-SERVICE-009-04: debe aceptar duración mínima (30 minutos)', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 30,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.durationMinutes).toBe(30);
    });

    it('TC-SERVICE-009-05: debe aceptar duración máxima (480 minutos)', () => {
      const validData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 480,
      };

      const result = createServiceSchema.parse(validData);

      expect(result.durationMinutes).toBe(480);
    });

    it('TC-SERVICE-009-06: debe rechazar duración no entera', () => {
      const invalidData = {
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reparación de tuberías',
        description: 'Servicio profesional de reparación de tuberías para casas y departamentos.',
        basePrice: 500,
        durationMinutes: 120.5,
      };

      expect(() => createServiceSchema.parse(invalidData)).toThrow(ZodError);
    });
  });
});

describe('validators - updateServiceSchema', () => {
  it('TC-SERVICE-010: debe aceptar todos los campos opcionales', () => {
    const validData = {};

    const result = updateServiceSchema.parse(validData);

    expect(result).toEqual({});
  });

  it('TC-SERVICE-010-02: debe aceptar actualización parcial de título', () => {
    const validData = {
      title: 'Nuevo título de servicio',
    };

    const result = updateServiceSchema.parse(validData);

    expect(result.title).toBe(validData.title);
    expect(result.description).toBeUndefined();
  });

  it('TC-SERVICE-010-03: debe validar restricciones en campos opcionales', () => {
    const invalidData = {
      title: 'ABC', // Muy corto
    };

    expect(() => updateServiceSchema.parse(invalidData)).toThrow(ZodError);
  });
});

describe('validators - serviceSearchFiltersSchema', () => {
  it('TC-SERVICE-011: debe aceptar filtros válidos', () => {
    const validData = {
      category: '123e4567-e89b-12d3-a456-426614174000',
      minPrice: 100,
      maxPrice: 1000,
      search: 'plomería',
      page: 1,
      limit: 20,
      status: 'ACTIVE' as const,
    };

    const result = serviceSearchFiltersSchema.parse(validData);

    expect(result.category).toBe(validData.category);
    expect(result.minPrice).toBe(100);
    expect(result.maxPrice).toBe(1000);
  });

  it('TC-SERVICE-011-02: debe usar valores por defecto para page y limit', () => {
    const validData = {};

    const result = serviceSearchFiltersSchema.parse(validData);

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('TC-SERVICE-011-03: debe rechazar search menor a 2 caracteres', () => {
    const invalidData = {
      search: 'A',
    };

    expect(() => serviceSearchFiltersSchema.parse(invalidData)).toThrow(ZodError);
  });

  it('TC-SERVICE-011-04: debe rechazar estado inválido', () => {
    const invalidData = {
      status: 'INVALID_STATUS',
    };

    expect(() => serviceSearchFiltersSchema.parse(invalidData)).toThrow(ZodError);
  });
});

describe('validators - publishServiceValidationSchema', () => {
  it('TC-SERVICE-012: debe aceptar validación exitosa', () => {
    const validData = {
      verified: true,
      hasImages: true,
      hasRequiredFields: true,
    };

    const result = publishServiceValidationSchema.parse(validData);

    expect(result.verified).toBe(true);
    expect(result.hasImages).toBe(true);
    expect(result.hasRequiredFields).toBe(true);
  });

  it('TC-SERVICE-012-02: debe rechazar si verified es false', () => {
    const invalidData = {
      verified: false,
      hasImages: true,
      hasRequiredFields: true,
    };

    expect(() => publishServiceValidationSchema.parse(invalidData)).toThrow(ZodError);
  });
});

describe('validators - imageUploadRequestSchema', () => {
  it('TC-SERVICE-013: debe aceptar solicitud de upload válida', () => {
    const validData = {
      fileName: 'service-image.jpg',
      fileSize: 5 * 1024 * 1024, // 5 MB
      mimeType: 'image/jpeg',
    };

    const result = imageUploadRequestSchema.parse(validData);

    expect(result.fileName).toBe(validData.fileName);
    expect(result.fileSize).toBe(validData.fileSize);
    expect(result.mimeType).toBe(validData.mimeType);
  });

  it('TC-SERVICE-013-02: debe rechazar archivo mayor a 10 MB', () => {
    const invalidData = {
      fileName: 'large-image.jpg',
      fileSize: 11 * 1024 * 1024, // 11 MB
      mimeType: 'image/jpeg',
    };

    expect(() => imageUploadRequestSchema.parse(invalidData)).toThrow(ZodError);
  });

  it('TC-SERVICE-013-03: debe rechazar tipo MIME no permitido', () => {
    const invalidData = {
      fileName: 'document.pdf',
      fileSize: 1 * 1024 * 1024,
      mimeType: 'application/pdf',
    };

    expect(() => imageUploadRequestSchema.parse(invalidData)).toThrow(ZodError);
  });

  it('TC-SERVICE-013-04: debe aceptar todos los tipos MIME permitidos', () => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

    allowedMimeTypes.forEach((mimeType) => {
      const validData = {
        fileName: `image.${mimeType.split('/')[1]}`,
        fileSize: 1 * 1024 * 1024,
        mimeType,
      };

      const result = imageUploadRequestSchema.parse(validData);
      expect(result.mimeType).toBe(mimeType);
    });
  });
});

describe('validators - imageUploadConfirmSchema', () => {
  it('TC-SERVICE-014: debe aceptar confirmación de upload válida', () => {
    const validData = {
      s3Key: 'contractor-services/123e4567-e89b-12d3-a456-426614174000/456e7890-e89b-12d3-a456-426614174111/789e0123-e89b-12d3-a456-426614174222.jpg',
      s3Url: 'https://reparaya-dev.s3.us-east-1.amazonaws.com/contractor-services/123e4567-e89b-12d3-a456-426614174000/456e7890-e89b-12d3-a456-426614174111/789e0123-e89b-12d3-a456-426614174222.jpg',
      width: 1920,
      height: 1080,
      altText: 'Service image description',
    };

    const result = imageUploadConfirmSchema.parse(validData);

    expect(result.s3Key).toBe(validData.s3Key);
    expect(result.s3Url).toBe(validData.s3Url);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
  });

  it('TC-SERVICE-014-02: debe rechazar s3Key con formato inválido', () => {
    const invalidData = {
      s3Key: 'invalid-key-format.jpg',
      s3Url: 'https://reparaya-dev.s3.us-east-1.amazonaws.com/contractor-services/123e4567-e89b-12d3-a456-426614174000/456e7890-e89b-12d3-a456-426614174111/789e0123-e89b-12d3-a456-426614174222.jpg',
    };

    expect(() => imageUploadConfirmSchema.parse(invalidData)).toThrow(ZodError);
  });

  it('TC-SERVICE-014-03: debe rechazar s3Url que no sea de AWS S3', () => {
    const invalidData = {
      s3Key: 'contractor-services/123e4567-e89b-12d3-a456-426614174000/456e7890-e89b-12d3-a456-426614174111/789e0123-e89b-12d3-a456-426614174222.jpg',
      s3Url: 'https://example.com/image.jpg',
    };

    expect(() => imageUploadConfirmSchema.parse(invalidData)).toThrow(ZodError);
  });
});

describe('validators - updateImageOrderSchema', () => {
  it('TC-SERVICE-015: debe aceptar actualización de orden válida', () => {
    const validData = {
      imageId: '123e4567-e89b-12d3-a456-426614174000',
      newOrder: 2,
    };

    const result = updateImageOrderSchema.parse(validData);

    expect(result.imageId).toBe(validData.imageId);
    expect(result.newOrder).toBe(2);
  });

  it('TC-SERVICE-015-02: debe rechazar orden negativo', () => {
    const invalidData = {
      imageId: '123e4567-e89b-12d3-a456-426614174000',
      newOrder: -1,
    };

    expect(() => updateImageOrderSchema.parse(invalidData)).toThrow(ZodError);
  });

  it('TC-SERVICE-015-03: debe rechazar orden mayor al máximo', () => {
    const invalidData = {
      imageId: '123e4567-e89b-12d3-a456-426614174000',
      newOrder: IMAGE_LIMITS.MAX_IMAGES_PER_SERVICE,
    };

    expect(() => updateImageOrderSchema.parse(invalidData)).toThrow(ZodError);
  });
});

describe('validators - updateImageAltTextSchema', () => {
  it('TC-SERVICE-016: debe aceptar texto alternativo válido', () => {
    const validData = {
      altText: 'Descripción de la imagen del servicio',
    };

    const result = updateImageAltTextSchema.parse(validData);

    expect(result.altText).toBe(validData.altText);
  });

  it('TC-SERVICE-016-02: debe rechazar altText menor a 5 caracteres', () => {
    const invalidData = {
      altText: 'ABC',
    };

    expect(() => updateImageAltTextSchema.parse(invalidData)).toThrow(ZodError);
  });

  it('TC-SERVICE-016-03: debe rechazar altText mayor a 200 caracteres', () => {
    const invalidData = {
      altText: 'A'.repeat(201),
    };

    expect(() => updateImageAltTextSchema.parse(invalidData)).toThrow(ZodError);
  });
});
