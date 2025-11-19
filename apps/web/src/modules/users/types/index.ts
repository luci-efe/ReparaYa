import { Decimal } from '@prisma/client/runtime/library';

/**
 * Tipos de dominio para el módulo de usuarios
 */

export type UserRole = 'CLIENT' | 'CONTRACTOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BLOCKED' | 'PENDING_VERIFICATION';

/**
 * Perfil completo de usuario incluyendo direcciones
 */
export interface UserProfile {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  addresses: Address[];
}

/**
 * Dirección de usuario
 */
export interface Address {
  id: string;
  userId: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat: Decimal | null;
  lng: Decimal | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTOs para request/response
 */

/**
 * DTO para actualizar perfil de usuario
 */
export interface UpdateUserProfileDTO {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

/**
 * DTO para crear dirección
 */
export interface CreateAddressDTO {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault?: boolean;
}

/**
 * DTO para actualizar dirección
 */
export interface UpdateAddressDTO {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  isDefault?: boolean;
}

/**
 * Perfil público de usuario (sin datos sensibles)
 * Usado para mostrar información en servicios y calificaciones
 */
export interface PublicUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}
