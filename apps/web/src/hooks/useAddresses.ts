import { useState, useEffect, useCallback } from "react";
import { CreateAddressValues, UpdateAddressValues } from "@/lib/validations/user";

export interface Address {
    id: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    isDefault: boolean;
}

export function useAddresses() {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAddresses = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch("/api/users/me/addresses");
            if (!res.ok) throw new Error("Error al cargar direcciones");
            const data = await res.json();
            setAddresses(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createAddress = async (values: CreateAddressValues) => {
        const res = await fetch("/api/users/me/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "Error al crear dirección");
        }
        await fetchAddresses();
    };

    const updateAddress = async (id: string, values: UpdateAddressValues) => {
        const res = await fetch(`/api/users/me/addresses/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "Error al actualizar dirección");
        }
        await fetchAddresses();
    };

    const deleteAddress = async (id: string) => {
        const res = await fetch(`/api/users/me/addresses/${id}`, {
            method: "DELETE",
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "Error al eliminar dirección");
        }
        await fetchAddresses();
    };

    const setDefaultAddress = async (id: string) => {
        // Assuming backend handles setting default via update or specific endpoint.
        // If specific endpoint is needed, adjust here.
        // Based on common patterns, updating isDefault to true is often enough.
        // But let's check if there is a specific endpoint in the file listing.
        // No specific 'default' endpoint seen in file listing, only [id]/route.ts.
        // So likely PATCH with isDefault: true.
        await updateAddress(id, { isDefault: true });
    };

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    return {
        addresses,
        isLoading,
        error,
        createAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
        refetch: fetchAddresses,
    };
}
