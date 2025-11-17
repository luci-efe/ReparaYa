/**
 * Tipos de roles de usuario en ReparaYa
 */
export type UserRole = "CLIENT" | "CONTRACTOR" | "ADMIN";

/**
 * Estados de usuario
 */
export type UserStatus = "ACTIVE" | "BLOCKED" | "PENDING_VERIFICATION";

/**
 * Usuario autenticado con datos de la base de datos
 * (incluye información de Clerk + datos propios de ReparaYa)
 */
export interface AuthUser {
  id: string; // UUID de nuestra DB
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Información básica de sesión de Clerk
 */
export interface ClerkSession {
  userId: string; // Clerk user ID
}
