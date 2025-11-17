/**
 * Módulo de gestión de usuarios
 *
 * Proporciona servicios y tipos para gestión de perfiles de usuario,
 * direcciones y datos públicos.
 */

// Servicios
export { userService } from './services/userService';
export { addressService } from './services/addressService';

// Tipos
export type {
  UserProfile,
  Address,
  UpdateUserProfileDTO,
  CreateAddressDTO,
  UpdateAddressDTO,
  PublicUserProfile,
  UserRole,
  UserStatus,
} from './types';

// Validadores
export {
  updateUserProfileSchema,
  createAddressSchema,
  updateAddressSchema,
} from './validators';

// Errores
export {
  UserNotFoundError,
  AddressNotFoundError,
  ForbiddenActionError,
  CannotDeleteLastAddressError,
} from './errors';
