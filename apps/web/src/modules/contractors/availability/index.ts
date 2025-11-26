/**
 * Barrel export for Contractor Availability module
 */

export * from './types';
export * from './validators';
export * from './repositories';

// Export services with explicit naming to avoid conflicts
export { availabilityService, UnauthorizedError, NotFoundError, BookingConflictError } from './services/availabilityService';
export { slotGeneratorService } from './services/slotGeneratorService';

// Errors (for error handling)
export * from './errors';

// Utils (for testing/integration)
export * from './utils';
