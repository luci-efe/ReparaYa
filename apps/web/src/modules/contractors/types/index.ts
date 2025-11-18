import type { JsonValue } from '@prisma/client/runtime/library';

/**
 * Tipos de dominio para el módulo de contratistas
 */

/**
 * Estado de verificación del perfil de contratista
 * - DRAFT: Perfil en revisión (verified: false)
 * - ACTIVE: Perfil aprobado (verified: true)
 */
export type VerificationStatus = 'DRAFT' | 'ACTIVE';

/**
 * Perfil completo de contratista (para el propietario)
 */
export interface ContractorProfileDTO {
  id: string;
  userId: string;
  businessName: string;
  description: string;
  specialties: string[];
  verified: boolean;
  verificationDocuments: JsonValue;
  stripeConnectAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Perfil público de contratista (sin datos sensibles)
 * Usado para mostrar información en servicios y bookings
 */
export interface PublicContractorProfileDTO {
  id: string;
  userId: string;
  businessName: string;
  description: string;
  specialties: string[];
  verified: boolean;
}

/**
 * DTO para crear perfil de contratista
 */
export interface CreateContractorProfileDTO {
  businessName: string;
  description: string;
  specialties: string[];
  verificationDocuments?: unknown;
}

/**
 * DTO para actualizar perfil de contratista
 */
export interface UpdateContractorProfileDTO {
  businessName?: string;
  description?: string;
  specialties?: string[];
  verificationDocuments?: unknown;
}
