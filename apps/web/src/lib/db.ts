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
 * IMPORTANTE: Para entornos serverless (Vercel) con poolers (PgBouncer):
 * - Se desactivan los prepared statements con pgbouncer=true
 * - Se establece statement_cache_size=0
 * - Esto previene el error "prepared statement 's0' already exists"
 * - El pooler de Supabase usa transaction mode que no soporta prepared statements
 */

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  cachedPrisma?: PrismaClient;
};

/**
 * Configura la URL de conexión para compatibilidad con PgBouncer/poolers.
 * Agrega los parámetros necesarios para desactivar prepared statements
 * que causan el error "prepared statement 's0' already exists" en Vercel.
 */
function getDatasourceUrl(): string | undefined {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return undefined;

  // Check if pgbouncer parameters are already present
  if (baseUrl.includes("pgbouncer=true")) {
    return baseUrl;
  }

  // Add PgBouncer parameters to disable prepared statements
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}pgbouncer=true&statement_cache_size=0`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    // Use configured URL with PgBouncer parameters for pooler compatibility
    datasourceUrl: getDatasourceUrl(),
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
 * - Configurado para trabajar con PgBouncer/poolers (sin prepared statements)
 */
