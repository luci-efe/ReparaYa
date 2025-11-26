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
 *
 * @param url - Optional URL to configure (defaults to DATABASE_URL env var)
 * @returns Configured URL with pgbouncer parameters, or undefined if no URL provided
 */
export function getDatasourceUrl(url?: string): string | undefined {
  const baseUrl = url ?? process.env.DATABASE_URL;
  if (!baseUrl) return undefined;

  try {
    const parsedUrl = new URL(baseUrl);

    // Check if pgbouncer is already set to "true" - only skip if correctly configured
    if (parsedUrl.searchParams.get("pgbouncer") === "true") {
      // Ensure statement_cache_size is also set
      if (!parsedUrl.searchParams.has("statement_cache_size")) {
        parsedUrl.searchParams.set("statement_cache_size", "0");
        return parsedUrl.toString();
      }
      return baseUrl;
    }

    // Set/override PgBouncer parameters to ensure correct values
    parsedUrl.searchParams.set("pgbouncer", "true");
    parsedUrl.searchParams.set("statement_cache_size", "0");

    return parsedUrl.toString();
  } catch {
    // If URL parsing fails, fall back to string manipulation
    // This handles edge cases like URLs with special characters
    const lowerUrl = baseUrl.toLowerCase();

    // Check if pgbouncer=true is already present (correctly configured)
    if (lowerUrl.includes("pgbouncer=true")) {
      // Ensure statement_cache_size is also set
      if (!lowerUrl.includes("statement_cache_size=")) {
        const separator = baseUrl.includes("?") ? "&" : "?";
        return `${baseUrl}${separator}statement_cache_size=0`;
      }
      return baseUrl;
    }

    // If pgbouncer is set to something other than "true", we can't safely modify
    // the string without URL parsing, so just append our parameters
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}pgbouncer=true&statement_cache_size=0`;
  }
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
