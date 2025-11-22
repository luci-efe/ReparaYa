/**
 * Barrel export for service types
 */

export type {
  ServiceCategoryDTO,
  ServiceDTO,
  ServicePublicDTO,
  CreateServiceDTO,
  UpdateServiceDTO,
  ServiceImageDTO,
  ServiceListResponseDTO,
  ServiceSearchFilters,
} from './service';

export type {
  ImageUploadRequestDTO,
  ImageUploadResponseDTO,
  ImageUploadConfirmDTO,
  ImageCreateInput,
  AllowedImageMimeType,
} from './image';

export { ALLOWED_IMAGE_MIME_TYPES, IMAGE_LIMITS } from './image';
