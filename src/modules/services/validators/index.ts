/**
 * Service Validators
 *
 * Zod schemas for validating service CRUD operations
 *
 * @module services/validators
 */

import { z } from 'zod';
import { Currency, ServiceStatus } from '../types';

// ============================================================================
// Constants
// ============================================================================

const MIN_TITLE_LENGTH = 5;
const MAX_TITLE_LENGTH = 100;
const MIN_DESCRIPTION_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 2000;
const MIN_PRICE_MXN = 50.0;
const MAX_PRICE_MXN = 50000.0;
const MIN_DURATION_MINUTES = 30;
const MAX_DURATION_MINUTES = 480; // 8 hours

// ============================================================================
// Service Schemas
// ============================================================================

/**
 * Schema for creating a new service
 */
export const createServiceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(MIN_TITLE_LENGTH, `El título debe tener al menos ${MIN_TITLE_LENGTH} caracteres`)
    .max(MAX_TITLE_LENGTH, `El título no debe exceder ${MAX_TITLE_LENGTH} caracteres`),

  categoryId: z.string().uuid('ID de categoría inválido'),

  description: z
    .string()
    .trim()
    .min(
      MIN_DESCRIPTION_LENGTH,
      `La descripción debe tener al menos ${MIN_DESCRIPTION_LENGTH} caracteres`
    )
    .max(
      MAX_DESCRIPTION_LENGTH,
      `La descripción no debe exceder ${MAX_DESCRIPTION_LENGTH} caracteres`
    ),

  basePrice: z
    .number()
    .positive('El precio debe ser mayor a 0')
    .min(MIN_PRICE_MXN, `El precio mínimo es ${MIN_PRICE_MXN} MXN`)
    .max(MAX_PRICE_MXN, `El precio máximo es ${MAX_PRICE_MXN} MXN`)
    .multipleOf(0.01, 'El precio debe tener máximo 2 decimales'),

  currency: z.nativeEnum(Currency).default(Currency.MXN),

  durationMinutes: z
    .number()
    .int('La duración debe ser un número entero')
    .min(MIN_DURATION_MINUTES, `La duración mínima es ${MIN_DURATION_MINUTES} minutos`)
    .max(MAX_DURATION_MINUTES, `La duración máxima es ${MAX_DURATION_MINUTES} minutos`)
    .multipleOf(15, 'La duración debe ser múltiplo de 15 minutos'),
});

/**
 * Schema for updating an existing service
 * All fields optional (partial update)
 */
export const updateServiceSchema = createServiceSchema.partial();

/**
 * Schema for query filters (pagination, filtering)
 */
export const serviceQuerySchema = z.object({
  categoryId: z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  visibilityStatus: z.nativeEnum(ServiceStatus).optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Image Upload Schemas
// ============================================================================

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_IMAGES_PER_SERVICE = 5;

/**
 * Schema for requesting presigned upload URL
 */
export const requestUploadUrlSchema = z.object({
  fileName: z
    .string()
    .min(1, 'El nombre del archivo es requerido')
    .max(255, 'El nombre del archivo es demasiado largo')
    .refine(
      (name) => /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i.test(name),
      'Nombre de archivo inválido. Use solo letras, números, guiones y extensión de imagen'
    ),

  fileType: z
    .string()
    .refine(
      (type) => ALLOWED_IMAGE_TYPES.includes(type as any),
      `Solo se permiten archivos ${ALLOWED_IMAGE_TYPES.join(', ')}`
    ),

  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_SIZE_BYTES, `El tamaño máximo del archivo es ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB`),
});

/**
 * Schema for confirming image upload
 */
export const confirmImageUploadSchema = z.object({
  s3Key: z.string().min(1, 'La clave S3 es requerida'),
  s3Url: z.string().url('URL de S3 inválida'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  altText: z.string().max(255, 'El texto alternativo es demasiado largo').optional(),
});

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
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no debe exceder 50 caracteres'),

  slug: z
    .string()
    .trim()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .max(50, 'El slug no debe exceder 50 caracteres')
    .regex(/^[a-z0-9-]+$/, 'El slug solo debe contener letras minúsculas, números y guiones'),

  description: z.string().trim().min(10, 'La descripción debe tener al menos 10 caracteres'),

  iconUrl: z.string().url('URL de ícono inválida').nullable().optional(),

  parentId: z.string().uuid('ID de categoría padre inválido').nullable().optional(),
});

/**
 * Schema for updating a category
 */
export const updateCategorySchema = createCategorySchema.partial();

// ============================================================================
// Validation Constants Export
// ============================================================================

export const VALIDATION_CONSTANTS = {
  title: { min: MIN_TITLE_LENGTH, max: MAX_TITLE_LENGTH },
  description: { min: MIN_DESCRIPTION_LENGTH, max: MAX_DESCRIPTION_LENGTH },
  price: { min: MIN_PRICE_MXN, max: MAX_PRICE_MXN },
  duration: { min: MIN_DURATION_MINUTES, max: MAX_DURATION_MINUTES },
  images: {
    maxSize: MAX_IMAGE_SIZE_BYTES,
    maxCount: MAX_IMAGES_PER_SERVICE,
    allowedTypes: ALLOWED_IMAGE_TYPES,
  },
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ServiceQueryInput = z.infer<typeof serviceQuerySchema>;
export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;
export type ConfirmImageUploadInput = z.infer<typeof confirmImageUploadSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
