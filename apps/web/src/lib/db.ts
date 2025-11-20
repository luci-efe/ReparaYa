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
 *
 * IMPORTANTE: En entornos serverless (Vercel), las conexiones pueden
 * reutilizarse entre invocaciones. Para evitar el error
 * "prepared statement already exists", configuramos el datasource
 * con pgbouncer=true que desactiva prepared statements.
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
    datasources: {
      db: {
        url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'pgbouncer=true&connection_limit=1',
      },
    },
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
