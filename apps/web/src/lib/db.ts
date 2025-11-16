import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client Singleton
 *
 * En desarrollo (hot reload), Next.js puede reiniciar múltiples veces,
 * lo que causaría la creación de múltiples instancias de PrismaClient.
 * Esto agota las conexiones a la base de datos y causa errores.
 *
 * Solución: Almacenar la instancia en globalThis, que persiste entre
 * hot reloads pero se reinicia en producción.
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  cachedPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.cachedPrisma = prisma;
}

// Alias for backwards compatibility
export const db = prisma;

/**
 * Uso:
 *
 * ```typescript
 * import { prisma } from '@/lib/db';
 *
 * const users = await prisma.user.findMany();
 * ```
 *
 * Beneficios:
 * - Una sola instancia de PrismaClient en toda la aplicación
 * - No agota conexiones en desarrollo
 * - Logs en desarrollo, silencioso en producción
 * - Compatible con Vercel Serverless Functions
 */
