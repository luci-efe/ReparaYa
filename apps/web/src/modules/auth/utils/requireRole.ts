import { requireAuth } from "./requireAuth";
import { ForbiddenError } from "../errors";
import type { AuthUser, UserRole } from "../types";

/**
 * Requiere que el usuario esté autenticado Y tenga un rol específico
 *
 * @param role - Rol requerido ('CLIENT', 'CONTRACTOR', 'ADMIN')
 * @returns Usuario autenticado con el rol requerido
 * @throws {UnauthorizedError} Si no hay sesión válida (401)
 * @throws {ForbiddenError} Si el usuario no tiene el rol requerido (403)
 *
 * @example
 * ```typescript
 * // En un API Route para admin
 * export async function DELETE() {
 *   const admin = await requireRole('ADMIN');
 *   // Solo admins llegan aquí
 *   return NextResponse.json({ ok: true });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // En un Server Action
 * 'use server';
 *
 * export async function createService() {
 *   const contractor = await requireRole('CONTRACTOR');
 *   // Solo contratistas pueden crear servicios
 * }
 * ```
 */
export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.role !== role) {
    throw new ForbiddenError(
      `Acceso prohibido. Esta acción requiere el rol: ${role}`,
      role
    );
  }

  return user;
}

/**
 * Verifica si el usuario tiene uno de los roles permitidos
 *
 * @param allowedRoles - Array de roles permitidos
 * @returns Usuario autenticado con uno de los roles permitidos
 * @throws {UnauthorizedError} Si no hay sesión válida (401)
 * @throws {ForbiddenError} Si el usuario no tiene ninguno de los roles (403)
 *
 * @example
 * ```typescript
 * // Permitir tanto admins como contractors
 * export async function GET() {
 *   const user = await requireAnyRole(['ADMIN', 'CONTRACTOR']);
 *   // Admins y contractors llegan aquí, clients no
 * }
 * ```
 */
export async function requireAnyRole(
  allowedRoles: UserRole[]
): Promise<AuthUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Acceso prohibido. Se requiere uno de los siguientes roles: ${allowedRoles.join(", ")}`,
      allowedRoles.join(" | ")
    );
  }

  return user;
}
