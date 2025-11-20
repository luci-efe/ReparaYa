/**
 * Category Types and DTOs
 *
 * Type definitions for service category taxonomy including
 * hierarchical structure and summary information.
 *
 * @module services/types/category
 */

import type { Prisma } from '@prisma/client';

// ============================================================================
// Category DTOs
// ============================================================================

/**
 * Category summary for service relations
 * Minimal data for efficient serialization
 */
export interface CategorySummaryDTO {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
}

/**
 * Complete category data with hierarchy
 * Includes optional parent/children relationships
 */
export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconUrl: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Optional relations
  parent?: CategorySummaryDTO;
  children?: CategorySummaryDTO[];
  serviceCount?: number;  // Aggregated count
}

/**
 * Input for creating a new category (admin only)
 */
export interface CreateCategoryDTO {
  name: string;
  slug: string;
  description: string;
  iconUrl?: string | null;
  parentId?: string | null;
}

/**
 * Input for updating an existing category
 */
export interface UpdateCategoryDTO {
  name?: string;
  slug?: string;
  description?: string;
  iconUrl?: string | null;
  parentId?: string | null;
}

/**
 * Category tree node for hierarchical display
 * Used for rendering category navigation
 */
export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  level: number;
  children: CategoryTreeNode[];
  serviceCount?: number;
}

// ============================================================================
// Prisma Type Helpers
// ============================================================================

/**
 * Prisma category with parent and children
 */
export type CategoryWithRelations = Prisma.ServiceCategoryGetPayload<{
  include: {
    parent: true;
    children: true;
  };
}>;

/**
 * Prisma category with service count
 */
export type CategoryWithCount = Prisma.ServiceCategoryGetPayload<{
  include: {
    _count: {
      select: {
        services: true;
      };
    };
  };
}>;
