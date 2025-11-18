import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import type { AuthUser } from "../types";

/**
 * Obtiene el usuario autenticado actual desde la base de datos
 *
 * Este helper:
 * 1. Obtiene el userId de Clerk desde la sesión activa
 * 2. Busca el usuario en la base de datos local usando clerkUserId
 * 3. Si no existe en DB pero SÍ en Clerk, lo crea automáticamente (JIT provisioning)
 * 4. Retorna el usuario completo con rol y datos de ReparaYa
 *
 * @returns Usuario autenticado o null si no hay sesión
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
    let user = await db.user.findUnique({
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

    // Si el usuario no existe en DB, crearlo (JIT provisioning para desarrollo local)
    if (!user) {
      console.log("[getCurrentUser] Usuario no encontrado en DB, creando automáticamente...");

      const clerkUser = await currentUser();
      if (!clerkUser) {
        return null;
      }

      const primaryEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
      )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

      if (!primaryEmail) {
        console.error("[getCurrentUser] No se encontró email primario");
        return null;
      }

      // Usar upsert para evitar race conditions (idempotente)
      user = await db.user.upsert({
        where: { clerkUserId },
        update: {
          // Si ya existe (creado por otra llamada concurrente), actualizar datos
          email: primaryEmail,
          firstName: clerkUser.firstName || "",
          lastName: clerkUser.lastName || "",
          avatarUrl: clerkUser.imageUrl || null,
        },
        create: {
          clerkUserId,
          email: primaryEmail,
          firstName: clerkUser.firstName || "",
          lastName: clerkUser.lastName || "",
          avatarUrl: clerkUser.imageUrl || null,
          role: "CLIENT",
          status: "ACTIVE",
        },
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

      console.log("[getCurrentUser] Usuario sincronizado:", { userId: user.id, email: user.email });
    }

    return user;
  } catch (error) {
    console.error("[getCurrentUser] Error al obtener usuario:", error);
    return null;
  }
}
