import { z } from 'zod';

/**
 * Validadores Zod para el módulo de usuarios
 */

/**
 * Schema para actualizar perfil de usuario
 */
export const updateUserProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'El nombre debe tener al menos 1 carácter')
    .max(100, 'El nombre no puede tener más de 100 caracteres')
    .optional(),
  lastName: z
    .string()
    .min(1, 'El apellido debe tener al menos 1 carácter')
    .max(100, 'El apellido no puede tener más de 100 caracteres')
    .optional(),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'El teléfono debe tener exactamente 10 dígitos')
    .optional(),
  avatarUrl: z
    .string()
    .url('La URL del avatar debe ser válida')
    .optional(),
});

/**
 * Schema para crear dirección
 */
export const createAddressSchema = z.object({
  addressLine1: z
    .string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(200, 'La dirección no puede tener más de 200 caracteres'),
  addressLine2: z
    .string()
    .max(200, 'La dirección complementaria no puede tener más de 200 caracteres')
    .optional(),
  city: z
    .string()
    .min(2, 'La ciudad debe tener al menos 2 caracteres')
    .max(100, 'La ciudad no puede tener más de 100 caracteres'),
  state: z
    .string()
    .min(2, 'El estado debe tener al menos 2 caracteres')
    .max(100, 'El estado no puede tener más de 100 caracteres'),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, 'El código postal debe tener exactamente 5 dígitos'),
  isDefault: z.boolean().optional().default(false),
});

/**
 * Schema para actualizar dirección
 */
export const updateAddressSchema = z.object({
  addressLine1: z
    .string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(200, 'La dirección no puede tener más de 200 caracteres')
    .optional(),
  addressLine2: z
    .string()
    .max(200, 'La dirección complementaria no puede tener más de 200 caracteres')
    .optional(),
  city: z
    .string()
    .min(2, 'La ciudad debe tener al menos 2 caracteres')
    .max(100, 'La ciudad no puede tener más de 100 caracteres')
    .optional(),
  state: z
    .string()
    .min(2, 'El estado debe tener al menos 2 caracteres')
    .max(100, 'El estado no puede tener más de 100 caracteres')
    .optional(),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, 'El código postal debe tener exactamente 5 dígitos')
    .optional(),
  isDefault: z.boolean().optional(),
});

/**
 * Tipos inferidos de los schemas
 */
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
