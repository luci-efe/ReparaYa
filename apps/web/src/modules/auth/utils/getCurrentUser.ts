import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { AuthUser } from "../types";

/**
 * Obtiene el usuario autenticado actual desde la base de datos
 *
 * Este helper:
 * 1. Obtiene el userId de Clerk desde la sesión activa
 * 2. Busca el usuario en la base de datos local usando clerkUserId
 * 3. Retorna el usuario completo con rol y datos de ReparaYa
 *
 * @returns Usuario autenticado o null si no hay sesión o usuario no existe en DB
 *
 * @example
 * ```typescript
 * // En un Server Component
 * const user = await getCurrentUser();
 * if (!user) redirect('/sign-in');
 *
 * console.log(user.role); // 'CLIENT', 'CONTRACTOR', 'ADMIN'
 * ```
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // Obtener sesión de Clerk
    const { userId: clerkUserId } = await auth();

    // Si no hay sesión, retornar null
    if (!clerkUserId) {
      return null;
    }

    // Buscar usuario en base de datos
    const user = await db.user.findUnique({
      where: { clerkUserId },
      select: {
        id: true,
        clerkUserId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (error) {
    console.error("[getCurrentUser] Error al obtener usuario:", error);
    return null;
  }
}
