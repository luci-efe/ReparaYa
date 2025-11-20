/**
 * Category Validators
 *
 * Zod schemas for validating service category operations
 *
 * @module services/validators/category
 */

import { z } from 'zod';

// ============================================================================
// Validation Constants
// ============================================================================

const MIN_CATEGORY_NAME_LENGTH = 2;
const MAX_CATEGORY_NAME_LENGTH = 50;
const MIN_SLUG_LENGTH = 2;
const MAX_SLUG_LENGTH = 50;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;

// ============================================================================
// Category Schemas
// ============================================================================

/**
 * Schema for creating a category (admin only)
 */
export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(MIN_CATEGORY_NAME_LENGTH, `El nombre debe tener al menos ${MIN_CATEGORY_NAME_LENGTH} caracteres`)
    .max(MAX_CATEGORY_NAME_LENGTH, `El nombre no debe exceder ${MAX_CATEGORY_NAME_LENGTH} caracteres`)
    .refine(
      (name) => name.length > 0 && /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/.test(name),
      'El nombre solo debe contener letras y espacios'
    ),

  slug: z
    .string()
    .trim()
    .min(MIN_SLUG_LENGTH, `El slug debe tener al menos ${MIN_SLUG_LENGTH} caracteres`)
    .max(MAX_SLUG_LENGTH, `El slug no debe exceder ${MAX_SLUG_LENGTH} caracteres`)
    .regex(
      /^[a-z0-9-]+$/,
      'El slug solo debe contener letras minúsculas, números y guiones'
    )
    .refine(
      (slug) => !slug.startsWith('-') && !slug.endsWith('-'),
      'El slug no debe comenzar ni terminar con un guión'
    )
    .refine(
      (slug) => !/--/.test(slug),
      'El slug no debe contener guiones consecutivos'
    ),

  description: z
    .string()
    .trim()
    .min(MIN_DESCRIPTION_LENGTH, `La descripción debe tener al menos ${MIN_DESCRIPTION_LENGTH} caracteres`)
    .max(MAX_DESCRIPTION_LENGTH, `La descripción no debe exceder ${MAX_DESCRIPTION_LENGTH} caracteres`),

  iconUrl: z
    .string()
    .url('URL de ícono inválida')
    .refine(
      (url) => /\.(svg|png|jpg|jpeg|webp)$/i.test(url),
      'La URL del ícono debe terminar con una extensión de imagen válida (.svg, .png, .jpg, .webp)'
    )
    .nullable()
    .optional(),

  parentId: z
    .string()
    .uuid('ID de categoría padre inválido')
    .nullable()
    .optional(),
});

/**
 * Schema for updating a category
 * All fields optional (partial update)
 */
export const updateCategorySchema = createCategorySchema.partial();

/**
 * Schema for category query filters
 */
export const categoryQuerySchema = z.object({
  parentId: z
    .string()
    .uuid('ID de categoría padre inválido')
    .nullable()
    .optional(),
  includeEmpty: z
    .boolean()
    .default(false)
    .describe('Include categories with no services'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * Schema for validating category slug uniqueness
 * Used in repository/service layer
 */
export const categorySlugSchema = z
  .string()
  .trim()
  .min(MIN_SLUG_LENGTH)
  .max(MAX_SLUG_LENGTH)
  .regex(/^[a-z0-9-]+$/);

/**
 * Schema for validating parent-child relationship
 * Prevents circular references
 */
export const categoryHierarchySchema = z.object({
  categoryId: z.string().uuid('ID de categoría inválido'),
  parentId: z.string().uuid('ID de categoría padre inválido').nullable(),
});

// ============================================================================
// Validation Constants Export
// ============================================================================

export const CATEGORY_VALIDATION_CONSTANTS = {
  name: {
    min: MIN_CATEGORY_NAME_LENGTH,
    max: MAX_CATEGORY_NAME_LENGTH,
  },
  slug: {
    min: MIN_SLUG_LENGTH,
    max: MAX_SLUG_LENGTH,
    pattern: /^[a-z0-9-]+$/,
  },
  description: {
    min: MIN_DESCRIPTION_LENGTH,
    max: MAX_DESCRIPTION_LENGTH,
  },
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryQueryInput = z.infer<typeof categoryQuerySchema>;
export type CategorySlugInput = z.infer<typeof categorySlugSchema>;
export type CategoryHierarchyInput = z.infer<typeof categoryHierarchySchema>;
