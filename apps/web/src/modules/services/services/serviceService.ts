import type { ServiceVisibilityStatus } from '@prisma/client';
import { serviceRepository } from '../repositories/serviceRepository';
import { serviceCategoryRepository } from '../repositories/serviceCategoryRepository';
import { contractorProfileRepository } from '@/modules/contractors/repositories/contractorProfileRepository';
import { createServiceSchema, updateServiceSchema } from '../validators';
import {
  ServiceNotFoundError,
  UnauthorizedServiceAccessError,
  InvalidStateTransitionError,
  ServiceCategoryNotFoundError,
} from '../errors';
import { serviceStateMachine } from './serviceStateMachine';
import { isServiceOwner, canPublishService } from '../utils/authz';
import type {
  ServiceDTO,
  ServicePublicDTO,
  CreateServiceDTO,
  UpdateServiceDTO,
  ServiceSearchFilters,
  ServiceListResponseDTO,
} from '../types';
import type { ContractorProfileDTO } from '@/modules/contractors/types';

/**
 * Service domain service for business logic
 *
 * Handles:
 * - Service CRUD operations
 * - State machine transitions (DRAFT → ACTIVE → PAUSED → ARCHIVED)
 * - Authorization checks
 * - Publication requirements validation
 */
export const serviceService = {
  /**
   * Create a new service
   *
   * Business rules:
   * - Only contractors can create services
   * - Services start in DRAFT status
   * - Contractor must have a valid profile
   *
   * @param data - Service creation data
   * @param contractorId - ID of the contractor creating the service
   * @returns Created service DTO
   * @throws {Error} If contractor profile not found
   */
  async createService(
    data: CreateServiceDTO,
    userId: string
  ): Promise<ServiceDTO> {
    // Validate input with Zod
    const validated = createServiceSchema.parse(data);

    // Verify category exists
    const category = await serviceCategoryRepository.findById(validated.categoryId);
    if (!category) {
      throw new ServiceCategoryNotFoundError(validated.categoryId);
    }

    // Verify contractor exists (lookup by User ID, not ContractorProfile ID)
    const contractor = await contractorProfileRepository.findByUserId(userId);
    if (!contractor) {
      throw new Error(`Perfil de contratista no encontrado para el usuario ${userId}`);
    }

    // Create service in DRAFT status
    const service = await serviceRepository.create(validated, contractor.userId);

    return service;
  },

  /**
   * Get service by ID
   *
   * Business rules:
   * - Service owner can see their service in any status
   * - Admins can see any service in any status
   * - Public users can only see ACTIVE services
   *
   * @param id - Service ID
   * @param requesterId - ID of the user requesting the service (optional)
   * @param requesterRole - Role of the requester (CLIENT | CONTRACTOR | ADMIN)
   * @returns Service DTO or null if not found/unauthorized
   */
  async getServiceById(
    id: string,
    requesterId?: string,
    requesterRole?: string
  ): Promise<ServiceDTO | null> {
    const service = await serviceRepository.findById(id);

    if (!service) {
      return null;
    }

    // Admins can see any service
    if (requesterRole === 'ADMIN') {
      return service;
    }

    // Service owner can see their own service
    if (requesterId && isServiceOwner(service, requesterId)) {
      return service;
    }

    // Public users can only see ACTIVE services
    if (service.visibilityStatus !== 'ACTIVE') {
      return null;
    }

    return service;
  },

  /**
   * Get all services for a contractor
   *
   * Business rules:
   * - Contractor can see all their own services regardless of status
   * - Filters can be applied (status, etc.)
   *
   * @param contractorId - Contractor ID
   * @param filters - Optional filters (status)
   * @returns Array of service DTOs
   */
  async getContractorServices(
    contractorId: string,
    filters?: { status?: ServiceVisibilityStatus }
  ): Promise<ServiceDTO[]> {
    const services = await serviceRepository.findByContractorId(contractorId, filters);

    return services;
  },

  /**
   * Search active services (public catalog)
   *
   * Business rules:
   * - Only ACTIVE services are returned
   * - Supports filtering by category, price range, search term
   * - Returns paginated results
   *
   * @param filters - Search filters (category, price, search, pagination)
   * @returns Paginated list of public service DTOs
   */
  async getActiveServices(
    filters: ServiceSearchFilters
  ): Promise<ServiceListResponseDTO> {
    // Repository already returns the full ServiceListResponseDTO with pagination
    return await serviceRepository.findActiveServices(filters);
  },

  /**
   * Update service
   *
   * Business rules:
   * - Only service owner can update their service
   * - Cannot update ARCHIVED services
   * - Updating a service does not change its status
   *
   * @param id - Service ID
   * @param data - Update data
   * @param contractorId - ID of contractor making the update
   * @returns Updated service DTO
   * @throws {ServiceNotFoundError} If service not found
   * @throws {UnauthorizedServiceAccessError} If contractor is not the owner
   * @throws {InvalidStateTransitionError} If service is ARCHIVED
   */
  async updateService(
    id: string,
    data: UpdateServiceDTO,
    contractorId: string
  ): Promise<ServiceDTO> {
    // Validate input with Zod
    const validated = updateServiceSchema.parse(data);

    // Get service
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new ServiceNotFoundError(id);
    }

    // Verify ownership
    if (!isServiceOwner(service, contractorId)) {
      throw new UnauthorizedServiceAccessError(
        'Solo el dueño del servicio puede actualizarlo'
      );
    }

    // Cannot update ARCHIVED services
    if (service.visibilityStatus === 'ARCHIVED') {
      throw new InvalidStateTransitionError(
        'ARCHIVED',
        'UPDATE',
        'No se pueden actualizar servicios archivados'
      );
    }

    // Update service
    const updatedService = await serviceRepository.update(id, validated);

    return updatedService;
  },

  /**
   * Publish service (DRAFT → ACTIVE)
   *
   * Business rules:
   * - Only service owner can publish
   * - Contractor must be verified
   * - All required fields must be filled
   * - Updates lastPublishedAt timestamp
   *
   * @param id - Service ID
   * @param contractorId - ID of contractor publishing the service
   * @returns Published service DTO
   * @throws {ServiceNotFoundError} If service not found
   * @throws {UnauthorizedServiceAccessError} If contractor is not the owner
   * @throws {InvalidStateTransitionError} If transition is not allowed
   * @throws {PublicationRequirementsNotMetError} If publication requirements not met
   */
  async publishService(
    id: string,
    contractorId: string
  ): Promise<ServiceDTO> {
    // Get service
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new ServiceNotFoundError(id);
    }

    // Verify ownership
    if (!isServiceOwner(service, contractorId)) {
      throw new UnauthorizedServiceAccessError(
        'Solo el dueño del servicio puede publicarlo'
      );
    }

    // Get contractor profile for validation
    // service.contractorId is the User ID, not the ContractorProfile ID
    const contractor = await contractorProfileRepository.findByUserId(contractorId);
    if (!contractor) {
      throw new Error(`Perfil de contratista no encontrado para el usuario ${contractorId}`);
    }

    // Validate state transition and publication requirements
    serviceStateMachine.transitionTo(service, 'ACTIVE', contractor);

    // Update status to ACTIVE (repository automatically updates lastPublishedAt for ACTIVE)
    const publishedService = await serviceRepository.updateVisibilityStatus(id, 'ACTIVE');

    return publishedService;
  },

  /**
   * Pause service (ACTIVE → PAUSED)
   *
   * Business rules:
   * - Only service owner can pause
   * - Service must be ACTIVE
   * - Paused services are not visible in catalog
   *
   * @param id - Service ID
   * @param contractorId - ID of contractor pausing the service
   * @returns Paused service DTO
   * @throws {ServiceNotFoundError} If service not found
   * @throws {UnauthorizedServiceAccessError} If contractor is not the owner
   * @throws {InvalidStateTransitionError} If service is not ACTIVE
   */
  async pauseService(
    id: string,
    contractorId: string
  ): Promise<ServiceDTO> {
    // Get service
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new ServiceNotFoundError(id);
    }

    // Verify ownership
    if (!isServiceOwner(service, contractorId)) {
      throw new UnauthorizedServiceAccessError(
        'Solo el dueño del servicio puede pausarlo'
      );
    }

    // Get contractor profile for state machine validation
    const contractor = await contractorProfileRepository.findByUserId(contractorId);
    if (!contractor) {
      throw new Error(`Perfil de contratista no encontrado para el usuario ${contractorId}`);
    }

    // Validate state transition
    serviceStateMachine.transitionTo(service, 'PAUSED', contractor);

    // Update status to PAUSED
    const pausedService = await serviceRepository.updateVisibilityStatus(id, 'PAUSED');

    return pausedService;
  },

  /**
   * Delete service (ANY → ARCHIVED)
   *
   * Business rules:
   * - Only service owner can delete (archive)
   * - This is a soft delete (status = ARCHIVED)
   * - Cannot be undone (ARCHIVED is terminal state)
   * - MVP: Skip check for active bookings
   *
   * @param id - Service ID
   * @param contractorId - ID of contractor deleting the service
   * @throws {ServiceNotFoundError} If service not found
   * @throws {UnauthorizedServiceAccessError} If contractor is not the owner
   */
  async deleteService(
    id: string,
    contractorId: string
  ): Promise<void> {
    // Get service
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new ServiceNotFoundError(id);
    }

    // Verify ownership
    if (!isServiceOwner(service, contractorId)) {
      throw new UnauthorizedServiceAccessError(
        'Solo el dueño del servicio puede eliminarlo'
      );
    }

    // Get contractor profile for state machine validation
    const contractor = await contractorProfileRepository.findByUserId(contractorId);
    if (!contractor) {
      throw new Error(`Perfil de contratista no encontrado para el usuario ${contractorId}`);
    }

    // Validate state transition to ARCHIVED
    serviceStateMachine.transitionTo(service, 'ARCHIVED', contractor);

    // Archive service (soft delete)
    await serviceRepository.delete(id);
  },

  /**
   * Admin: Get all services with filters (for moderation)
   *
   * Business rules:
   * - Only admins can access this endpoint
   * - Can view services in any status (DRAFT, ACTIVE, PAUSED, ARCHIVED)
   * - Supports filtering by status, contractorId, categoryId
   * - Returns paginated results
   *
   * @param filters - Search filters with admin-specific options
   * @returns Paginated list of service DTOs (not public DTOs)
   */
  async adminGetAllServices(
    filters: ServiceSearchFilters
  ): Promise<ServiceListResponseDTO> {
    // Use repository method that supports status filter
    // For admin, we return full ServiceDTO (not just public subset)
    return await serviceRepository.findActiveServices(filters);
  },

  /**
   * Admin: Pause service for moderation (ACTIVE → PAUSED)
   *
   * Business rules:
   * - Only admins can pause services for moderation
   * - Service must be ACTIVE
   * - This is a moderation action (different from contractor self-pause)
   * - Audit log should capture admin action
   *
   * @param id - Service ID
   * @param adminUserId - ID of admin performing the action
   * @returns Paused service DTO
   * @throws {ServiceNotFoundError} If service not found
   * @throws {InvalidStateTransitionError} If service is not ACTIVE
   */
  async adminPauseService(
    id: string,
    adminUserId: string
  ): Promise<ServiceDTO> {
    // Get service
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new ServiceNotFoundError(id);
    }

    // Get contractor profile for state machine validation
    const contractor = await contractorProfileRepository.findById(service.contractorId);
    if (!contractor) {
      throw new Error(`Perfil de contratista ${service.contractorId} no encontrado`);
    }

    // Validate state transition (will throw if current status != ACTIVE)
    serviceStateMachine.transitionTo(service, 'PAUSED', contractor);

    // Update status to PAUSED
    const pausedService = await serviceRepository.updateVisibilityStatus(id, 'PAUSED');

    // Audit log (MVP: console.log, future: proper audit service)
    console.log('[AUDIT] Admin pause service', {
      adminUserId,
      serviceId: id,
      contractorId: service.contractorId,
      previousStatus: service.visibilityStatus,
      newStatus: 'PAUSED',
      timestamp: new Date().toISOString(),
    });

    return pausedService;
  },

  /**
   * Admin: Activate service (PAUSED → ACTIVE)
   *
   * Business rules:
   * - Only admins can reactivate paused services
   * - Service must be PAUSED
   * - This is a moderation action (reinstating a service after review)
   * - Audit log should capture admin action
   *
   * @param id - Service ID
   * @param adminUserId - ID of admin performing the action
   * @returns Activated service DTO
   * @throws {ServiceNotFoundError} If service not found
   * @throws {InvalidStateTransitionError} If service is not PAUSED
   */
  async adminActivateService(
    id: string,
    adminUserId: string
  ): Promise<ServiceDTO> {
    // Get service
    const service = await serviceRepository.findById(id);
    if (!service) {
      throw new ServiceNotFoundError(id);
    }

    // Get contractor profile for state machine validation
    const contractor = await contractorProfileRepository.findById(service.contractorId);
    if (!contractor) {
      throw new Error(`Perfil de contratista ${service.contractorId} no encontrado`);
    }

    // Validate state transition (will throw if current status != PAUSED)
    serviceStateMachine.transitionTo(service, 'ACTIVE', contractor);

    // Update status to ACTIVE
    const activatedService = await serviceRepository.updateVisibilityStatus(id, 'ACTIVE');

    // Audit log (MVP: console.log, future: proper audit service)
    console.log('[AUDIT] Admin activate service', {
      adminUserId,
      serviceId: id,
      contractorId: service.contractorId,
      previousStatus: service.visibilityStatus,
      newStatus: 'ACTIVE',
      timestamp: new Date().toISOString(),
    });

    return activatedService;
  },
};
