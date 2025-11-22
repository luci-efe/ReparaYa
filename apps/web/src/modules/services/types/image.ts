/**
 * Tipos de dominio para imágenes de servicios
 */

/**
 * DTO para solicitud de presigned URL
 */
export interface ImageUploadRequestDTO {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * DTO para respuesta de presigned URL
 */
export interface ImageUploadResponseDTO {
  presignedUrl: string;
  s3Key: string;
  expiresAt: Date;
}

/**
 * DTO para confirmar upload de imagen
 */
export interface ImageUploadConfirmDTO {
  s3Key: string;
  s3Url: string;
  width?: number;
  height?: number;
  altText?: string;
}

/**
 * DTO para devolver datos de imagen de servicio
 */
export interface ServiceImageDTO {
  id: string;
  serviceId: string;
  s3Url: string;
  s3Key: string;
  order: number;
  width?: number;
  height?: number;
  altText?: string;
  uploadedAt: Date;
}

/**
 * Input para crear imagen en repositorio
 */
export interface ImageCreateInput {
  serviceId: string;
  s3Url: string;
  s3Key: string;
  order: number;
  width?: number;
  height?: number;
  altText?: string;
}

/**
 * MIME types permitidos para imágenes de servicios
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/**
 * Límites de imágenes
 */
export const IMAGE_LIMITS = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_IMAGES_PER_SERVICE: 5,
  PRESIGNED_URL_EXPIRY_SECONDS: 3600, // 1 hour
} as const;
