import { getCurrentUser } from "./getCurrentUser";
import { UnauthorizedError } from "../errors";
import type { AuthUser } from "../types";

/**
 * Requiere que el usuario esté autenticado
 *
 * Lanza UnauthorizedError (401) si no hay sesión válida o usuario no existe en DB
 *
 * @returns Usuario autenticado
 * @throws {UnauthorizedError} Si no hay sesión válida
 *
 * @example
 * ```typescript
 * // En un API Route
 * export async function POST() {
 *   const user = await requireAuth();
 *   // user siempre estará definido aquí (o se lanzó error)
 *   return NextResponse.json({ userId: user.id });
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError(
      "No estás autenticado. Por favor inicia sesión."
    );
  }

  return user;
}
