import { z } from 'zod';

/**
 * Validadores Zod para servicios de contratistas
 */

/**
 * Schema para crear servicio
 */
export const createServiceSchema = z.object({
  categoryId: z
    .string()
    .uuid('El ID de categoría debe ser un UUID válido'),
  title: z
    .string()
    .trim()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(100, 'El título no puede tener más de 100 caracteres'),
  description: z
    .string()
    .trim()
    .min(50, 'La descripción debe tener al menos 50 caracteres')
    .max(2000, 'La descripción no puede tener más de 2000 caracteres'),
  basePrice: z
    .number()
    .positive('El precio debe ser un número positivo')
    .min(50, 'El precio mínimo es 50.00 MXN')
    .max(50000, 'El precio máximo es 50,000.00 MXN')
    .multipleOf(0.01, 'El precio debe tener máximo 2 decimales'),
  durationMinutes: z
    .number()
    .int('La duración debe ser un número entero')
    .min(30, 'La duración mínima es 30 minutos')
    .max(480, 'La duración máxima es 480 minutos (8 horas)'),
});

/**
 * Schema para actualizar servicio
 * Todos los campos son opcionales
 */
export const updateServiceSchema = z.object({
  categoryId: z
    .string()
    .uuid('El ID de categoría debe ser un UUID válido')
    .optional(),
  title: z
    .string()
    .trim()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(100, 'El título no puede tener más de 100 caracteres')
    .optional(),
  description: z
    .string()
    .trim()
    .min(50, 'La descripción debe tener al menos 50 caracteres')
    .max(2000, 'La descripción no puede tener más de 2000 caracteres')
    .optional(),
  basePrice: z
    .number()
    .positive('El precio debe ser un número positivo')
    .min(50, 'El precio mínimo es 50.00 MXN')
    .max(50000, 'El precio máximo es 50,000.00 MXN')
    .multipleOf(0.01, 'El precio debe tener máximo 2 decimales')
    .optional(),
  durationMinutes: z
    .number()
    .int('La duración debe ser un número entero')
    .min(30, 'La duración mínima es 30 minutos')
    .max(480, 'La duración máxima es 480 minutos (8 horas)')
    .optional(),
});

/**
 * Schema para filtros de búsqueda de servicios
 */
export const serviceSearchFiltersSchema = z.object({
  category: z.string().uuid('El ID de categoría debe ser un UUID válido').optional(),
  minPrice: z
    .number()
    .positive('El precio mínimo debe ser positivo')
    .optional(),
  maxPrice: z
    .number()
    .positive('El precio máximo debe ser positivo')
    .optional(),
  search: z
    .string()
    .trim()
    .min(2, 'El término de búsqueda debe tener al menos 2 caracteres')
    .max(100, 'El término de búsqueda no puede tener más de 100 caracteres')
    .optional(),
  page: z
    .number()
    .int('La página debe ser un número entero')
    .positive('La página debe ser positiva')
    .default(1),
  limit: z
    .number()
    .int('El límite debe ser un número entero')
    .positive('El límite debe ser positivo')
    .min(1, 'El límite mínimo es 1')
    .max(100, 'El límite máximo es 100')
    .default(20),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'], {
      errorMap: () => ({ message: 'Estado no válido' }),
    })
    .optional(),
  contractorId: z
    .string()
    .uuid('El ID de contratista debe ser un UUID válido')
    .optional(),
});

/**
 * Validación de requisitos de publicación
 */
export const publishServiceValidationSchema = z.object({
  // Verifica que el servicio cumpla requisitos para publicación
  verified: z
    .boolean()
    .refine((val) => val === true, {
      message: 'El contratista debe estar verificado para publicar servicios',
    }),
  hasImages: z
    .boolean()
    .refine((val) => val === true, {
      message: 'El servicio debe tener al menos 1 imagen para ser publicado',
    }),
  hasRequiredFields: z
    .boolean()
    .refine((val) => val === true, {
      message: 'El servicio debe tener todos los campos requeridos completos',
    }),
});

/**
 * Tipos inferidos de los schemas
 */
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type ServiceSearchFilters = z.infer<typeof serviceSearchFiltersSchema>;
export type PublishServiceValidation = z.infer<typeof publishServiceValidationSchema>;
