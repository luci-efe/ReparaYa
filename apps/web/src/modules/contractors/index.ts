/**
 * Módulo de gestión de perfiles de contratistas
 *
 * Proporciona servicios y tipos para gestión de perfiles profesionales,
 * verificación KYC y preparación para Stripe Connect.
 */

// Servicios
export { contractorProfileService } from './services/contractorProfileService';

// Tipos
export type {
  ContractorProfileDTO,
  PublicContractorProfileDTO,
  CreateContractorProfileDTO,
  UpdateContractorProfileDTO,
  VerificationStatus,
} from './types';

// Validadores
export {
  createContractorProfileSchema,
  updateContractorProfileSchema,
  verifyContractorProfileSchema,
} from './validators';

// Errores
export {
  ContractorProfileNotFoundError,
  ContractorProfileAlreadyExistsError,
  InvalidVerificationStatusError,
  UnauthorizedContractorActionError,
} from './errors';

// Nota: No exportamos el repositorio (capa interna)
