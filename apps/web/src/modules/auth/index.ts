/**
 * Módulo de Autenticación - ReparaYa
 *
 * Este módulo proporciona utilidades para trabajar con autenticación
 * basada en Clerk y autorización basada en roles.
 *
 * @module auth
 */

// Tipos
export type { AuthUser, UserRole, UserStatus } from "./types";

// Errores
export { UnauthorizedError, ForbiddenError } from "./errors";

// Utilidades de autenticación
export { getCurrentUser } from "./utils/getCurrentUser";
export { requireAuth } from "./utils/requireAuth";
export { requireRole, requireAnyRole } from "./utils/requireRole";

/**
 * Ejemplos de uso:
 *
 * @example
 * // En un Server Component
 * import { getCurrentUser } from '@/modules/auth';
 *
 * export default async function ProfilePage() {
 *   const user = await getCurrentUser();
 *   if (!user) redirect('/sign-in');
 *   return <div>Hola {user.firstName}</div>;
 * }
 *
 * @example
 * // En un API Route con autorización
 * import { requireRole } from '@/modules/auth';
 * import { NextResponse } from 'next/server';
 *
 * export async function DELETE() {
 *   const admin = await requireRole('ADMIN');
 *   // Solo admins llegan aquí
 *   return NextResponse.json({ success: true });
 * }
 *
 * @example
 * // En un Server Action
 * 'use server';
 * import { requireAuth } from '@/modules/auth';
 *
 * export async function updateProfile(data: ProfileData) {
 *   const user = await requireAuth();
 *   // Actualizar perfil del usuario autenticado
 * }
 */
