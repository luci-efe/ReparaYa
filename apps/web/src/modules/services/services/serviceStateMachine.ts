import type { ServiceVisibilityStatus } from '@prisma/client';
import type { ServiceDTO } from '../types';
import type { ContractorProfileDTO } from '@/modules/contractors/types';
import { InvalidStateTransitionError, PublicationRequirementsNotMetError } from '../errors';
import { canPublishService } from '../utils/authz';

/**
 * State machine for service visibility status transitions
 *
 * State diagram:
 *
 *     DRAFT ──────→ ACTIVE ←──────→ PAUSED
 *       ↑             ↓                ↓
 *       └─────────────┴────────────────┘
 *                     ↓
 *                 ARCHIVED
 *
 * Transition rules:
 * - DRAFT → ACTIVE: Requires verified contractor, all required fields valid
 * - ACTIVE ↔ PAUSED: No restrictions (contractor can pause/resume anytime)
 * - ACTIVE/PAUSED → DRAFT: Allowed (skip booking check for MVP)
 * - ANY → ARCHIVED: Allowed (soft delete)
 * - ARCHIVED → ANY: Not allowed (archived is final)
 */

/**
 * Valid state transitions map
 * Key: current status, Value: array of allowed target statuses
 */
const VALID_TRANSITIONS: Record<ServiceVisibilityStatus, ServiceVisibilityStatus[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['PAUSED', 'DRAFT', 'ARCHIVED'],
  PAUSED: ['ACTIVE', 'DRAFT', 'ARCHIVED'],
  ARCHIVED: [], // Terminal state - no transitions allowed
};

/**
 * Service state machine implementation
 */
export const serviceStateMachine = {
  /**
   * Checks if a state transition is valid
   *
   * @param from - Current visibility status
   * @param to - Target visibility status
   * @returns true if the transition is allowed
   */
  canTransition(from: ServiceVisibilityStatus, to: ServiceVisibilityStatus): boolean {
    // Same state is always allowed (idempotent)
    if (from === to) {
      return true;
    }

    const allowedTargets = VALID_TRANSITIONS[from];
    return allowedTargets.includes(to);
  },

  /**
   * Validates publication requirements for a service
   *
   * Business rules for DRAFT → ACTIVE transition:
   * - Contractor must be verified
   * - All required fields must be filled:
   *   - title (non-empty)
   *   - description (non-empty)
   *   - categoryId (valid)
   *   - basePrice (> 0)
   *   - durationMinutes (> 0)
   *
   * @param service - The service to validate
   * @param contractor - The contractor profile
   * @returns Array of violation messages (empty if valid)
   */
  validatePublicationRequirements(
    service: ServiceDTO,
    contractor: ContractorProfileDTO
  ): string[] {
    const violations: string[] = [];

    // Check contractor verification status
    if (!canPublishService(contractor)) {
      violations.push('El contratista debe estar verificado para publicar servicios');
    }

    // Image check removed as per requirement
    // if (!service.images || service.images.length === 0) {
    //   violations.push('El servicio debe tener al menos una imagen');
    // }

    // Validate required fields
    if (!service.title || service.title.trim().length === 0) {
      violations.push('El título del servicio es requerido');
    }

    if (!service.description || service.description.trim().length === 0) {
      violations.push('La descripción del servicio es requerida');
    }

    if (!service.categoryId) {
      violations.push('La categoría del servicio es requerida');
    }

    if (service.basePrice <= 0) {
      violations.push('El precio base debe ser mayor a 0');
    }

    if (service.durationMinutes <= 0) {
      violations.push('La duración debe ser mayor a 0 minutos');
    }

    return violations;
  },

  /**
   * Attempts to transition a service to a new state
   *
   * This method validates the transition and throws errors if invalid.
   * It does NOT persist the change - the caller must update the database.
   *
   * @param service - The service to transition
   * @param newStatus - The target visibility status
   * @param contractor - The contractor profile (required for DRAFT → ACTIVE)
   * @throws {InvalidStateTransitionError} If the transition is not allowed
   * @throws {PublicationRequirementsNotMetError} If publishing requirements are not met
   */
  transitionTo(
    service: ServiceDTO,
    newStatus: ServiceVisibilityStatus,
    contractor: ContractorProfileDTO
  ): void {
    const currentStatus = service.visibilityStatus;

    // Check if transition is allowed by state machine
    if (!this.canTransition(currentStatus, newStatus)) {
      throw new InvalidStateTransitionError(
        currentStatus,
        newStatus,
        `La transición de ${currentStatus} a ${newStatus} no está permitida`
      );
    }

    // Special validation for DRAFT → ACTIVE (publication)
    if (currentStatus === 'DRAFT' && newStatus === 'ACTIVE') {
      const violations = this.validatePublicationRequirements(service, contractor);
      if (violations.length > 0) {
        throw new PublicationRequirementsNotMetError(violations);
      }
    }

    // If we get here, the transition is valid
    // The caller is responsible for persisting the state change
  },
};
