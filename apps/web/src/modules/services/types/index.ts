/**
 * Service Types and DTOs
 *
 * Type definitions for contractor services module including service data,
 * state transitions, and API responses.
 * Re-exports specialized types from category and image modules.
 *
 * @module services/types
 */

import type { Prisma } from '@prisma/client';

// ============================================================================
// Re-export specialized types
// ============================================================================

export * from './category';
export * from './image';

// ============================================================================
// Enums
// ============================================================================

/**
 * Service visibility status enum
 * Controls service lifecycle and public visibility
 */
export enum ServiceStatus {
  /** Service under construction, not public, freely editable */
  DRAFT = 'DRAFT',
  /** Published and discoverable in catalog */
  ACTIVE = 'ACTIVE',
  /** Temporarily hidden from catalog, preserves data */
  PAUSED = 'PAUSED',
  /** Soft-deleted, hidden, admin-only restoration */
  ARCHIVED = 'ARCHIVED',
}

/**
 * Supported currencies for service pricing
 * MVP supports MXN only
 */
export enum Currency {
  /** Mexican Peso */
  MXN = 'MXN',
}

// ============================================================================
// Service DTOs
// ============================================================================

/**
 * Complete service data including relations
 */
export interface ServiceDTO {
  id: string;
  contractorId: string;
  categoryId: string;
  title: string;
  description: string;
  basePrice: number;  // Decimal as number for JSON serialization
  currency: Currency;
  durationMinutes: number;
  visibilityStatus: ServiceStatus;
  lastPublishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Included relations (optional)
  category?: CategorySummaryDTO;
  contractor?: ContractorSummaryDTO;
  images?: ServiceImageDTO[];
}

/**
 * Public-safe service DTO (for catalog listing)
 * Excludes sensitive contractor details
 */
export interface PublicServiceDTO {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  currency: Currency;
  durationMinutes: number;
  categoryName: string;
  categorySlug: string;
  images: PublicImageDTO[];
  contractorName: string;
  contractorVerified: boolean;
  contractorRating?: number;  // Future: from ratings module
  lastPublishedAt: Date;
}

/**
 * Input for creating a new service
 */
export interface CreateServiceDTO {
  title: string;
  categoryId: string;
  description: string;
  basePrice: number;
  currency: Currency;
  durationMinutes: number;
}

/**
 * Input for updating an existing service
 */
export interface UpdateServiceDTO {
  title?: string;
  categoryId?: string;
  description?: string;
  basePrice?: number;
  currency?: Currency;
  durationMinutes?: number;
}

/**
 * Service listing query filters
 */
export interface ServiceQueryFilters {
  categoryId?: string;
  contractorId?: string;
  visibilityStatus?: ServiceStatus;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

/**
 * Paginated service response
 */
export interface PaginatedServicesDTO {
  services: PublicServiceDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}


// ============================================================================
// Contractor Summary DTO
// ============================================================================

/**
 * Contractor summary for service relations
 * Minimal data to avoid circular dependencies
 */
export interface ContractorSummaryDTO {
  id: string;
  businessName: string;
  verified: boolean;
  rating?: number;  // Future: from ratings module
}

// ============================================================================
// State Transition Types
// ============================================================================

/**
 * Valid state transitions for services
 */
export type ServiceStateTransition =
  | { from: ServiceStatus.DRAFT; to: ServiceStatus.ACTIVE }
  | { from: ServiceStatus.ACTIVE; to: ServiceStatus.PAUSED }
  | { from: ServiceStatus.PAUSED; to: ServiceStatus.ACTIVE }
  | { from: ServiceStatus.ACTIVE; to: ServiceStatus.DRAFT }
  | { from: ServiceStatus.PAUSED; to: ServiceStatus.DRAFT }
  | { from: ServiceStatus.DRAFT; to: ServiceStatus.ARCHIVED }
  | { from: ServiceStatus.ACTIVE; to: ServiceStatus.ARCHIVED }
  | { from: ServiceStatus.PAUSED; to: ServiceStatus.ARCHIVED };

/**
 * Validation result for state transitions
 */
export interface StateTransitionValidation {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// Prisma Type Helpers
// ============================================================================

/**
 * Prisma service with all relations
 */
export type ServiceWithRelations = Prisma.ServiceGetPayload<{
  include: {
    category: true;
    contractor: {
      include: {
        contractorProfile: true;
      };
    };
    images: true;
  };
}>;
