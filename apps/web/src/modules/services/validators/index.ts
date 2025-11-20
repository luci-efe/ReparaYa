/**
 * Service Validators
 *
 * Zod schemas for validating service CRUD operations
 * Re-exports validators from specialized modules
 *
 * @module services/validators
 */

import { z } from 'zod';
import { Currency, ServiceStatus } from '../types';

// ============================================================================
// Re-export specialized validators
// ============================================================================

export * from './category';
export * from './image';

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
 * Schema for publishing a service (DRAFT → ACTIVE transition)
 * Validates that all requirements for publication are met
 */
export const publishServiceSchema = z.object({
  // Service must have at least one image
  hasImages: z
    .boolean()
    .refine((val) => val === true, 'El servicio debe tener al menos una imagen para publicarse'),

  // Contractor must be verified
  isContractorVerified: z
    .boolean()
    .refine((val) => val === true, 'Solo contratistas verificados pueden publicar servicios'),

  // All required fields must be present and valid
  title: z
    .string()
    .trim()
    .min(MIN_TITLE_LENGTH)
    .max(MAX_TITLE_LENGTH),

  categoryId: z.string().uuid(),

  description: z
    .string()
    .trim()
    .min(MIN_DESCRIPTION_LENGTH)
    .max(MAX_DESCRIPTION_LENGTH),

  basePrice: z
    .number()
    .positive()
    .min(MIN_PRICE_MXN)
    .max(MAX_PRICE_MXN)
    .multipleOf(0.01),

  currency: z.nativeEnum(Currency),

  durationMinutes: z
    .number()
    .int()
    .min(MIN_DURATION_MINUTES)
    .max(MAX_DURATION_MINUTES)
    .multipleOf(15),

  // Current status must be DRAFT
  currentStatus: z
    .nativeEnum(ServiceStatus)
    .refine((status) => status === ServiceStatus.DRAFT, 'Solo se pueden publicar servicios en estado DRAFT'),
});

/**
 * Schema for pausing a service (ACTIVE → PAUSED transition)
 */
export const pauseServiceSchema = z.object({
  currentStatus: z
    .nativeEnum(ServiceStatus)
    .refine((status) => status === ServiceStatus.ACTIVE, 'Solo se pueden pausar servicios en estado ACTIVE'),
});

/**
 * Schema for reactivating a service (PAUSED → ACTIVE transition)
 */
export const reactivateServiceSchema = z.object({
  currentStatus: z
    .nativeEnum(ServiceStatus)
    .refine((status) => status === ServiceStatus.PAUSED, 'Solo se pueden reactivar servicios en estado PAUSED'),

  isContractorVerified: z
    .boolean()
    .refine((val) => val === true, 'Solo contratistas verificados pueden reactivar servicios'),
});

/**
 * Schema for unpublishing a service (ACTIVE/PAUSED → DRAFT transition)
 */
export const unpublishServiceSchema = z.object({
  currentStatus: z
    .nativeEnum(ServiceStatus)
    .refine(
      (status) => status === ServiceStatus.ACTIVE || status === ServiceStatus.PAUSED,
      'Solo se pueden despublicar servicios en estado ACTIVE o PAUSED'
    ),

  hasActiveBookings: z
    .boolean()
    .refine((val) => val === false, 'No se puede despublicar un servicio con reservas activas'),
});

/**
 * Schema for archiving a service (any state → ARCHIVED)
 */
export const archiveServiceSchema = z.object({
  hasActiveBookings: z
    .boolean()
    .refine((val) => val === false, 'No se puede archivar un servicio con reservas activas'),
});

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
// Validation Constants Export
// ============================================================================

export const SERVICE_VALIDATION_CONSTANTS = {
  title: { min: MIN_TITLE_LENGTH, max: MAX_TITLE_LENGTH },
  description: { min: MIN_DESCRIPTION_LENGTH, max: MAX_DESCRIPTION_LENGTH },
  price: { min: MIN_PRICE_MXN, max: MAX_PRICE_MXN },
  duration: { min: MIN_DURATION_MINUTES, max: MAX_DURATION_MINUTES },
} as const;

// Legacy export for backward compatibility
export const VALIDATION_CONSTANTS = SERVICE_VALIDATION_CONSTANTS;

// ============================================================================
// Type Exports
// ============================================================================

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type PublishServiceInput = z.infer<typeof publishServiceSchema>;
export type PauseServiceInput = z.infer<typeof pauseServiceSchema>;
export type ReactivateServiceInput = z.infer<typeof reactivateServiceSchema>;
export type UnpublishServiceInput = z.infer<typeof unpublishServiceSchema>;
export type ArchiveServiceInput = z.infer<typeof archiveServiceSchema>;
export type ServiceQueryInput = z.infer<typeof serviceQuerySchema>;
