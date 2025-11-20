/**
 * Category Repository
 *
 * Data access layer for service category taxonomy using Prisma.
 * Handles hierarchical category structure with parent-child relationships.
 *
 * Features:
 * - CRUD operations for categories (admin only)
 * - Hierarchical queries (parent/children relationships)
 * - Slug-based lookups for SEO-friendly URLs
 * - Service count aggregation
 * - Category tree building
 *
 * @module services/repositories/categoryRepository
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import {
  CategoryNotFoundError,
  CategorySlugAlreadyExistsError,
  CircularCategoryHierarchyError,
} from '../errors';
import type {
  CategoryDTO,
  CategorySummaryDTO,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryTreeNode,
} from '../types';

// ============================================================================
// Type Mappers
// ============================================================================

/**
 * Map Prisma Category to CategoryDTO
 */
function mapCategoryToDTO(category: any): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    iconUrl: category.iconUrl,
    parentId: category.parentId,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    parent: category.parent
      ? {
          id: category.parent.id,
          name: category.parent.name,
          slug: category.parent.slug,
          iconUrl: category.parent.iconUrl,
        }
      : undefined,
    children: category.children?.map((child: any) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      iconUrl: child.iconUrl,
    })),
    serviceCount: category._count?.services,
  };
}

/**
 * Map Prisma Category to CategorySummaryDTO
 */
function mapCategoryToSummary(category: any): CategorySummaryDTO {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    iconUrl: category.iconUrl,
  };
}

// ============================================================================
// Category Repository
// ============================================================================

export class CategoryRepository {
  /**
   * Create a new category
   * Admin-only operation
   */
  async create(data: CreateCategoryDTO): Promise<CategoryDTO> {
    // Check if slug already exists
    const existing = await prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new CategorySlugAlreadyExistsError(data.slug);
    }

