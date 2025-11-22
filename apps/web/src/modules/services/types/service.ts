import type { ServiceVisibilityStatus } from '@prisma/client';

/**
 * Tipos de dominio para el módulo de servicios de contratistas
 */

/**
 * Categoría de servicio (main + subcategories)
 */
export interface ServiceCategoryDTO {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  parentId?: string | null;
  children?: ServiceCategoryDTO[];
}

/**
 * DTO completo de servicio (para owner/admin)
 */
export interface ServiceDTO {
  id: string;
  contractorId: string;
  categoryId: string;
  title: string;
  description: string;
  basePrice: number;
  currency: string;
  durationMinutes: number;
  visibilityStatus: ServiceVisibilityStatus;
  lastPublishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  category?: ServiceCategoryDTO;
  images?: ServiceImageDTO[];
  contractor?: {
    id: string;
    businessName: string;
    verified: boolean;
  };
}

/**
 * DTO público de servicio (limitado para catálogo público)
 * Solo servicios ACTIVE
 */
export interface ServicePublicDTO {
  id: string;
  title: string;
  categoryId: string;
  category?: ServiceCategoryDTO;
  description: string;
  basePrice: number;
  currency: string;
  durationMinutes: number;
  visibilityStatus: ServiceVisibilityStatus;
  images: ServiceImageDTO[];
  contractor: {
    id: string;
    businessName: string;
    verified: boolean;
  };
  lastPublishedAt: Date | null;
}

/**
 * DTO para crear servicio
 */
export interface CreateServiceDTO {
  categoryId: string;
  title: string;
  description: string;
  basePrice: number;
  durationMinutes: number;
}

/**
 * DTO para actualizar servicio
 * Todos los campos son opcionales
 */
export interface UpdateServiceDTO {
  categoryId?: string;
  title?: string;
  description?: string;
  basePrice?: number;
  durationMinutes?: number;
}

/**
 * DTO de imagen de servicio
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
 * Respuesta paginada de servicios
 */
export interface ServiceListResponseDTO {
  services: ServicePublicDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/**
 * Filtros de búsqueda de servicios
 */
export interface ServiceSearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
  status?: ServiceVisibilityStatus; // Solo para admin
  contractorId?: string; // Solo para admin
}
