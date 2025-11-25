import { z } from "zod";

export const updateProfileSchema = z.object({
    firstName: z.string().min(1, "El nombre es requerido"),
    lastName: z.string().min(1, "El apellido es requerido"),
    phone: z
        .string()
        .length(10, "El teléfono debe tener 10 dígitos")
        .regex(/^\d+$/, "El teléfono solo debe contener números"),
});

export const createAddressSchema = z.object({
    addressLine1: z
        .string()
        .min(5, "La dirección debe tener al menos 5 caracteres")
        .max(200, "La dirección no puede exceder 200 caracteres"),
    addressLine2: z.string().optional(),
    city: z.string().min(2, "La ciudad debe tener al menos 2 caracteres"),
    state: z.string().min(2, "El estado es requerido").max(100),
    postalCode: z
        .string()
        .length(5, "El código postal debe tener 5 dígitos")
        .regex(/^\d+$/, "El código postal solo debe contener números"),
    isDefault: z.boolean(),
});

export const updateAddressSchema = createAddressSchema.partial();

export type UpdateProfileValues = z.infer<typeof updateProfileSchema>;
export type CreateAddressValues = z.infer<typeof createAddressSchema>;
export type UpdateAddressValues = z.infer<typeof updateAddressSchema>;
