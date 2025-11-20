/**
 * Services Module - Public API
 *
 * Export main interfaces, types, and services for use by other modules
 *
 * @module services
 */

// Types and DTOs
export type {
  ServiceDTO,
  PublicServiceDTO,
  CreateServiceDTO,
  UpdateServiceDTO,
  ServiceQueryFilters,
  PaginatedServicesDTO,
  ServiceImageDTO,
  PublicImageDTO,
  CategoryDTO,
  CategorySummaryDTO,
  ContractorSummaryDTO,
  ServiceStateTransition,
  StateTransitionValidation,
} from './types';

export { ServiceStatus, Currency } from './types';

// Validators
export {
  createServiceSchema,
  updateServiceSchema,
  serviceQuerySchema,
  requestUploadUrlSchema,
  confirmImageUploadSchema,
  createCategorySchema,
  updateCategorySchema,
  VALIDATION_CONSTANTS,
} from './validators';

export type {
  CreateServiceInput,
  UpdateServiceInput,
  ServiceQueryInput,
  RequestUploadUrlInput,
  ConfirmImageUploadInput,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './validators';

// Errors
export {
  ServiceNotFoundError,
  InvalidServiceStateTransitionError,
  UnauthorizedServiceActionError,
  ServicePublicationRequirementsNotMetError,
  ServiceHasActiveBookingsError,
  CategoryNotFoundError,
  CategorySlugAlreadyExistsError,
  CircularCategoryHierarchyError,
  ImageLimitExceededError,
  InvalidImageFormatError,
  ImageSizeExceededError,
  ServiceImageNotFoundError,
  S3UploadFailedError,
  isServiceError,
  isCategoryError,
  isImageError,
} from './errors';

// Service Layer (Business Logic)
export { serviceService } from './services/serviceService';

// Repository Layer (Data Access)
export { serviceRepository } from './repositories/serviceRepository';

// Storage Abstraction
export type {
  IStorageService,
  PresignedUploadRequest,
  PresignedUploadResponse,
  DeleteObjectRequest,
  DeleteObjectResponse,
  ObjectExistsRequest,
  ObjectExistsResponse,
} from '../../../lib/aws/s3StorageService';

export {
  getStorageService,
  setStorageService,
  MockStorageService,
} from '../../../lib/aws/s3StorageService';
