/**
 * Valida que las variables de entorno críticas de Clerk estén configuradas
 *
 * Según AUTH-001, la aplicación NO DEBE iniciar si falta CLERK_SECRET_KEY
 *
 * @throws Error si falta alguna variable crítica
 */
export function validateAuthEnv(): void {
  const requiredEnvVars = {
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  };

  const missingVars: string[] = [];

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value || value.trim() === '') {
      missingVars.push(key);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Variables de entorno críticas faltantes: ${missingVars.join(', ')}. ` +
      'La aplicación no puede iniciar sin estas variables configuradas.'
    );
  }
}

/**
 * Valida variables de entorno opcionales y registra advertencias
 */
export function validateOptionalAuthEnv(): string[] {
  const optionalEnvVars = {
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  };

  const warnings: string[] = [];

  for (const [key, value] of Object.entries(optionalEnvVars)) {
    if (!value || value.trim() === '') {
      warnings.push(`⚠️  Variable opcional no configurada: ${key}`);
    }
  }

  return warnings;
}
