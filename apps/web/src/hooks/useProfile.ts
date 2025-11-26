import { useState, useEffect, useCallback } from "react";
import { UpdateProfileValues } from "@/lib/validations/user";

export interface UserProfile {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    imageUrl: string | null;
}

export function useProfile() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch("/api/users/me");
            if (!res.ok) {
                throw new Error("Error al cargar el perfil");
            }
            const data = await res.json();
            setUser(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Ocurrió un error desconocido");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateProfile = async (values: UpdateProfileValues) => {
        try {
            const res = await fetch("/api/users/me", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || "Error al actualizar el perfil");
            }

            const updatedUser = await res.json();
            setUser(updatedUser);
            return updatedUser;
        } catch (err) {
            throw err;
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    return { user, isLoading, error, updateProfile, refetch: fetchProfile };
}
