import { z } from 'zod';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_LIMITS,
  type AllowedImageMimeType,
} from '../types/image';

/**
 * Validadores Zod para imágenes de servicios
 */

/**
 * Schema para solicitud de presigned URL
 */
export const imageUploadRequestSchema = z.object({
  fileName: z
    .string()
    .trim()
    .min(1, 'El nombre del archivo es requerido')
    .max(255, 'El nombre del archivo no puede tener más de 255 caracteres')
    .regex(
      /^[a-zA-Z0-9_\-\.]+$/,
      'El nombre del archivo solo puede contener letras, números, guiones, puntos y guiones bajos'
    ),
  fileSize: z
    .number()
    .int('El tamaño del archivo debe ser un número entero')
    .positive('El tamaño del archivo debe ser positivo')
    .max(
      IMAGE_LIMITS.MAX_SIZE_BYTES,
      `El archivo no puede superar ${IMAGE_LIMITS.MAX_SIZE_MB} MB`
    ),
  mimeType: z
    .string()
    .refine(
      (val): val is AllowedImageMimeType =>
        ALLOWED_IMAGE_MIME_TYPES.includes(val as AllowedImageMimeType),
      {
        message: `Tipo de archivo no permitido. Use: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
      }
    ),
});

/**
 * Schema para confirmar upload de imagen
 */
export const imageUploadConfirmSchema = z.object({
  s3Key: z
    .string()
    .trim()
    .min(1, 'La clave S3 es requerida')
    .regex(
      /^contractor-services\/[a-f0-9-]+\/[a-f0-9-]+\/[a-f0-9-]+\.(jpg|jpeg|png|webp)$/i,
      'Formato de clave S3 inválido'
    ),
  s3Url: z
    .string()
    .url('La URL S3 debe ser válida')
    .regex(
      /^https:\/\/.*\.s3\.[a-z0-9-]+\.amazonaws\.com\//,
      'La URL debe ser de AWS S3'
    ),
  width: z
    .number()
    .int('El ancho debe ser un número entero')
    .positive('El ancho debe ser positivo')
    .min(100, 'El ancho mínimo recomendado es 100px')
    .max(10000, 'El ancho máximo es 10000px')
    .optional(),
  height: z
    .number()
    .int('La altura debe ser un número entero')
    .positive('La altura debe ser positiva')
    .min(100, 'La altura mínima recomendada es 100px')
    .max(10000, 'La altura máxima es 10000px')
    .optional(),
  altText: z
    .string()
    .trim()
    .min(5, 'El texto alternativo debe tener al menos 5 caracteres')
    .max(200, 'El texto alternativo no puede tener más de 200 caracteres')
    .optional(),
});

/**
 * Schema para actualizar orden de imágenes
 */
export const updateImageOrderSchema = z.object({
  imageId: z.string().uuid('El ID de imagen debe ser un UUID válido'),
  newOrder: z
    .number()
    .int('El orden debe ser un número entero')
    .min(0, 'El orden mínimo es 0')
    .max(IMAGE_LIMITS.MAX_IMAGES_PER_SERVICE - 1, `El orden máximo es ${IMAGE_LIMITS.MAX_IMAGES_PER_SERVICE - 1}`),
});

/**
 * Schema para actualizar texto alternativo de imagen
 */
export const updateImageAltTextSchema = z.object({
  altText: z
    .string()
    .trim()
    .min(5, 'El texto alternativo debe tener al menos 5 caracteres')
    .max(200, 'El texto alternativo no puede tener más de 200 caracteres'),
});

/**
 * Tipos inferidos de los schemas
 */
export type ImageUploadRequestInput = z.infer<typeof imageUploadRequestSchema>;
export type ImageUploadConfirmInput = z.infer<typeof imageUploadConfirmSchema>;
export type UpdateImageOrderInput = z.infer<typeof updateImageOrderSchema>;
export type UpdateImageAltTextInput = z.infer<typeof updateImageAltTextSchema>;
