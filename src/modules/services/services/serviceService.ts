/**
 * Service Business Logic
 *
 * Business layer for contractor services including state machine and validation
 *
 * @module services/services/serviceService
 */

import type {
  ServiceDTO,
  CreateServiceDTO,
  UpdateServiceDTO,
  ServiceStatus,
  ServiceQueryFilters,
} from '../types';
import { serviceRepository } from '../repositories/serviceRepository';
import {
  ServiceNotFoundError,
  InvalidServiceStateTransitionError,
  UnauthorizedServiceActionError,
  ServicePublicationRequirementsNotMetError,
  ServiceHasActiveBookingsError,
} from '../errors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// Service Service (Business Logic)
// ============================================================================

export class ServiceService {
  /**
   * Create a new service draft for a contractor
   *
   * Creates a new service with initial status DRAFT. Validates that:
   * - Contractor exists and has CONTRACTOR role
   * - Category exists
   * - All required fields are present
   *
   * @param contractorId - User ID of the contractor creating the service
   * @param data - Service creation data
   * @returns Created service with DRAFT status
   * @throws {UnauthorizedServiceActionError} If user is not a contractor
   * @throws {CategoryNotFoundError} If category doesn't exist
   */
  async createService(contractorId: string, data: CreateServiceDTO): Promise<ServiceDTO> {
    // Validate contractor exists and has CONTRACTOR role
    const contractor = await prisma.user.findUnique({
      where: { id: contractorId },
      include: { contractorProfile: true },
    });

    if (!contractor || contractor.role !== 'CONTRACTOR') {
      throw new UnauthorizedServiceActionError(
        'create service',
        'User must have CONTRACTOR role'
      );
    }

    // Validate category exists
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new Error(`Category with ID ${data.categoryId} not found`);
    }

