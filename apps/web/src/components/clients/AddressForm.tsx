"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAddressSchema, CreateAddressValues } from "@/lib/validations/user";
import { Address } from "@/hooks/useAddresses";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormButton } from "@/components/ui/FormButton";
import { Button } from "@/components/ui/Button";
import { useEffect } from "react";

interface AddressFormProps {
    initialData?: Address;
    onSubmit: (data: CreateAddressValues) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

export function AddressForm({
    initialData,
    onSubmit,
    onCancel,
    isLoading = false,
}: AddressFormProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateAddressValues>({
        resolver: zodResolver(createAddressSchema),
        defaultValues: {
            isDefault: false,
        },
    });

    useEffect(() => {
        if (initialData) {
            reset({
                addressLine1: initialData.addressLine1,
                addressLine2: initialData.addressLine2 || "",
                city: initialData.city,
                state: initialData.state,
                postalCode: initialData.postalCode,
                isDefault: initialData.isDefault,
            });
        } else {
            reset({
                addressLine1: "",
                addressLine2: "",
                city: "",
                state: "",
                postalCode: "",
                isDefault: false,
            });
        }
    }, [initialData, reset]);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
                label="Dirección (Calle y número)"
                {...register("addressLine1")}
                error={errors.addressLine1?.message}
                placeholder="Ej. Av. Reforma 123"
            />

            <Input
                label="Interior / Depto (Opcional)"
                {...register("addressLine2")}
                error={errors.addressLine2?.message}
                placeholder="Ej. Depto 4B"
            />

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Ciudad"
                    {...register("city")}
                    error={errors.city?.message}
                />
                <Input
                    label="Estado"
                    {...register("state")}
                    error={errors.state?.message}
                />
            </div>

            <Input
                label="Código Postal"
                {...register("postalCode")}
                error={errors.postalCode?.message}
                placeholder="Ej. 06600"
                maxLength={5}
            />

            <div className="pt-2">
                <Checkbox
                    id="isDefault"
                    label="Establecer como dirección predeterminada"
                    {...register("isDefault")}
                />
            </div>
            {errors.isDefault && (
                <p className="text-sm text-red-600">{errors.isDefault.message}</p>
            )}

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
                    Cancelar
                </Button>
                <FormButton label={initialData ? "Actualizar" : "Guardar"} isLoading={isLoading} />
            </div>
        </form>
    );
}
