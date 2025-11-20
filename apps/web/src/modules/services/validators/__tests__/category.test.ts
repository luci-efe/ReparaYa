/**
 * Category Validators Unit Tests
 *
 * Comprehensive tests for category validation schemas
 *
 * @module services/validators/__tests__/category
 */

import {
  createCategorySchema,
  updateCategorySchema,
  categoryQuerySchema,
  categorySlugSchema,
  categoryHierarchySchema,
  CATEGORY_VALIDATION_CONSTANTS,
} from '../category';

describe('Category Validators', () => {
  describe('createCategorySchema', () => {
    const validCategory = {
      name: 'Plomería',
      slug: 'plomeria',
      description: 'Servicios de plomería profesional para el hogar',
      iconUrl: 'https://example.com/icons/plumbing.svg',
      parentId: '123e4567-e89b-12d3-a456-426614174000',
    };

    describe('name validation', () => {
      it('should accept valid name', () => {
        const result = createCategorySchema.safeParse(validCategory);
        expect(result.success).toBe(true);
      });

      it('should reject name shorter than 2 characters', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          name: 'A',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('al menos 2 caracteres');
        }
      });

      it('should reject name longer than 50 characters', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          name: 'a'.repeat(51),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('no debe exceder 50 caracteres');
        }
      });

      it('should trim whitespace from name', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          name: '  Plomería  ',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Plomería');
        }
      });

      it('should accept name with Spanish characters', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          name: 'Electricidad y Electrónica',
        });
        expect(result.success).toBe(true);
      });

      it('should accept name with accents', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          name: 'Jardinería',
        });
        expect(result.success).toBe(true);
      });

      it('should accept name with spaces', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          name: 'Limpieza de Hogar',
        });
        expect(result.success).toBe(true);
      });

      it('should reject name with numbers', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          name: 'Plomería123',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('letras y espacios');
        }
      });

      it('should reject name with special characters', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          name: 'Plomería & Co.',
        });
        expect(result.success).toBe(false);
      });

      it('should accept name with minimum length (2 chars)', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          name: 'AB',
        });
        expect(result.success).toBe(true);
      });

      it('should accept name with maximum length (50 chars)', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          name: 'a'.repeat(50),
        });
        expect(result.success).toBe(true);
      });
    });

    describe('slug validation', () => {
      it('should accept valid slug', () => {
        const result = createCategorySchema.safeParse(validCategory);
        expect(result.success).toBe(true);
      });

      it('should reject slug shorter than 2 characters', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          slug: 'a',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('al menos 2 caracteres');
        }
      });

      it('should reject slug longer than 50 characters', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          slug: 'a'.repeat(51),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('no debe exceder 50 caracteres');
        }
      });

      it('should reject slug with uppercase letters', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          slug: 'Plomeria',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('letras minúsculas');
        }
      });

      it('should reject slug with spaces', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          slug: 'plomeria residencial',
        });
        expect(result.success).toBe(false);
      });

      it('should accept slug with hyphens', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          slug: 'plomeria-residencial',
        });
        expect(result.success).toBe(true);
      });

      it('should accept slug with numbers', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          slug: 'plomeria-24h',
        });
        expect(result.success).toBe(true);
      });

      it('should reject slug starting with hyphen', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          slug: '-plomeria',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('no debe comenzar');
        }
      });

      it('should reject slug ending with hyphen', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          slug: 'plomeria-',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('no debe');
        }
      });

      it('should reject slug with consecutive hyphens', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          slug: 'plomeria--residencial',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('consecutivos');
        }
      });

      it('should reject slug with special characters', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          slug: 'plomería',
        });
        expect(result.success).toBe(false);
      });

      it('should trim whitespace from slug', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          slug: '  plomeria  ',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.slug).toBe('plomeria');
        }
      });
    });

    describe('description validation', () => {
      it('should accept valid description', () => {
        const result = createCategorySchema.safeParse(validCategory);
        expect(result.success).toBe(true);
      });

      it('should reject description shorter than 10 characters', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          description: 'Too short',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('al menos 10 caracteres');
        }
      });

      it('should reject description longer than 500 characters', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          description: 'a'.repeat(501),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('no debe exceder 500 caracteres');
        }
      });

      it('should trim whitespace from description', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          description: '  ' + validCategory.description + '  ',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBe(validCategory.description);
        }
      });

      it('should accept description with minimum length (10 chars)', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          description: 'a'.repeat(10),
        });
        expect(result.success).toBe(true);
      });

      it('should accept description with maximum length (500 chars)', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          description: 'a'.repeat(500),
        });
        expect(result.success).toBe(true);
      });
    });

    describe('iconUrl validation', () => {
      it('should accept valid icon URL', () => {
        const result = createCategorySchema.safeParse(validCategory);
        expect(result.success).toBe(true);
      });

      it('should accept null iconUrl', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          iconUrl: null,
        });
        expect(result.success).toBe(true);
      });

      it('should accept undefined iconUrl (omitted)', () => {
        const { iconUrl, ...categoryWithoutIcon } = validCategory;
        const result = createCategorySchema.safeParse(categoryWithoutIcon);
        expect(result.success).toBe(true);
      });

      it('should reject invalid URL format', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          iconUrl: 'not-a-url',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('URL');
        }
      });

      it('should accept SVG icons', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          iconUrl: 'https://example.com/icon.svg',
        });
        expect(result.success).toBe(true);
      });

      it('should accept PNG icons', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          iconUrl: 'https://example.com/icon.png',
        });
        expect(result.success).toBe(true);
      });

      it('should accept JPG icons', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          iconUrl: 'https://example.com/icon.jpg',
        });
        expect(result.success).toBe(true);
      });

      it('should accept WEBP icons', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          iconUrl: 'https://example.com/icon.webp',
        });
        expect(result.success).toBe(true);
      });

      it('should reject icons without valid extension', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          iconUrl: 'https://example.com/icon',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('extensión');
        }
      });

      it('should reject icons with invalid extension', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          iconUrl: 'https://example.com/icon.gif',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('parentId validation', () => {
      it('should accept valid UUID', () => {
        const result = createCategorySchema.safeParse(validCategory);
        expect(result.success).toBe(true);
      });

      it('should accept null parentId', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          parentId: null,
        });
        expect(result.success).toBe(true);
      });

      it('should accept undefined parentId (omitted)', () => {
        const { parentId, ...categoryWithoutParent } = validCategory;
        const result = createCategorySchema.safeParse(categoryWithoutParent);
        expect(result.success).toBe(true);
      });

      it('should reject invalid UUID format', () => {
        const result = createCategorySchema.safeParse({
          ...validCategory,
          parentId: 'not-a-uuid',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('inválido');
        }
      });
    });
  });

  describe('updateCategorySchema', () => {
    it('should accept partial updates', () => {
      const result = updateCategorySchema.safeParse({
        name: 'Updated Name',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object (no updates)', () => {
      const result = updateCategorySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate provided fields', () => {
      const result = updateCategorySchema.safeParse({
        slug: 'Invalid Slug With Spaces',
      });
      expect(result.success).toBe(false);
    });

    it('should accept multiple field updates', () => {
      const result = updateCategorySchema.safeParse({
        name: 'New Name',
        slug: 'new-slug',
        description: 'New description text',
      });
      expect(result.success).toBe(true);
    });

    it('should accept updating only iconUrl', () => {
      const result = updateCategorySchema.safeParse({
        iconUrl: 'https://example.com/new-icon.svg',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('categoryQuerySchema', () => {
    it('should accept valid query parameters', () => {
      const result = categoryQuerySchema.safeParse({
        parentId: '123e4567-e89b-12d3-a456-426614174000',
        includeEmpty: true,
        page: 1,
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty query parameters', () => {
      const result = categoryQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeEmpty).toBe(false);
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should default includeEmpty to false', () => {
      const result = categoryQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeEmpty).toBe(false);
      }
    });

    it('should default page to 1', () => {
      const result = categoryQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
      }
    });

    it('should default limit to 20', () => {
      const result = categoryQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should accept null parentId', () => {
      const result = categoryQuerySchema.safeParse({
        parentId: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for parentId', () => {
      const result = categoryQuerySchema.safeParse({
        parentId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative page number', () => {
      const result = categoryQuerySchema.safeParse({
        page: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit above 100', () => {
      const result = categoryQuerySchema.safeParse({
        limit: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit below 1', () => {
      const result = categoryQuerySchema.safeParse({
        limit: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('categorySlugSchema', () => {
    it('should accept valid slug', () => {
      const result = categorySlugSchema.safeParse('plomeria-residencial');
      expect(result.success).toBe(true);
    });

    it('should reject invalid slug format', () => {
      const result = categorySlugSchema.safeParse('Invalid Slug');
      expect(result.success).toBe(false);
    });

    it('should trim whitespace', () => {
      const result = categorySlugSchema.safeParse('  plomeria  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('plomeria');
      }
    });

    it('should reject slug shorter than 2 characters', () => {
      const result = categorySlugSchema.safeParse('a');
      expect(result.success).toBe(false);
    });

    it('should reject slug longer than 50 characters', () => {
      const result = categorySlugSchema.safeParse('a'.repeat(51));
      expect(result.success).toBe(false);
    });
  });

  describe('categoryHierarchySchema', () => {
    it('should accept valid hierarchy data', () => {
      const result = categoryHierarchySchema.safeParse({
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        parentId: '123e4567-e89b-12d3-a456-426614174001',
      });
      expect(result.success).toBe(true);
    });

    it('should accept null parentId', () => {
      const result = categoryHierarchySchema.safeParse({
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        parentId: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid categoryId', () => {
      const result = categoryHierarchySchema.safeParse({
        categoryId: 'not-a-uuid',
        parentId: null,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid parentId', () => {
      const result = categoryHierarchySchema.safeParse({
        categoryId: '123e4567-e89b-12d3-a456-426614174000',
        parentId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CATEGORY_VALIDATION_CONSTANTS', () => {
    it('should export correct name constants', () => {
      expect(CATEGORY_VALIDATION_CONSTANTS.name.min).toBe(2);
      expect(CATEGORY_VALIDATION_CONSTANTS.name.max).toBe(50);
    });

    it('should export correct slug constants', () => {
      expect(CATEGORY_VALIDATION_CONSTANTS.slug.min).toBe(2);
      expect(CATEGORY_VALIDATION_CONSTANTS.slug.max).toBe(50);
      expect(CATEGORY_VALIDATION_CONSTANTS.slug.pattern).toEqual(/^[a-z0-9-]+$/);
    });

    it('should export correct description constants', () => {
      expect(CATEGORY_VALIDATION_CONSTANTS.description.min).toBe(10);
      expect(CATEGORY_VALIDATION_CONSTANTS.description.max).toBe(500);
    });
  });
});