    // Verify parent exists if provided
    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new CategoryNotFoundError(data.parentId);
      }
    }

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        iconUrl: data.iconUrl ?? null,
        parentId: data.parentId ?? null,
      },
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            services: true,
          },
        },
      },
    });

    return mapCategoryToDTO(category);
  }

  /**
   * Find category by ID with optional relations
   */
  async findById(categoryId: string, includeRelations: boolean = false): Promise<CategoryDTO | null> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: includeRelations
        ? {
            parent: true,
            children: true,
            _count: {
              select: {
                services: true,
              },
            },
          }
        : undefined,
    });

    if (!category) {
      return null;
    }

    return mapCategoryToDTO(category);
  }

  /**
   * Find category by slug (SEO-friendly lookups)
   */
  async findBySlug(slug: string, includeRelations: boolean = false): Promise<CategoryDTO | null> {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: includeRelations
        ? {
            parent: true,
            children: true,
            _count: {
              select: {
                services: true,
              },
            },
          }
        : undefined,
    });

    if (!category) {
      return null;
    }

    return mapCategoryToDTO(category);
  }

  /**
   * Get all root categories (no parent)
   * Used for main navigation
   */
  async getRootCategories(): Promise<CategoryDTO[]> {
    const categories = await prisma.category.findMany({
      where: {
        parentId: null,
      },
      include: {
        children: true,
        _count: {
          select: {
            services: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories.map(mapCategoryToDTO);
  }

  /**
   * Get category with all children (one level deep)
   */
  async getWithChildren(categoryId: string): Promise<CategoryDTO | null> {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        parent: true,
        children: {
          include: {
            _count: {
              select: {
                services: true,
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        },
        _count: {
          select: {
            services: true,
          },
        },
      },
    });

    if (!category) {
      return null;
    }

    return mapCategoryToDTO(category);
  }

  /**
   * Get all categories as flat list
   */
  async findAll(): Promise<CategoryDTO[]> {
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        _count: {
          select: {
            services: true,
          },
        },
      },
      orderBy: [
        { parentId: 'asc' }, // Root categories first
        { name: 'asc' },
      ],
    });

    return categories.map(mapCategoryToDTO);
  }

  /**
   * Get category tree (hierarchical structure)
   * Recursively builds tree from root to leaves
   */
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    const allCategories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            services: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Build tree recursively
    const buildTree = (parentId: string | null, level: number = 0): CategoryTreeNode[] => {
      return allCategories
        .filter((cat) => cat.parentId === parentId)
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          iconUrl: cat.iconUrl,
          level,
          serviceCount: cat._count.services,
          children: buildTree(cat.id, level + 1),
        }));
    };

    return buildTree(null);
  }

  /**
   * Update category
   * Admin-only operation
   */
  async update(categoryId: string, data: UpdateCategoryDTO): Promise<CategoryDTO> {
    // Check if category exists
    const existing = await this.findById(categoryId);
    if (!existing) {
      throw new CategoryNotFoundError(categoryId);
    }

    // Check slug uniqueness if changing slug
    if (data.slug && data.slug !== existing.slug) {
      const slugExists = await prisma.category.findUnique({
        where: { slug: data.slug },
      });

      if (slugExists) {
        throw new CategorySlugAlreadyExistsError(data.slug);
      }
    }

    // Check for circular hierarchy if changing parent
    if (data.parentId) {
      const wouldCreateCycle = await this.wouldCreateCycle(categoryId, data.parentId);
      if (wouldCreateCycle) {
        throw new CircularCategoryHierarchyError(categoryId, data.parentId);
      }

      // Verify parent exists
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new CategoryNotFoundError(data.parentId);
      }
    }

    const updateData: Prisma.CategoryUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.iconUrl !== undefined) updateData.iconUrl = data.iconUrl;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            services: true,
          },
        },
      },
    });

    return mapCategoryToDTO(category);
  }

  /**
   * Delete category
   * Only allowed if no services are using it
   * Admin-only operation
   */
  async delete(categoryId: string): Promise<void> {
    const category = await this.findById(categoryId, true);
    if (!category) {
      throw new CategoryNotFoundError(categoryId);
    }

    // Check if category has services
    const serviceCount = await prisma.service.count({
      where: { categoryId },
    });

    if (serviceCount > 0) {
      throw new Error(
        `Cannot delete category "${category.name}": ${serviceCount} service(s) are using it`
      );
    }

    // Check if category has children
    const childrenCount = await prisma.category.count({
      where: { parentId: categoryId },
    });

    if (childrenCount > 0) {
      throw new Error(
        `Cannot delete category "${category.name}": it has ${childrenCount} subcategorie(s)`
      );
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });
  }

  /**
   * Count categories
   */
  async count(): Promise<number> {
    return prisma.category.count();
  }

  /**
   * Get categories by parent ID
   * Returns direct children of specified parent
   */
  async getChildCategories(parentId: string): Promise<CategoryDTO[]> {
    const categories = await prisma.category.findMany({
      where: {
        parentId,
      },
      include: {
        _count: {
          select: {
            services: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories.map(mapCategoryToDTO);
  }

  /**
   * Get category path (breadcrumbs)
   * Returns array from root to specified category
   */
  async getCategoryPath(categoryId: string): Promise<CategorySummaryDTO[]> {
    const path: CategorySummaryDTO[] = [];
    let currentId: string | null = categoryId;

    while (currentId) {
      const category = await prisma.category.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          name: true,
          slug: true,
          iconUrl: true,
          parentId: true,
        },
      });

      if (!category) break;

      path.unshift(mapCategoryToSummary(category));
      currentId = category.parentId;
    }

    return path;
  }

  /**
   * Check if changing parent would create circular hierarchy
   * Prevents infinite loops in category tree
   */
  private async wouldCreateCycle(categoryId: string, newParentId: string): Promise<boolean> {
    // Can't be its own parent
    if (categoryId === newParentId) {
      return true;
    }

    // Check if newParentId is a descendant of categoryId
    let currentId: string | null = newParentId;

    while (currentId) {
      if (currentId === categoryId) {
        return true;
      }

      const parent = await prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      currentId = parent?.parentId ?? null;
    }

    return false;
  }

  /**
   * Search categories by name
   */
  async search(query: string): Promise<CategoryDTO[]> {
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      include: {
        parent: true,
        _count: {
          select: {
            services: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      take: 20,
    });

    return categories.map(mapCategoryToDTO);
  }
}

// Singleton instance
export const categoryRepository = new CategoryRepository();
