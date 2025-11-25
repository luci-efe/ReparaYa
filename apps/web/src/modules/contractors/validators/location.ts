import { z } from 'zod';

/**
 * Validadores Zod para ubicación y zona de servicio de contratistas
 */

/**
 * Schema para dirección normalizada
 */
export const addressSchema = z.object({
  street: z
    .string()
    .trim()
    .min(3, 'La calle debe tener al menos 3 caracteres')
    .max(200, 'La calle no puede tener más de 200 caracteres'),
  exteriorNumber: z
    .string()
    .trim()
    .min(1, 'El número exterior es requerido')
    .max(20, 'El número exterior no puede tener más de 20 caracteres'),
  interiorNumber: z
    .string()
    .trim()
    .max(20, 'El número interior no puede tener más de 20 caracteres')
    .optional(),
  neighborhood: z
    .string()
    .trim()
    .max(100, 'La colonia no puede tener más de 100 caracteres')
    .optional(),
  city: z
    .string()
    .trim()
    .min(2, 'La ciudad debe tener al menos 2 caracteres')
    .max(100, 'La ciudad no puede tener más de 100 caracteres'),
  state: z
    .string()
    .trim()
    .min(2, 'El estado debe tener al menos 2 caracteres')
    .max(100, 'El estado no puede tener más de 100 caracteres'),
  postalCode: z
    .string()
    .regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos'),
  country: z
    .enum(['MX', 'US', 'CO', 'PE', 'AR'], {
      errorMap: () => ({ message: 'País no soportado. Use: MX, US, CO, PE, AR' }),
    }),
});

/**
 * Schema para zona de servicio tipo RADIUS
 */
export const radiusServiceZoneSchema = z.object({
  zoneType: z.literal('RADIUS'),
  radiusKm: z
    .number()
    .int('El radio debe ser un número entero')
    .min(1, 'El radio mínimo es 1 km')
    .max(100, 'El radio máximo es 100 km'),
});

/**
 * Schema para zona de servicio tipo POLYGON (futuro)
 */
export const polygonServiceZoneSchema = z.object({
  zoneType: z.literal('POLYGON'),
  polygonCoordinates: z
    .array(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
    )
    .min(3, 'Un polígono debe tener al menos 3 puntos')
    .max(50, 'Un polígono no puede tener más de 50 puntos')
    .refine(
      (coords) => {
        if (coords.length < 3) return true;
        const first = coords[0];
        const last = coords[coords.length - 1];
        return first.lat === last.lat && first.lng === last.lng;
      },
      { message: 'El polígono debe estar cerrado (primer punto = último punto)' }
    ),
});

/**
 * Schema para zona de servicio (discriminated union)
 */
export const serviceZoneSchema = z.discriminatedUnion('zoneType', [
  radiusServiceZoneSchema,
  // polygonServiceZoneSchema deshabilitado en MVP
  // polygonServiceZoneSchema,
]);

/**
 * Schema para crear ubicación de contratista
 * Estructura plana que combina address + serviceZone
 */
export const createLocationSchema = z
  .object({
    // Address fields
    street: z
      .string()
      .trim()
      .min(3, 'La calle debe tener al menos 3 caracteres')
      .max(200, 'La calle no puede tener más de 200 caracteres'),
    exteriorNumber: z
      .string()
      .trim()
      .min(1, 'El número exterior es requerido')
      .max(20, 'El número exterior no puede tener más de 20 caracteres'),
    interiorNumber: z
      .string()
      .trim()
      .max(20, 'El número interior no puede tener más de 20 caracteres')
      .optional(),
    neighborhood: z
      .string()
      .trim()
      .max(100, 'La colonia no puede tener más de 100 caracteres')
      .optional(),
    city: z
      .string()
      .trim()
      .min(2, 'La ciudad debe tener al menos 2 caracteres')
      .max(100, 'La ciudad no puede tener más de 100 caracteres'),
    state: z
      .string()
      .trim()
      .min(2, 'El estado debe tener al menos 2 caracteres')
      .max(100, 'El estado no puede tener más de 100 caracteres'),
    postalCode: z
      .string()
      .regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos'),
    country: z.enum(['MX', 'US', 'CO', 'PE', 'AR'], {
      errorMap: () => ({ message: 'País no soportado. Use: MX, US, CO, PE, AR' }),
    }),
    // Service zone fields
    zoneType: z.literal('RADIUS'),
    radiusKm: z
      .number()
      .int('El radio debe ser un número entero')
      .min(1, 'El radio mínimo es 1 km')
      .max(100, 'El radio máximo es 100 km'),
  })
  .strict();

/**
 * Schema para actualizar ubicación de contratista
 * Todos los campos son opcionales (estructura plana)
 */
export const updateLocationSchema = z
  .object({
    // Address fields (all optional)
    street: z
      .string()
      .trim()
      .min(3, 'La calle debe tener al menos 3 caracteres')
      .max(200, 'La calle no puede tener más de 200 caracteres')
      .optional(),
    exteriorNumber: z
      .string()
      .trim()
      .min(1, 'El número exterior es requerido')
      .max(20, 'El número exterior no puede tener más de 20 caracteres')
      .optional(),
    interiorNumber: z
      .string()
      .trim()
      .max(20, 'El número interior no puede tener más de 20 caracteres')
      .optional(),
    neighborhood: z
      .string()
      .trim()
      .max(100, 'La colonia no puede tener más de 100 caracteres')
      .optional(),
    city: z
      .string()
      .trim()
      .min(2, 'La ciudad debe tener al menos 2 caracteres')
      .max(100, 'La ciudad no puede tener más de 100 caracteres')
      .optional(),
    state: z
      .string()
      .trim()
      .min(2, 'El estado debe tener al menos 2 caracteres')
      .max(100, 'El estado no puede tener más de 100 caracteres')
      .optional(),
    postalCode: z
      .string()
      .regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos')
      .optional(),
    country: z
      .enum(['MX', 'US', 'CO', 'PE', 'AR'], {
        errorMap: () => ({ message: 'País no soportado. Use: MX, US, CO, PE, AR' }),
      })
      .optional(),
    // Service zone fields (optional)
    zoneType: z.enum(['RADIUS', 'POLYGON']).optional(),
    radiusKm: z
      .number()
      .int('El radio debe ser un número entero')
      .min(1, 'El radio mínimo es 1 km')
      .max(100, 'El radio máximo es 100 km')
      .optional(),
    polygonCoordinates: z
      .array(
        z.object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
        })
      )
      .optional(),
  })
  .strict();

/**
 * Tipos inferidos de los schemas
 */
export type AddressInput = z.infer<typeof addressSchema>;
export type RadiusServiceZone = z.infer<typeof radiusServiceZoneSchema>;
export type PolygonServiceZone = z.infer<typeof polygonServiceZoneSchema>;
export type ServiceZone = z.infer<typeof serviceZoneSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

/**
 * Helper para convertir flat input a nested DTO
 */
export function flatToNestedLocationDTO(flat: CreateLocationInput) {
  return {
    address: {
      street: flat.street,
      exteriorNumber: flat.exteriorNumber,
      interiorNumber: flat.interiorNumber,
      neighborhood: flat.neighborhood,
      city: flat.city,
      state: flat.state,
      postalCode: flat.postalCode,
      country: flat.country,
    },
    serviceZone: {
      type: flat.zoneType,
      radiusKm: flat.radiusKm,
    },
  };
}
