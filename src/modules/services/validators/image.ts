/**
 * Image Validators
 *
 * Zod schemas for validating service image upload and management operations
 *
 * @module services/validators/image
 */

import { z } from 'zod';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_IMAGES_PER_SERVICE,
  type AllowedImageMimeType,
} from '../types/image';

// ============================================================================
// Validation Constants
// ============================================================================

const MAX_FILENAME_LENGTH = 255;
const MAX_ALT_TEXT_LENGTH = 255;
const MIN_IMAGE_DIMENSION = 1;
const MAX_IMAGE_DIMENSION = 10000;
const VALID_FILE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

// ============================================================================
// Image Upload Schemas
// ============================================================================

/**
 * Schema for requesting presigned upload URL
 */
export const requestUploadUrlSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1, 'El nombre del archivo es requerido')
    .max(MAX_FILENAME_LENGTH, `El nombre del archivo no debe exceder ${MAX_FILENAME_LENGTH} caracteres`)
    .refine(
      (name) => {
        // Validate filename format: alphanumeric, hyphens, underscores, dots, and valid extension
        const fileExtRegex = new RegExp(
          `^[a-zA-Z0-9._-]+\\.(${VALID_FILE_EXTENSIONS.join('|')})$`,
          'i'
        );
        return fileExtRegex.test(name);
      },
      {
        message: `Nombre de archivo inválido. Use solo letras, números, guiones, puntos y una extensión válida (${VALID_FILE_EXTENSIONS.join(', ')})`,
      }
    )
    .refine(
      (name) => {
        // Prevent path traversal attempts
        return !name.includes('..') && !name.includes('/') && !name.includes('\\');
      },
      'El nombre del archivo no puede contener rutas o caracteres de navegación'
    ),

  fileType: z
    .string()
    .refine(
      (type): type is AllowedImageMimeType => {
        return ALLOWED_IMAGE_MIME_TYPES.includes(type as any);
      },
      {
        message: `Tipo de archivo no permitido. Solo se aceptan: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
      }
    ),

  fileSize: z
    .number()
    .int('El tamaño del archivo debe ser un número entero')
    .positive('El tamaño del archivo debe ser mayor a 0')
    .max(
      MAX_IMAGE_SIZE_BYTES,
      `El tamaño máximo del archivo es ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB`
    )
    .refine(
      (size) => size >= 1024,
      'El archivo debe tener al menos 1 KB'
    ),
});

/**
 * Schema for confirming image upload
 */
export const confirmImageUploadSchema = z.object({
  s3Key: z
    .string()
    .trim()
    .min(1, 'La clave S3 es requerida')
    .refine(
      (key) => key.startsWith('contractor-services/'),
      'La clave S3 debe comenzar con el prefijo correcto (contractor-services/)'
    )
    .refine(
      (key) => {
        // Validate S3 key format: contractor-services/{contractorId}/{serviceId}/{uuid}.{ext}
        const keyRegex = /^contractor-services\/[a-f0-9-]+\/[a-f0-9-]+\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i;
        return keyRegex.test(key);
      },
      'Formato de clave S3 inválido'
    ),

  s3Url: z
    .string()
    .url('URL de S3 inválida')
    .refine(
      (url) => {
        // Validate that URL is from expected S3 bucket
        return url.includes('.s3.') || url.includes('.amazonaws.com');
      },
      'La URL debe ser de Amazon S3'
    ),

  width: z
    .number()
    .int('El ancho debe ser un número entero')
    .min(MIN_IMAGE_DIMENSION, `El ancho mínimo es ${MIN_IMAGE_DIMENSION}px`)
    .max(MAX_IMAGE_DIMENSION, `El ancho máximo es ${MAX_IMAGE_DIMENSION}px`)
    .optional(),

  height: z
    .number()
    .int('La altura debe ser un número entero')
    .min(MIN_IMAGE_DIMENSION, `La altura mínima es ${MIN_IMAGE_DIMENSION}px`)
    .max(MAX_IMAGE_DIMENSION, `La altura máxima es ${MAX_IMAGE_DIMENSION}px`)
    .optional(),

  altText: z
    .string()
    .trim()
    .max(MAX_ALT_TEXT_LENGTH, `El texto alternativo no debe exceder ${MAX_ALT_TEXT_LENGTH} caracteres`)
    .optional()
    .refine(
      (text) => !text || text.length >= 3,
      'El texto alternativo debe tener al menos 3 caracteres si se proporciona'
    ),
});

/**
 * Schema for updating image metadata
 */
export const updateImageSchema = z.object({
  order: z
    .number()
    .int('El orden debe ser un número entero')
    .min(0, 'El orden mínimo es 0')
    .max(MAX_IMAGES_PER_SERVICE - 1, `El orden máximo es ${MAX_IMAGES_PER_SERVICE - 1}`)
    .optional(),

  altText: z
    .string()
    .trim()
    .max(MAX_ALT_TEXT_LENGTH, `El texto alternativo no debe exceder ${MAX_ALT_TEXT_LENGTH} caracteres`)
    .optional()
    .refine(
      (text) => !text || text.length >= 3,
      'El texto alternativo debe tener al menos 3 caracteres si se proporciona'
    ),
});

/**
 * Schema for reordering images
 * Accepts an array of image IDs in desired order
 */
export const reorderImagesSchema = z.object({
  imageIds: z
    .array(z.string().uuid('ID de imagen inválido'))
    .min(1, 'Debe proporcionar al menos un ID de imagen')
    .max(MAX_IMAGES_PER_SERVICE, `No puede reordenar más de ${MAX_IMAGES_PER_SERVICE} imágenes`)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'Los IDs de imagen deben ser únicos'
    ),
});

/**
 * Schema for validating image count for a service
 * Used internally to check limits
 */
export const imageCountValidationSchema = z.object({
  currentCount: z.number().int().min(0),
  additionalImages: z.number().int().min(1),
}).refine(
  (data) => data.currentCount + data.additionalImages <= MAX_IMAGES_PER_SERVICE,
  {
    message: `No se pueden agregar más imágenes. El límite es ${MAX_IMAGES_PER_SERVICE} imágenes por servicio`,
  }
);

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates if a MIME type is allowed
 */
export function isAllowedMimeType(mimeType: string): mimeType is AllowedImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as any);
}

/**
 * Validates if file size is within limits
 */
export function isFileSizeValid(sizeInBytes: number): boolean {
  return sizeInBytes > 0 && sizeInBytes <= MAX_IMAGE_SIZE_BYTES;
}

/**
 * Extracts file extension from filename
 */
export function getFileExtension(fileName: string): string | null {
  const match = fileName.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Maps MIME type to file extension
 */
export function mimeTypeToExtension(mimeType: string): string {
  const mapping: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return mapping[mimeType] || 'jpg';
}

// ============================================================================
// Validation Constants Export
// ============================================================================

export const IMAGE_VALIDATION_CONSTANTS = {
  fileName: {
    maxLength: MAX_FILENAME_LENGTH,
    allowedExtensions: VALID_FILE_EXTENSIONS,
  },
  fileSize: {
    max: MAX_IMAGE_SIZE_BYTES,
    maxMB: MAX_IMAGE_SIZE_BYTES / 1024 / 1024,
  },
  mimeTypes: {
    allowed: ALLOWED_IMAGE_MIME_TYPES,
  },
  dimensions: {
    min: MIN_IMAGE_DIMENSION,
    max: MAX_IMAGE_DIMENSION,
  },
  altText: {
    maxLength: MAX_ALT_TEXT_LENGTH,
  },
  perService: {
    maxCount: MAX_IMAGES_PER_SERVICE,
  },
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;
export type ConfirmImageUploadInput = z.infer<typeof confirmImageUploadSchema>;
export type UpdateImageInput = z.infer<typeof updateImageSchema>;
export type ReorderImagesInput = z.infer<typeof reorderImagesSchema>;
export type ImageCountValidationInput = z.infer<typeof imageCountValidationSchema>;
