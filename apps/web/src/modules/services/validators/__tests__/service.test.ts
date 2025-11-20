/**
 * Service Validators Unit Tests
 *
 * Comprehensive tests for service CRUD validation schemas
 *
 * @module services/validators/__tests__/service
 */

import {
  createServiceSchema,
  updateServiceSchema,
  publishServiceSchema,
  pauseServiceSchema,
  reactivateServiceSchema,
  unpublishServiceSchema,
  archiveServiceSchema,
  serviceQuerySchema,
  SERVICE_VALIDATION_CONSTANTS,
} from '../index';
import { Currency, ServiceStatus } from '../../types';

describe('Service Validators', () => {
  describe('createServiceSchema', () => {
    const validService = {
      title: 'Reparación de tuberías',
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      description: 'Servicio completo de reparación de tuberías con garantía de 6 meses. Incluye diagnóstico y mano de obra.',
      basePrice: 500.0,
      currency: Currency.MXN,
      durationMinutes: 120,
    };

    describe('title validation', () => {
      it('should accept valid title', () => {
        const result = createServiceSchema.safeParse(validService);
        expect(result.success).toBe(true);
      });

      it('should reject title shorter than 5 characters', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          title: 'Foo',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('al menos 5 caracteres');
        }
      });

      it('should reject title longer than 100 characters', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          title: 'a'.repeat(101),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('no debe exceder 100 caracteres');
        }
      });

      it('should trim whitespace from title', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          title: '  Valid Title  ',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.title).toBe('Valid Title');
        }
      });

      it('should accept title with minimum length (5 chars)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          title: '12345',
        });
        expect(result.success).toBe(true);
      });

      it('should accept title with maximum length (100 chars)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          title: 'a'.repeat(100),
        });
        expect(result.success).toBe(true);
      });
    });

    describe('categoryId validation', () => {
      it('should accept valid UUID', () => {
        const result = createServiceSchema.safeParse(validService);
        expect(result.success).toBe(true);
      });

      it('should reject invalid UUID format', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          categoryId: 'not-a-uuid',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('inválido');
        }
      });

      it('should reject empty string', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          categoryId: '',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('description validation', () => {
      it('should accept valid description', () => {
        const result = createServiceSchema.safeParse(validService);
        expect(result.success).toBe(true);
      });

      it('should reject description shorter than 50 characters', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          description: 'Too short',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('al menos 50 caracteres');
        }
      });

      it('should reject description longer than 2000 characters', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          description: 'a'.repeat(2001),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('no debe exceder 2000 caracteres');
        }
      });

      it('should trim whitespace from description', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          description: '  ' + validService.description + '  ',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBe(validService.description);
        }
      });

      it('should accept description with minimum length (50 chars)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          description: 'a'.repeat(50),
        });
        expect(result.success).toBe(true);
      });

      it('should accept description with maximum length (2000 chars)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          description: 'a'.repeat(2000),
        });
        expect(result.success).toBe(true);
      });
    });

    describe('basePrice validation', () => {
      it('should accept valid price', () => {
        const result = createServiceSchema.safeParse(validService);
        expect(result.success).toBe(true);
      });

      it('should reject price below minimum (50 MXN)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          basePrice: 49.99,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('50');
        }
      });

      it('should reject price above maximum (50000 MXN)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          basePrice: 50000.01,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('50000');
        }
      });

      it('should accept minimum price (50 MXN)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          basePrice: 50.0,
        });
        expect(result.success).toBe(true);
      });

      it('should accept maximum price (50000 MXN)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          basePrice: 50000.0,
        });
        expect(result.success).toBe(true);
      });

      it('should accept price with 2 decimal places', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          basePrice: 123.45,
        });
        expect(result.success).toBe(true);
      });

      it('should reject price with more than 2 decimal places', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          basePrice: 123.456,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('2 decimales');
        }
      });

      it('should reject negative price', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          basePrice: -100,
        });
        expect(result.success).toBe(false);
      });

      it('should reject zero price', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          basePrice: 0,
        });
        expect(result.success).toBe(false);
      });
    });

    describe('currency validation', () => {
      it('should accept MXN currency', () => {
        const result = createServiceSchema.safeParse(validService);
        expect(result.success).toBe(true);
      });

      it('should default to MXN if not provided', () => {
        const { currency, ...serviceWithoutCurrency } = validService;
        const result = createServiceSchema.safeParse(serviceWithoutCurrency);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.currency).toBe(Currency.MXN);
        }
      });

      it('should reject invalid currency', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          currency: 'USD',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('durationMinutes validation', () => {
      it('should accept valid duration', () => {
        const result = createServiceSchema.safeParse(validService);
        expect(result.success).toBe(true);
      });

      it('should reject duration below minimum (30 minutes)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          durationMinutes: 15,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('30 minutos');
        }
      });

      it('should reject duration above maximum (480 minutes)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          durationMinutes: 481,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('480 minutos');
        }
      });

      it('should accept minimum duration (30 minutes)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          durationMinutes: 30,
        });
        expect(result.success).toBe(true);
      });

      it('should accept maximum duration (480 minutes)', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          durationMinutes: 480,
        });
        expect(result.success).toBe(true);
      });

      it('should reject duration not multiple of 15', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          durationMinutes: 35,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('múltiplo de 15');
        }
      });

      it('should accept duration that is multiple of 15', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          durationMinutes: 45,
        });
        expect(result.success).toBe(true);
      });

      it('should reject non-integer duration', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          durationMinutes: 30.5,
        });
        expect(result.success).toBe(false);
      });

      it('should reject negative duration', () => {
        const result = createServiceSchema.safeParse({
          ...validService,
          durationMinutes: -30,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('updateServiceSchema', () => {
    it('should accept partial updates', () => {
      const result = updateServiceSchema.safeParse({
        title: 'Updated Title',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object (no updates)', () => {
      const result = updateServiceSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate provided fields', () => {
      const result = updateServiceSchema.safeParse({
        basePrice: 25.0, // Below minimum
      });
      expect(result.success).toBe(false);
    });

    it('should accept multiple field updates', () => {
      const result = updateServiceSchema.safeParse({
        title: 'New Title',
        basePrice: 600.0,
        durationMinutes: 180,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('publishServiceSchema', () => {
    const validPublishData = {
      hasImages: true,
      isContractorVerified: true,
      title: 'Valid Title',
      categoryId: '123e4567-e89b-12d3-a456-426614174000',
      description: 'a'.repeat(50),
      basePrice: 500.0,
      currency: Currency.MXN,
      durationMinutes: 120,
      currentStatus: ServiceStatus.DRAFT,
    };

    it('should accept valid publication data', () => {
      const result = publishServiceSchema.safeParse(validPublishData);
      expect(result.success).toBe(true);
    });

    it('should reject if service has no images', () => {
      const result = publishServiceSchema.safeParse({
        ...validPublishData,
        hasImages: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos una imagen');
      }
    });

    it('should reject if contractor is not verified', () => {
      const result = publishServiceSchema.safeParse({
        ...validPublishData,
        isContractorVerified: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('verificados');
      }
    });

    it('should reject if current status is not DRAFT', () => {
      const result = publishServiceSchema.safeParse({
        ...validPublishData,
        currentStatus: ServiceStatus.ACTIVE,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('DRAFT');
      }
    });

    it('should reject if required fields are invalid', () => {
      const result = publishServiceSchema.safeParse({
        ...validPublishData,
        title: 'abc', // Too short
      });
      expect(result.success).toBe(false);
    });
  });

  describe('pauseServiceSchema', () => {
    it('should accept ACTIVE status', () => {
      const result = pauseServiceSchema.safeParse({
        currentStatus: ServiceStatus.ACTIVE,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-ACTIVE status', () => {
      const result = pauseServiceSchema.safeParse({
        currentStatus: ServiceStatus.DRAFT,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('ACTIVE');
      }
    });
  });

  describe('reactivateServiceSchema', () => {
    it('should accept PAUSED status with verified contractor', () => {
      const result = reactivateServiceSchema.safeParse({
        currentStatus: ServiceStatus.PAUSED,
        isContractorVerified: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject non-PAUSED status', () => {
      const result = reactivateServiceSchema.safeParse({
        currentStatus: ServiceStatus.DRAFT,
        isContractorVerified: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('PAUSED');
      }
    });

    it('should reject if contractor is not verified', () => {
      const result = reactivateServiceSchema.safeParse({
        currentStatus: ServiceStatus.PAUSED,
        isContractorVerified: false,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('verificados');
      }
    });
  });

  describe('unpublishServiceSchema', () => {
    it('should accept ACTIVE status without active bookings', () => {
      const result = unpublishServiceSchema.safeParse({
        currentStatus: ServiceStatus.ACTIVE,
        hasActiveBookings: false,
      });
      expect(result.success).toBe(true);
    });

    it('should accept PAUSED status without active bookings', () => {
      const result = unpublishServiceSchema.safeParse({
        currentStatus: ServiceStatus.PAUSED,
        hasActiveBookings: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject DRAFT status', () => {
      const result = unpublishServiceSchema.safeParse({
        currentStatus: ServiceStatus.DRAFT,
        hasActiveBookings: false,
      });
      expect(result.success).toBe(false);
    });

    it('should reject if service has active bookings', () => {
      const result = unpublishServiceSchema.safeParse({
        currentStatus: ServiceStatus.ACTIVE,
        hasActiveBookings: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('reservas activas');
      }
    });
  });

  describe('archiveServiceSchema', () => {
    it('should accept service without active bookings', () => {
      const result = archiveServiceSchema.safeParse({
        hasActiveBookings: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject service with active bookings', () => {
      const result = archiveServiceSchema.safeParse({
        hasActiveBookings: true,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('reservas activas');
      }
    });
  });

  describe('serviceQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const result = serviceQuerySchema.safeParse({
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        contractorId: '123e4567-e89b-12d3-a456-426614174001',
        visibilityStatus: ServiceStatus.ACTIVE,
        minPrice: 100,
        maxPrice: 1000,
        page: 1,
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty query parameters', () => {
      const result = serviceQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should default page to 1', () => {
      const result = serviceQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('should default limit to 20', () => {
      const result = serviceQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject invalid UUID for categoryId', () => {
      const result = serviceQuerySchema.safeParse({
        categoryId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative page number', () => {
      const result = serviceQuerySchema.safeParse({
        page: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit above 100', () => {
      const result = serviceQuerySchema.safeParse({
        limit: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative minPrice', () => {
      const result = serviceQuerySchema.safeParse({
        minPrice: -100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SERVICE_VALIDATION_CONSTANTS', () => {
    it('should export correct title constants', () => {
      expect(SERVICE_VALIDATION_CONSTANTS.title.min).toBe(5);
      expect(SERVICE_VALIDATION_CONSTANTS.title.max).toBe(100);
    });

    it('should export correct description constants', () => {
      expect(SERVICE_VALIDATION_CONSTANTS.description.min).toBe(50);
      expect(SERVICE_VALIDATION_CONSTANTS.description.max).toBe(2000);
    });

    it('should export correct price constants', () => {
      expect(SERVICE_VALIDATION_CONSTANTS.price.min).toBe(50.0);
      expect(SERVICE_VALIDATION_CONSTANTS.price.max).toBe(50000.0);
    });

    it('should export correct duration constants', () => {
      expect(SERVICE_VALIDATION_CONSTANTS.duration.min).toBe(30);
      expect(SERVICE_VALIDATION_CONSTANTS.duration.max).toBe(480);
    });
  });
});
