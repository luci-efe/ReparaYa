import type { ServiceDTO } from '../types';
import type { ContractorProfileDTO } from '@/modules/contractors/types';

/**
 * Authorization utilities for service operations
 */

/**
 * Checks if a contractor is the owner of a service
 *
 * @param service - The service to check
 * @param contractorId - The contractor ID to verify ownership
 * @returns true if the contractor owns the service
 */
export function isServiceOwner(service: ServiceDTO, contractorId: string): boolean {
  return service.contractorId === contractorId;
}

/**
 * Checks if a user can edit a service
 *
 * Business rules:
 * - Service owner (contractor) can always edit their own services
 * - Admins can edit any service
 * - Other users cannot edit services
 *
 * @param service - The service to check
 * @param userId - The user ID attempting to edit
 * @param role - The user's role (CLIENT | CONTRACTOR | ADMIN)
 * @returns true if the user can edit the service
 */
export function canEditService(service: ServiceDTO, userId: string, role: string): boolean {
  // Admins can edit any service
  if (role === 'ADMIN') {
    return true;
  }

  // For contractors, check ownership
  // Note: We need to verify that the userId corresponds to the contractor
  // This would typically be done by checking contractor.userId === userId
  // For now, we assume the service includes contractor info
  if (role === 'CONTRACTOR' && service.contractor) {
    return service.contractor.id === userId;
  }

  return false;
}

/**
 * Checks if a contractor can publish services
 *
 * Business rule:
 * - Only verified contractors can publish services (make them ACTIVE)
 *
 * @param contractor - The contractor profile
 * @returns true if the contractor can publish services
 */
export function canPublishService(contractor: ContractorProfileDTO): boolean {
  return contractor.verified === true;
}

/**
 * Checks if a user can moderate services
 *
 * Business rule:
 * - Only admins can moderate services (archive, force state changes)
 *
 * @param role - The user's role (CLIENT | CONTRACTOR | ADMIN)
 * @returns true if the user can moderate services
 */
export function canModerateService(role: string): boolean {
  return role === 'ADMIN';
}
