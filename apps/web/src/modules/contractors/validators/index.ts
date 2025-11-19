import { z } from 'zod';

/**
 * Validadores Zod para el módulo de contratistas
 */

// Schema para JSON values compatible con Prisma JsonValue
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
);

/**
 * Schema para crear perfil de contratista
 */
export const createContractorProfileSchema = z.object({
  businessName: z
    .string()
    .min(1, 'El nombre del negocio debe tener al menos 1 carácter')
    .max(100, 'El nombre del negocio no puede tener más de 100 caracteres'),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(500, 'La descripción no puede tener más de 500 caracteres'),
  specialties: z
    .array(z.string())
    .min(1, 'Debe seleccionar al menos una especialidad')
    .max(10, 'No puede seleccionar más de 10 especialidades'),
  verificationDocuments: jsonValueSchema.optional(),
});

/**
 * Schema para actualizar perfil de contratista
 * Todos los campos son opcionales
 */
export const updateContractorProfileSchema = z.object({
  businessName: z
    .string()
    .min(1, 'El nombre del negocio debe tener al menos 1 carácter')
    .max(100, 'El nombre del negocio no puede tener más de 100 caracteres')
    .optional(),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(500, 'La descripción no puede tener más de 500 caracteres')
    .optional(),
  specialties: z
    .array(z.string())
    .min(1, 'Debe seleccionar al menos una especialidad')
    .max(10, 'No puede seleccionar más de 10 especialidades')
    .optional(),
  verificationDocuments: jsonValueSchema.optional(),
});

/**
 * Schema para verificar perfil de contratista (admin)
 */
export const verifyContractorProfileSchema = z.object({
  verified: z.boolean({
    required_error: 'El campo verified es requerido',
    invalid_type_error: 'El campo verified debe ser un booleano',
  }),
});

/**
 * Tipos inferidos de los schemas
 */
export type CreateContractorProfileInput = z.infer<typeof createContractorProfileSchema>;
export type UpdateContractorProfileInput = z.infer<typeof updateContractorProfileSchema>;
export type VerifyContractorProfileInput = z.infer<typeof verifyContractorProfileSchema>;