    // Create service with DRAFT status (default in repository)
    return await serviceRepository.create(contractorId, data);
  }

  /**
   * Get service by ID with visibility rules
   *
   * Applies visibility rules based on service status and requester:
   * - ACTIVE: visible to everyone
   * - DRAFT/PAUSED: only visible to owner and admins
   * - ARCHIVED: only visible to admins
   *
   * @param serviceId - ID of the service to retrieve
   * @param requesterId - ID of the user requesting the service (optional for public)
   * @param isAdmin - Whether the requester is an admin
   * @returns Service data with relations
   * @throws {ServiceNotFoundError} If service doesn't exist or not visible
   */
  async getService(serviceId: string, requesterId?: string, isAdmin: boolean = false): Promise<ServiceDTO> {
    const service = await serviceRepository.findById(serviceId, true);

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    // Apply visibility rules
    if (service.visibilityStatus === 'ACTIVE') {
      // ACTIVE services are public
      return service;
    }

    if (service.visibilityStatus === 'ARCHIVED' && !isAdmin) {
      // ARCHIVED services only visible to admins
      throw new ServiceNotFoundError(serviceId);
    }

    if ((service.visibilityStatus === 'DRAFT' || service.visibilityStatus === 'PAUSED')) {
      // DRAFT/PAUSED visible only to owner or admin
      if (!requesterId || (service.contractorId !== requesterId && !isAdmin)) {
        throw new ServiceNotFoundError(serviceId);
      }
    }

    return service;
  }

  /**
   * Get all services owned by a contractor
   *
   * Returns all services for a contractor regardless of status.
   * Supports filtering and pagination.
   *
   * @param contractorId - ID of the contractor
   * @param filters - Optional filters (status, pagination)
   * @returns Array of services owned by contractor
   */
  async getContractorServices(
    contractorId: string,
    filters?: ServiceQueryFilters
  ): Promise<ServiceDTO[]> {
    return await serviceRepository.findByContractorId(contractorId, filters);
  }

  /**
   * Get public active services (catalog)
   *
   * Returns only ACTIVE services visible in the public catalog.
   * Supports filtering by category, price range, and pagination.
   *
   * @param filters - Optional filters (category, price, pagination)
   * @returns Array of public active services
   */
  async getPublicServices(filters?: ServiceQueryFilters): Promise<ServiceDTO[]> {
    return await serviceRepository.findPublicServices(filters);
  }

  /**
   * Update service details
   *
   * Updates service data with state-based restrictions:
   * - DRAFT: can edit freely
   * - ACTIVE: re-validates publication requirements after edit
   * - PAUSED: can edit freely
   * - ARCHIVED: cannot edit
   *
   * @param serviceId - ID of service to update
   * @param requesterId - ID of user making the update
   * @param data - Fields to update
   * @returns Updated service
   * @throws {ServiceNotFoundError} If service doesn't exist
   * @throws {UnauthorizedServiceActionError} If not owner
   * @throws {InvalidServiceStateTransitionError} If trying to edit ARCHIVED service
   */
  async updateService(
    serviceId: string,
    requesterId: string,
    data: UpdateServiceDTO
  ): Promise<ServiceDTO> {
    const service = await serviceRepository.findById(serviceId, true);

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    // Check ownership
    if (service.contractorId !== requesterId) {
      throw new UnauthorizedServiceActionError(
        'update service',
        'Only the service owner can update this service'
      );
    }

    // Cannot edit archived services
    if (service.visibilityStatus === 'ARCHIVED') {
      throw new InvalidServiceStateTransitionError(
        service.visibilityStatus,
        service.visibilityStatus,
        'Cannot edit archived services'
      );
    }

    // Validate category if being updated
    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new Error(`Category with ID ${data.categoryId} not found`);
      }
    }

    // Update service
    const updatedService = await serviceRepository.update(serviceId, data);

    // If service is ACTIVE, re-validate publication requirements
    if (updatedService.visibilityStatus === 'ACTIVE') {
      const missingRequirements = await this.validatePublicationRequirements(updatedService);

      if (missingRequirements.length > 0) {
        // Automatically move back to DRAFT if requirements no longer met
        return await serviceRepository.updateStatus(serviceId, 'DRAFT');
      }
    }

    return updatedService;
  }

  /**
   * Publish service (DRAFT → ACTIVE or PAUSED → ACTIVE)
   *
   * Validates publication requirements before transitioning to ACTIVE:
   * - Contractor must be verified
   * - At least 1 image uploaded
   * - All required fields present
   * - Valid price and duration
   *
   * @param serviceId - ID of service to publish
   * @param requesterId - ID of user requesting publication
   * @returns Published service with ACTIVE status
   * @throws {ServiceNotFoundError} If service doesn't exist
   * @throws {UnauthorizedServiceActionError} If not owner or contractor not verified
   * @throws {ServicePublicationRequirementsNotMetError} If requirements not met
   * @throws {InvalidServiceStateTransitionError} If invalid transition
   */
  async publishService(serviceId: string, requesterId: string): Promise<ServiceDTO> {
    const service = await serviceRepository.findById(serviceId, true);

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    // Check ownership
    if (service.contractorId !== requesterId) {
      throw new UnauthorizedServiceActionError(
        'publish service',
        'Only the service owner can publish this service'
      );
    }

    // Validate state transition
    if (!this.isValidStateTransition(service.visibilityStatus, 'ACTIVE')) {
      throw new InvalidServiceStateTransitionError(
        service.visibilityStatus,
        'ACTIVE'
      );
    }

    // Validate publication requirements
    const missingRequirements = await this.validatePublicationRequirements(service);

    if (missingRequirements.length > 0) {
      throw new ServicePublicationRequirementsNotMetError(missingRequirements);
    }

    // Publish service
    return await serviceRepository.updateStatus(serviceId, 'ACTIVE');
  }

  /**
   * Pause service (ACTIVE → PAUSED)
   *
   * Temporarily hides service from catalog while preserving data.
   * Can be done by owner or admin (for moderation).
   *
   * @param serviceId - ID of service to pause
   * @param requesterId - ID of user requesting pause
   * @param isAdmin - Whether requester is admin (for moderation)
   * @returns Paused service
   * @throws {ServiceNotFoundError} If service doesn't exist
   * @throws {UnauthorizedServiceActionError} If not owner or admin
   * @throws {InvalidServiceStateTransitionError} If not in ACTIVE state
   */
  async pauseService(serviceId: string, requesterId: string, isAdmin: boolean = false): Promise<ServiceDTO> {
    const service = await serviceRepository.findById(serviceId, false);

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    // Check authorization (owner or admin)
    if (!isAdmin && service.contractorId !== requesterId) {
      throw new UnauthorizedServiceActionError(
        'pause service',
        'Only the service owner or an admin can pause this service'
      );
    }

    // Validate state transition
    if (!this.isValidStateTransition(service.visibilityStatus, 'PAUSED')) {
      throw new InvalidServiceStateTransitionError(
        service.visibilityStatus,
        'PAUSED',
        'Can only pause ACTIVE services'
      );
    }

    return await serviceRepository.updateStatus(serviceId, 'PAUSED');
  }

  /**
   * Reactivate service (PAUSED → ACTIVE)
   *
   * Reactivates a paused service after re-validating publication requirements.
   *
   * @param serviceId - ID of service to reactivate
   * @param requesterId - ID of user requesting reactivation
   * @returns Reactivated service
   * @throws {ServiceNotFoundError} If service doesn't exist
   * @throws {UnauthorizedServiceActionError} If not owner
   * @throws {ServicePublicationRequirementsNotMetError} If requirements not met
   * @throws {InvalidServiceStateTransitionError} If not in PAUSED state
   */
  async reactivateService(serviceId: string, requesterId: string): Promise<ServiceDTO> {
    const service = await serviceRepository.findById(serviceId, true);

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    // Check ownership
    if (service.contractorId !== requesterId) {
      throw new UnauthorizedServiceActionError(
        'reactivate service',
        'Only the service owner can reactivate this service'
      );
    }

    // Validate state transition
    if (!this.isValidStateTransition(service.visibilityStatus, 'ACTIVE')) {
      throw new InvalidServiceStateTransitionError(
        service.visibilityStatus,
        'ACTIVE',
        'Can only reactivate PAUSED services'
      );
    }

    // Re-validate publication requirements
    const missingRequirements = await this.validatePublicationRequirements(service);

    if (missingRequirements.length > 0) {
      throw new ServicePublicationRequirementsNotMetError(missingRequirements);
    }

    return await serviceRepository.updateStatus(serviceId, 'ACTIVE');
  }

  /**
   * Unpublish service (ACTIVE/PAUSED → DRAFT)
   *
   * Moves service back to draft state. Only allowed if no active bookings exist.
   *
   * @param serviceId - ID of service to unpublish
   * @param requesterId - ID of user requesting unpublish
   * @returns Unpublished service with DRAFT status
   * @throws {ServiceNotFoundError} If service doesn't exist
   * @throws {UnauthorizedServiceActionError} If not owner
   * @throws {ServiceHasActiveBookingsError} If service has active bookings
   * @throws {InvalidServiceStateTransitionError} If invalid transition
   */
  async unpublishService(serviceId: string, requesterId: string): Promise<ServiceDTO> {
    const service = await serviceRepository.findById(serviceId, false);

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    // Check ownership
    if (service.contractorId !== requesterId) {
      throw new UnauthorizedServiceActionError(
        'unpublish service',
        'Only the service owner can unpublish this service'
      );
    }

    // Validate state transition
    if (!this.isValidStateTransition(service.visibilityStatus, 'DRAFT')) {
      throw new InvalidServiceStateTransitionError(
        service.visibilityStatus,
        'DRAFT'
      );
    }

    // Check for active bookings (future: query booking module)
    // For now, we'll skip this check as booking module may not be implemented
    const activeBookings = await prisma.booking.count({
      where: {
        serviceId: serviceId,
        status: {
          in: ['PENDING_PAYMENT', 'CONFIRMED', 'ON_ROUTE', 'ON_SITE', 'IN_PROGRESS'],
        },
      },
    });

    if (activeBookings > 0) {
      throw new ServiceHasActiveBookingsError(serviceId, activeBookings);
    }

    return await serviceRepository.updateStatus(serviceId, 'DRAFT');
  }

  /**
   * Delete service (soft-delete to ARCHIVED)
   *
   * Soft-deletes service by setting status to ARCHIVED.
   * Cannot delete services with active bookings.
   *
   * @param serviceId - ID of service to delete
   * @param requesterId - ID of user requesting deletion
   * @throws {ServiceNotFoundError} If service doesn't exist
   * @throws {UnauthorizedServiceActionError} If not owner
   * @throws {ServiceHasActiveBookingsError} If service has active bookings
   */
  async deleteService(serviceId: string, requesterId: string): Promise<void> {
    const service = await serviceRepository.findById(serviceId, false);

    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    // Check ownership
    if (service.contractorId !== requesterId) {
      throw new UnauthorizedServiceActionError(
        'delete service',
        'Only the service owner can delete this service'
      );
    }

    // Check for active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        serviceId: serviceId,
        status: {
          in: ['PENDING_PAYMENT', 'CONFIRMED', 'ON_ROUTE', 'ON_SITE', 'IN_PROGRESS'],
        },
      },
    });

    if (activeBookings > 0) {
      throw new ServiceHasActiveBookingsError(serviceId, activeBookings);
    }

    await serviceRepository.softDelete(serviceId);
  }

  // ========================================================================
  // Validation Helpers (Private)
  // ========================================================================

  /**
   * Validate publication requirements
   *
   * Checks all requirements for publishing a service:
   * - Contractor profile verified
   * - At least 1 image
   * - Valid price and duration
   * - Title and description present
   *
   * @param service - Service to validate
   * @returns Array of missing requirement messages (empty if all met)
   */
  private async validatePublicationRequirements(service: ServiceDTO): Promise<string[]> {
    const errors: string[] = [];

    // Check contractor is verified
    const contractor = await prisma.user.findUnique({
      where: { id: service.contractorId },
      include: { contractorProfile: true },
    });

    if (!contractor?.contractorProfile?.verified) {
      errors.push('Contractor profile must be verified');
    }

    // Check at least 1 image
    const imageCount = await prisma.serviceImage.count({
      where: { serviceId: service.id },
    });

    if (imageCount === 0) {
      errors.push('Service must have at least 1 image');
    }

    // Check required fields
    if (!service.title || service.title.length < 5 || service.title.length > 100) {
      errors.push('Title must be between 5 and 100 characters');
    }

    if (!service.description || service.description.length < 50 || service.description.length > 2000) {
      errors.push('Description must be between 50 and 2000 characters');
    }

    // Check price range
    if (service.basePrice < 50 || service.basePrice > 50000) {
      errors.push('Base price must be between 50 and 50000 MXN');
    }

    // Check duration
    if (service.durationMinutes < 30 || service.durationMinutes > 480) {
      errors.push('Duration must be between 30 and 480 minutes');
    }

    return errors;
  }

  /**
   * Validate state transition is allowed
   *
   * Checks if a state transition is valid according to the state machine:
   * - DRAFT → ACTIVE (if requirements met)
   * - ACTIVE ↔ PAUSED
   * - ACTIVE/PAUSED → DRAFT (if no active bookings)
   * - Any → ARCHIVED
   *
   * @param from - Current status
   * @param to - Target status
   * @returns true if transition is valid, false otherwise
   */
  private isValidStateTransition(from: ServiceStatus, to: ServiceStatus): boolean {
    // Self-transition always allowed (no-op)
    if (from === to) {
      return true;
    }

    // Define allowed transitions
    const allowedTransitions: Record<ServiceStatus, ServiceStatus[]> = {
      DRAFT: ['ACTIVE', 'ARCHIVED'],
      ACTIVE: ['PAUSED', 'DRAFT', 'ARCHIVED'],
      PAUSED: ['ACTIVE', 'DRAFT', 'ARCHIVED'],
      ARCHIVED: [], // Cannot transition out of ARCHIVED
    };

    return allowedTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Check if user owns the service
   *
   * @param serviceId - ID of service to check
   * @param userId - ID of user to check ownership
   * @returns true if user is owner, false otherwise
   */
  private async checkOwnership(serviceId: string, userId: string): Promise<boolean> {
    const service = await serviceRepository.findById(serviceId, false);
    return service?.contractorId === userId;
  }
}

// Singleton instance
export const serviceService = new ServiceService();
