/**
 * Unit tests for CategoryRepository
 * Uses mocked Prisma client to test repository logic without database
 *
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CategoryRepository } from '../categoryRepository';
import {
  CategoryNotFoundError,
  CategorySlugAlreadyExistsError,
  CircularCategoryHierarchyError,
} from '../../errors';
import type { CreateCategoryDTO, UpdateCategoryDTO } from '../../types';

// Mock prisma client
jest.mock('@/lib/db', () => ({
  prisma: {
    category: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    service: {
      count: jest.fn(),
    },
  },
}));

// Import mocked prisma
import { prisma } from '@/lib/db';

describe('CategoryRepository Unit Tests', () => {
  let repository: CategoryRepository;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    repository = new CategoryRepository();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('TC-CATEGORY-001: should create root category successfully', async () => {
      // Arrange
      const createData: CreateCategoryDTO = {
        name: 'Plumbing',
        slug: 'plumbing',
        description: 'Plumbing services',
        iconUrl: '/icons/plumbing.svg',
        parentId: null,
      };

      const mockCreated = {
        id: 'category-123',
        name: 'Plumbing',
        slug: 'plumbing',
        description: 'Plumbing services',
        iconUrl: '/icons/plumbing.svg',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
        children: [],
        _count: { services: 0 },
      };

      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue(mockCreated as any);

      // Act
      const result = await repository.create(createData);

      // Assert
      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { slug: 'plumbing' },
      });
      expect(mockPrisma.category.create).toHaveBeenCalled();
      expect(result.id).toBe('category-123');
      expect(result.name).toBe('Plumbing');
      expect(result.parentId).toBeNull();
    });

    it('TC-CATEGORY-002: should create subcategory with valid parent', async () => {
      // Arrange
      const createData: CreateCategoryDTO = {
        name: 'Pipe Repair',
        slug: 'pipe-repair',
        description: 'Pipe repair services',
        parentId: 'parent-123',
      };

      const mockParent = {
        id: 'parent-123',
        name: 'Plumbing',
        slug: 'plumbing',
      };

      const mockCreated = {
        id: 'category-456',
        ...createData,
        iconUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: mockParent,
        children: [],
        _count: { services: 0 },
      };

      mockPrisma.category.findUnique
        .mockResolvedValueOnce(null) // Slug check
        .mockResolvedValueOnce(mockParent as any); // Parent check
      mockPrisma.category.create.mockResolvedValue(mockCreated as any);

      // Act
      const result = await repository.create(createData);

      // Assert
      expect(result.parentId).toBe('parent-123');
      expect(result.parent).toBeDefined();
    });

    it('TC-CATEGORY-003: should throw error if slug already exists', async () => {
      // Arrange
      const createData: CreateCategoryDTO = {
        name: 'Plumbing',
        slug: 'plumbing',
        description: 'Plumbing services',
      };

      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'existing-123',
        slug: 'plumbing',
      } as any);

      // Act & Assert
      await expect(repository.create(createData)).rejects.toThrow(CategorySlugAlreadyExistsError);
    });

    it('TC-CATEGORY-004: should throw error if parent not found', async () => {
      // Arrange
      const createData: CreateCategoryDTO = {
        name: 'Pipe Repair',
        slug: 'pipe-repair',
        description: 'Pipe repair services',
        parentId: 'nonexistent-parent',
      };

      mockPrisma.category.findUnique
        .mockResolvedValueOnce(null) // Slug check
        .mockResolvedValueOnce(null); // Parent check

      // Act & Assert
      await expect(repository.create(createData)).rejects.toThrow(CategoryNotFoundError);
    });
  });

  describe('findById', () => {
    it('TC-CATEGORY-005: should return category when found', async () => {
      // Arrange
      const categoryId = 'category-123';
      const mockCategory = {
        id: categoryId,
        name: 'Plumbing',
        slug: 'plumbing',
        description: 'Plumbing services',
        iconUrl: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);

      // Act
      const result = await repository.findById(categoryId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(categoryId);
      expect(result?.name).toBe('Plumbing');
    });

    it('TC-CATEGORY-006: should return null when category not found', async () => {
      // Arrange
      mockPrisma.category.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById('nonexistent-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('TC-CATEGORY-007: should return category when found by slug', async () => {
      // Arrange
      const slug = 'plumbing';
      const mockCategory = {
        id: 'category-123',
        name: 'Plumbing',
        slug,
        description: 'Plumbing services',
        iconUrl: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);

      // Act
      const result = await repository.findBySlug(slug);

      // Assert
      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { slug },
        include: undefined,
      });
      expect(result?.slug).toBe(slug);
    });
  });

  describe('getRootCategories', () => {
    it('TC-CATEGORY-008: should return only categories without parent', async () => {
      // Arrange
      const mockRootCategories = [
        {
          id: 'cat-1',
          name: 'Plumbing',
          slug: 'plumbing',
          description: 'Plumbing services',
          iconUrl: null,
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          children: [],
          _count: { services: 5 },
        },
        {
          id: 'cat-2',
          name: 'Electrical',
          slug: 'electrical',
          description: 'Electrical services',
          iconUrl: null,
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          children: [],
          _count: { services: 3 },
        },
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockRootCategories as any);

      // Act
      const result = await repository.getRootCategories();

      // Assert
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { parentId: null },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].parentId).toBeNull();
      expect(result[1].parentId).toBeNull();
    });
  });

  describe('getWithChildren', () => {
    it('TC-CATEGORY-009: should return category with children', async () => {
      // Arrange
      const categoryId = 'category-123';
      const mockCategoryWithChildren = {
        id: categoryId,
        name: 'Plumbing',
        slug: 'plumbing',
        description: 'Plumbing services',
        iconUrl: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: null,
        children: [
          {
            id: 'child-1',
            name: 'Pipe Repair',
            slug: 'pipe-repair',
            iconUrl: null,
            _count: { services: 2 },
          },
          {
            id: 'child-2',
            name: 'Drain Cleaning',
            slug: 'drain-cleaning',
            iconUrl: null,
            _count: { services: 1 },
          },
        ],
        _count: { services: 10 },
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategoryWithChildren as any);

      // Act
      const result = await repository.getWithChildren(categoryId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.children).toHaveLength(2);
      expect(result?.children?.[0].name).toBe('Pipe Repair');
    });
  });

  describe('getCategoryTree', () => {
    it('TC-CATEGORY-010: should build hierarchical category tree', async () => {
      // Arrange
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Plumbing',
          slug: 'plumbing',
          iconUrl: null,
          parentId: null,
          _count: { services: 5 },
        },
        {
          id: 'cat-1-1',
          name: 'Pipe Repair',
          slug: 'pipe-repair',
          iconUrl: null,
          parentId: 'cat-1',
          _count: { services: 2 },
        },
        {
          id: 'cat-2',
          name: 'Electrical',
          slug: 'electrical',
          iconUrl: null,
          parentId: null,
          _count: { services: 3 },
        },
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockCategories as any);

      // Act
      const result = await repository.getCategoryTree();

      // Assert
      expect(result).toHaveLength(2); // 2 root categories
      expect(result[0].name).toBe('Plumbing');
      expect(result[0].level).toBe(0);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].name).toBe('Pipe Repair');
      expect(result[0].children[0].level).toBe(1);
    });
  });

  describe('update', () => {
    it('TC-CATEGORY-011: should update category fields', async () => {
      // Arrange
      const categoryId = 'category-123';
      const updateData: UpdateCategoryDTO = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const mockExisting = {
        id: categoryId,
        name: 'Original Name',
        slug: 'original-slug',
        description: 'Original description',
        iconUrl: null,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated = {
        ...mockExisting,
        name: 'Updated Name',
        description: 'Updated description',
        parent: null,
        children: [],
        _count: { services: 0 },
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockExisting as any);
      mockPrisma.category.update.mockResolvedValue(mockUpdated as any);

      // Act
      const result = await repository.update(categoryId, updateData);

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated description');
    });

    it('TC-CATEGORY-012: should throw error if updating to existing slug', async () => {
      // Arrange
      const categoryId = 'category-123';
      const updateData: UpdateCategoryDTO = {
        slug: 'existing-slug',
      };

      const mockExisting = {
        id: categoryId,
        slug: 'original-slug',
      };

      mockPrisma.category.findUnique
        .mockResolvedValueOnce(mockExisting as any) // First call for existence check
        .mockResolvedValueOnce({ id: 'other-123', slug: 'existing-slug' } as any); // Slug exists

      // Act & Assert
      await expect(repository.update(categoryId, updateData)).rejects.toThrow(
        CategorySlugAlreadyExistsError
      );
    });

    it('TC-CATEGORY-013: should throw error if new parent would create cycle', async () => {
      // Arrange
      const categoryId = 'category-123';
      const updateData: UpdateCategoryDTO = {
        parentId: 'child-of-123',
      };

      const mockExisting = {
        id: categoryId,
        parentId: null,
      };

      const mockNewParent = {
        id: 'child-of-123',
      };

      // Mock the cycle detection: child-of-123 is actually a child of category-123
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(mockExisting as any) // Existence check
        .mockResolvedValueOnce(mockNewParent as any) // First parent lookup in wouldCreateCycle
        .mockResolvedValueOnce({ id: 'child-of-123', parentId: categoryId } as any); // Parent check

      // Act & Assert
      await expect(repository.update(categoryId, updateData)).rejects.toThrow(
        CircularCategoryHierarchyError
      );
    });
  });

  describe('delete', () => {
    it('TC-CATEGORY-014: should delete category if no services or children', async () => {
      // Arrange
      const categoryId = 'category-123';
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.service.count.mockResolvedValue(0);
      mockPrisma.category.count.mockResolvedValue(0);
      mockPrisma.category.delete.mockResolvedValue({} as any);

      // Act
      await repository.delete(categoryId);

      // Assert
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
    });

    it('TC-CATEGORY-015: should throw error if category has services', async () => {
      // Arrange
      const categoryId = 'category-123';
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.service.count.mockResolvedValue(5); // Has 5 services

      // Act & Assert
      await expect(repository.delete(categoryId)).rejects.toThrow(
        'Cannot delete category "Test Category": 5 service(s) are using it'
      );
    });

    it('TC-CATEGORY-016: should throw error if category has children', async () => {
      // Arrange
      const categoryId = 'category-123';
      const mockCategory = {
        id: categoryId,
        name: 'Test Category',
      };

      mockPrisma.category.findUnique.mockResolvedValue(mockCategory as any);
      mockPrisma.service.count.mockResolvedValue(0);
      mockPrisma.category.count.mockResolvedValue(3); // Has 3 children

      // Act & Assert
      await expect(repository.delete(categoryId)).rejects.toThrow(
        'Cannot delete category "Test Category": it has 3 subcategorie(s)'
      );
    });
  });

  describe('getChildCategories', () => {
    it('TC-CATEGORY-017: should return direct children of category', async () => {
      // Arrange
      const parentId = 'parent-123';
      const mockChildren = [
        {
          id: 'child-1',
          name: 'Child 1',
          slug: 'child-1',
          description: 'First child',
          iconUrl: null,
          parentId,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { services: 2 },
        },
        {
          id: 'child-2',
          name: 'Child 2',
          slug: 'child-2',
          description: 'Second child',
          iconUrl: null,
          parentId,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { services: 1 },
        },
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockChildren as any);

      // Act
      const result = await repository.getChildCategories(parentId);

      // Assert
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { parentId },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].parentId).toBe(parentId);
    });
  });

  describe('getCategoryPath', () => {
    it('TC-CATEGORY-018: should return breadcrumb path from root to category', async () => {
      // Arrange
      const leafId = 'leaf-123';

      // Mock the traversal: leaf -> parent -> grandparent -> null
      mockPrisma.category.findUnique
        .mockResolvedValueOnce({
          id: leafId,
          name: 'Leaf',
          slug: 'leaf',
          iconUrl: null,
          parentId: 'parent-123',
        } as any)
        .mockResolvedValueOnce({
          id: 'parent-123',
          name: 'Parent',
          slug: 'parent',
          iconUrl: null,
          parentId: 'grandparent-123',
        } as any)
        .mockResolvedValueOnce({
          id: 'grandparent-123',
          name: 'Grandparent',
          slug: 'grandparent',
          iconUrl: null,
          parentId: null,
        } as any);

      // Act
      const result = await repository.getCategoryPath(leafId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Grandparent');
      expect(result[1].name).toBe('Parent');
      expect(result[2].name).toBe('Leaf');
    });
  });

  describe('search', () => {
    it('TC-CATEGORY-019: should search categories by name', async () => {
      // Arrange
      const query = 'plumb';
      const mockResults = [
        {
          id: 'cat-1',
          name: 'Plumbing',
          slug: 'plumbing',
          description: 'Plumbing services',
          iconUrl: null,
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: null,
          _count: { services: 5 },
        },
      ];

      mockPrisma.category.findMany.mockResolvedValue(mockResults as any);

      // Act
      const result = await repository.search(query);

      // Assert
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: {
          OR: expect.arrayContaining([
            expect.objectContaining({
              name: expect.objectContaining({
                contains: query,
                mode: 'insensitive',
              }),
            }),
          ]),
        },
        include: expect.any(Object),
        orderBy: { name: 'asc' },
        take: 20,
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Plumbing');
    });
  });
});
