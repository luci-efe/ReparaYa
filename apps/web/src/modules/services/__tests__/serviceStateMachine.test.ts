import { describe, it, expect } from '@jest/globals';
import { serviceStateMachine } from '../services/serviceStateMachine';
import { InvalidStateTransitionError, PublicationRequirementsNotMetError } from '../errors';
import {
  mockServiceDraft,
  mockServiceActive,
  mockServicePaused,
  mockServiceArchived,
  mockServiceDraftNoImages,
  mockVerifiedContractor,
  mockUnverifiedContractor,
} from '../test-fixtures';

describe('serviceStateMachine', () => {
  describe('canTransition', () => {
    it('TC-SERVICE-005: debe permitir transición DRAFT → ACTIVE', () => {
      const result = serviceStateMachine.canTransition('DRAFT', 'ACTIVE');

      expect(result).toBe(true);
    });

    it('TC-SERVICE-005-02: debe permitir transición DRAFT → ARCHIVED', () => {
      const result = serviceStateMachine.canTransition('DRAFT', 'ARCHIVED');

      expect(result).toBe(true);
    });

    it('TC-SERVICE-005-03: debe permitir transición ACTIVE → PAUSED', () => {
      const result = serviceStateMachine.canTransition('ACTIVE', 'PAUSED');

      expect(result).toBe(true);
    });

    it('TC-SERVICE-005-04: debe permitir transición ACTIVE → DRAFT', () => {
      const result = serviceStateMachine.canTransition('ACTIVE', 'DRAFT');

      expect(result).toBe(true);
    });

    it('TC-SERVICE-005-05: debe permitir transición ACTIVE → ARCHIVED', () => {
      const result = serviceStateMachine.canTransition('ACTIVE', 'ARCHIVED');

      expect(result).toBe(true);
    });

    it('TC-SERVICE-005-06: debe permitir transición PAUSED → ACTIVE', () => {
      const result = serviceStateMachine.canTransition('PAUSED', 'ACTIVE');

      expect(result).toBe(true);
    });

    it('TC-SERVICE-005-07: debe permitir transición PAUSED → DRAFT', () => {
      const result = serviceStateMachine.canTransition('PAUSED', 'DRAFT');

      expect(result).toBe(true);
    });

    it('TC-SERVICE-005-08: debe permitir transición PAUSED → ARCHIVED', () => {
      const result = serviceStateMachine.canTransition('PAUSED', 'ARCHIVED');

      expect(result).toBe(true);
    });

    it('TC-SERVICE-006: debe rechazar transición DRAFT → PAUSED', () => {
      const result = serviceStateMachine.canTransition('DRAFT', 'PAUSED');

      expect(result).toBe(false);
    });

    it('TC-SERVICE-006-02: debe rechazar transición ARCHIVED → ACTIVE', () => {
      const result = serviceStateMachine.canTransition('ARCHIVED', 'ACTIVE');

      expect(result).toBe(false);
    });

    it('TC-SERVICE-006-03: debe rechazar transición ARCHIVED → DRAFT', () => {
      const result = serviceStateMachine.canTransition('ARCHIVED', 'DRAFT');

      expect(result).toBe(false);
    });

    it('TC-SERVICE-006-04: debe rechazar transición ARCHIVED → PAUSED', () => {
      const result = serviceStateMachine.canTransition('ARCHIVED', 'PAUSED');

      expect(result).toBe(false);
    });

    it('TC-SERVICE-006-05: debe permitir mismo estado (idempotente)', () => {
      expect(serviceStateMachine.canTransition('DRAFT', 'DRAFT')).toBe(true);
      expect(serviceStateMachine.canTransition('ACTIVE', 'ACTIVE')).toBe(true);
      expect(serviceStateMachine.canTransition('PAUSED', 'PAUSED')).toBe(true);
      expect(serviceStateMachine.canTransition('ARCHIVED', 'ARCHIVED')).toBe(true);
    });
  });

  describe('validatePublicationRequirements', () => {
    it('TC-SERVICE-007: debe pasar validación con servicio completo y contratista verificado', () => {
      const violations = serviceStateMachine.validatePublicationRequirements(
        mockServiceDraft,
        mockVerifiedContractor
      );

      expect(violations).toEqual([]);
    });

    it('TC-SERVICE-007-02: debe detectar contratista no verificado', () => {
      const violations = serviceStateMachine.validatePublicationRequirements(
        mockServiceDraft,
        mockUnverifiedContractor
      );

      expect(violations).toContain('El contratista debe estar verificado para publicar servicios');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('TC-SERVICE-007-03: debe detectar falta de imágenes', () => {
      const violations = serviceStateMachine.validatePublicationRequirements(
        mockServiceDraftNoImages,
        mockVerifiedContractor
      );

      expect(violations).toContain('El servicio debe tener al menos una imagen');
      expect(violations.length).toBeGreaterThan(0);
    });

    it('TC-SERVICE-007-04: debe detectar título vacío', () => {
      const serviceWithoutTitle = {
        ...mockServiceDraft,
        title: '',
      };

      const violations = serviceStateMachine.validatePublicationRequirements(
        serviceWithoutTitle,
        mockVerifiedContractor
      );

      expect(violations).toContain('El título del servicio es requerido');
    });

    it('TC-SERVICE-007-05: debe detectar descripción vacía', () => {
      const serviceWithoutDescription = {
        ...mockServiceDraft,
        description: '',
      };

      const violations = serviceStateMachine.validatePublicationRequirements(
        serviceWithoutDescription,
        mockVerifiedContractor
      );

      expect(violations).toContain('La descripción del servicio es requerida');
    });

    it('TC-SERVICE-007-06: debe detectar categoría faltante', () => {
      const serviceWithoutCategory = {
        ...mockServiceDraft,
        categoryId: '',
      };

      const violations = serviceStateMachine.validatePublicationRequirements(
        serviceWithoutCategory,
        mockVerifiedContractor
      );

      expect(violations).toContain('La categoría del servicio es requerida');
    });

    it('TC-SERVICE-007-07: debe detectar precio inválido (0 o negativo)', () => {
      const serviceWithInvalidPrice = {
        ...mockServiceDraft,
        basePrice: 0,
      };

      const violations = serviceStateMachine.validatePublicationRequirements(
        serviceWithInvalidPrice,
        mockVerifiedContractor
      );

      expect(violations).toContain('El precio base debe ser mayor a 0');
    });

    it('TC-SERVICE-007-08: debe detectar duración inválida (0 o negativa)', () => {
      const serviceWithInvalidDuration = {
        ...mockServiceDraft,
        durationMinutes: 0,
      };

      const violations = serviceStateMachine.validatePublicationRequirements(
        serviceWithInvalidDuration,
        mockVerifiedContractor
      );

      expect(violations).toContain('La duración debe ser mayor a 0 minutos');
    });

    it('TC-SERVICE-007-09: debe detectar múltiples violaciones', () => {
      const serviceWithMultipleIssues = {
        ...mockServiceDraft,
        title: '',
        description: '',
        basePrice: 0,
        durationMinutes: -1,
        images: [],
      };

      const violations = serviceStateMachine.validatePublicationRequirements(
        serviceWithMultipleIssues,
        mockUnverifiedContractor
      );

      expect(violations.length).toBeGreaterThanOrEqual(6);
      expect(violations).toContain('El contratista debe estar verificado para publicar servicios');
      expect(violations).toContain('El servicio debe tener al menos una imagen');
      expect(violations).toContain('El título del servicio es requerido');
      expect(violations).toContain('La descripción del servicio es requerida');
      expect(violations).toContain('El precio base debe ser mayor a 0');
      expect(violations).toContain('La duración debe ser mayor a 0 minutos');
    });
  });

  describe('transitionTo', () => {
    it('TC-SERVICE-008: debe permitir transición válida DRAFT → ACTIVE con requisitos cumplidos', () => {
      expect(() => {
        serviceStateMachine.transitionTo(mockServiceDraft, 'ACTIVE', mockVerifiedContractor);
      }).not.toThrow();
    });

    it('TC-SERVICE-008-02: debe permitir transición ACTIVE → PAUSED', () => {
      expect(() => {
        serviceStateMachine.transitionTo(mockServiceActive, 'PAUSED', mockVerifiedContractor);
      }).not.toThrow();
    });

    it('TC-SERVICE-008-03: debe permitir transición PAUSED → ACTIVE', () => {
      expect(() => {
        serviceStateMachine.transitionTo(mockServicePaused, 'ACTIVE', mockVerifiedContractor);
      }).not.toThrow();
    });

    it('TC-SERVICE-008-04: debe permitir transición a ARCHIVED desde cualquier estado', () => {
      expect(() => {
        serviceStateMachine.transitionTo(mockServiceDraft, 'ARCHIVED', mockVerifiedContractor);
      }).not.toThrow();

      expect(() => {
        serviceStateMachine.transitionTo(mockServiceActive, 'ARCHIVED', mockVerifiedContractor);
      }).not.toThrow();

      expect(() => {
        serviceStateMachine.transitionTo(mockServicePaused, 'ARCHIVED', mockVerifiedContractor);
      }).not.toThrow();
    });

    it('TC-SERVICE-008-05: debe lanzar InvalidStateTransitionError en transición inválida', () => {
      expect(() => {
        serviceStateMachine.transitionTo(mockServiceDraft, 'PAUSED', mockVerifiedContractor);
      }).toThrow(InvalidStateTransitionError);

      expect(() => {
        serviceStateMachine.transitionTo(mockServiceDraft, 'PAUSED', mockVerifiedContractor);
      }).toThrow('La transición de DRAFT a PAUSED no está permitida');
    });

    it('TC-SERVICE-008-06: debe lanzar error en transición desde ARCHIVED', () => {
      expect(() => {
        serviceStateMachine.transitionTo(mockServiceArchived, 'ACTIVE', mockVerifiedContractor);
      }).toThrow(InvalidStateTransitionError);
    });

    it('TC-SERVICE-008-07: debe lanzar PublicationRequirementsNotMetError si no hay imágenes', () => {
      expect(() => {
        serviceStateMachine.transitionTo(mockServiceDraftNoImages, 'ACTIVE', mockVerifiedContractor);
      }).toThrow(PublicationRequirementsNotMetError);
    });

    it('TC-SERVICE-008-08: debe lanzar PublicationRequirementsNotMetError si contratista no verificado', () => {
      expect(() => {
        serviceStateMachine.transitionTo(mockServiceDraft, 'ACTIVE', mockUnverifiedContractor);
      }).toThrow(PublicationRequirementsNotMetError);

      try {
        serviceStateMachine.transitionTo(mockServiceDraft, 'ACTIVE', mockUnverifiedContractor);
      } catch (error) {
        if (error instanceof PublicationRequirementsNotMetError) {
          expect(error.violations).toContain('El contratista debe estar verificado para publicar servicios');
        }
      }
    });

    it('TC-SERVICE-008-09: debe permitir mismo estado sin validar requisitos (idempotente)', () => {
      // DRAFT → DRAFT (sin validación de publicación)
      expect(() => {
        serviceStateMachine.transitionTo(mockServiceDraftNoImages, 'DRAFT', mockUnverifiedContractor);
      }).not.toThrow();

      // ACTIVE → ACTIVE
      expect(() => {
        serviceStateMachine.transitionTo(mockServiceActive, 'ACTIVE', mockVerifiedContractor);
      }).not.toThrow();
    });

    it('TC-SERVICE-008-10: debe validar solo en transición DRAFT → ACTIVE', () => {
      // PAUSED → ACTIVE no requiere validación de publicación (ya fue publicado antes)
      const pausedServiceWithoutImages = {
        ...mockServicePaused,
        images: [],
      };

      expect(() => {
        serviceStateMachine.transitionTo(pausedServiceWithoutImages, 'ACTIVE', mockVerifiedContractor);
      }).not.toThrow();
    });

    it('TC-SERVICE-008-11: debe incluir todas las violaciones en el error', () => {
      const incompleteService = {
        ...mockServiceDraft,
        title: '',
        images: [],
      };

      try {
        serviceStateMachine.transitionTo(incompleteService, 'ACTIVE', mockUnverifiedContractor);
        fail('Debería haber lanzado PublicationRequirementsNotMetError');
      } catch (error) {
        if (error instanceof PublicationRequirementsNotMetError) {
          expect(error.violations.length).toBeGreaterThan(0);
          expect(error.violations).toContain('El contratista debe estar verificado para publicar servicios');
          expect(error.violations).toContain('El servicio debe tener al menos una imagen');
          expect(error.violations).toContain('El título del servicio es requerido');
        } else {
          fail('Debería lanzar PublicationRequirementsNotMetError');
        }
      }
    });
  });
});
