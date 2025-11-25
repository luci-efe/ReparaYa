"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema, UpdateProfileValues } from "@/lib/validations/user";
import { useProfile } from "@/hooks/useProfile";
import { Input } from "@/components/ui/Input";
import { FormButton } from "@/components/ui/FormButton";
import { useEffect, useState } from "react";

export function ProfileForm() {
    const { user, isLoading, error, updateProfile, refetch } = useProfile();
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<UpdateProfileValues>({
        resolver: zodResolver(updateProfileSchema),
    });

    useEffect(() => {
        if (user) {
            reset({
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                phone: user.phone || "",
            });
        }
    }, [user, reset]);

    const onSubmit = async (data: UpdateProfileValues) => {
        setIsSaving(true);
        setSaveMessage(null);
        try {
            await updateProfile(data);
            setSaveMessage({ type: "success", text: "Perfil actualizado correctamente" });
        } catch (err) {
            setSaveMessage({
                type: "error",
                text: err instanceof Error ? err.message : "Error al actualizar el perfil",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-10 bg-gray-200 rounded w-full"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-700 bg-red-100 rounded-lg flex items-center justify-between">
                <span>Error al cargar el perfil: {error}</span>
                <button
                    onClick={() => refetch()}
                    className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Mi Perfil</h2>

            <div className="mb-6 flex items-center space-x-4">
                {user?.imageUrl && (
                    <img
                        src={user.imageUrl}
                        alt="Avatar"
                        className="h-16 w-16 rounded-full object-cover border border-gray-200"
                    />
                )}
                <div>
                    <p className="text-sm text-gray-500">Correo electrónico</p>
                    <p className="font-medium text-gray-900">{user?.email}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                        label="Nombre"
                        {...register("firstName")}
                        error={errors.firstName?.message}
                        disabled={isSaving}
                    />
                    <Input
                        label="Apellido"
                        {...register("lastName")}
                        error={errors.lastName?.message}
                        disabled={isSaving}
                    />
                </div>

                <Input
                    label="Teléfono"
                    {...register("phone")}
                    error={errors.phone?.message}
                    placeholder="10 dígitos"
                    disabled={isSaving}
                />

                {saveMessage && (
                    <div
                        className={`p-3 rounded-md text-sm ${saveMessage.type === "success"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                    >
                        {saveMessage.text}
                    </div>
                )}

                <div className="flex justify-end">
                    <FormButton label="Guardar Cambios" isLoading={isSaving} />
                </div>
            </form>
        </div>
    );
}
