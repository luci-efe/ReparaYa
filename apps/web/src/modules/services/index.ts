/**
 * Barrel export for services module
 *
 * This module handles contractor service management including:
 * - Service CRUD operations
 * - Visibility status state machine (DRAFT → ACTIVE → PAUSED → ARCHIVED)
 * - Admin moderation capabilities
 * - Service catalog and search
 */

// Services (business logic)
export { serviceService, serviceStateMachine, imageUploadService } from './services';

// Repositories (data access)
export { serviceRepository, serviceImageRepository } from './repositories';

// Types
export type {
  ServiceDTO,
  ServicePublicDTO,
  CreateServiceDTO,
  UpdateServiceDTO,
  ServiceSearchFilters,
  ServiceListResponseDTO,
  ServiceCategoryDTO,
  ServiceImageDTO,
} from './types';

// Validators
export {
  createServiceSchema,
  updateServiceSchema,
  imageUploadRequestSchema,
  imageUploadConfirmSchema,
  updateImageOrderSchema,
  updateImageAltTextSchema,
} from './validators';

// Errors
export {
  ServiceNotFoundError,
  InvalidVisibilityStatusError,
  UnauthorizedServiceActionError,
  UnauthorizedServiceAccessError,
  InvalidStateTransitionError,
  PublicationRequirementsNotMetError,
  ServiceImageNotFoundError,
  MaxImagesExceededError,
  ServiceCategoryNotFoundError,
  S3OperationError,
  S3UploadFailedError,
  PresignedUrlGenerationError,
  S3DeleteFailedError,
  S3ObjectNotFoundError,
  ImageSizeLimitExceededError,
  InvalidMimeTypeError,
  UnauthorizedResourceAccessError,
} from './errors';
