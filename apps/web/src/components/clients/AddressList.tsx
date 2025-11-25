"use client";

import { useState } from "react";
import { useAddresses, Address } from "@/hooks/useAddresses";
import { AddressCard } from "./AddressCard";
import { AddressModal } from "./AddressModal";
import { DeleteAddressDialog } from "./DeleteAddressDialog";
import { Button } from "@/components/ui/Button";
import { PlusIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { CreateAddressValues } from "@/lib/validations/user";

export function AddressList() {
    const {
        addresses,
        isLoading,
        error,
        createAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress,
    } = useAddresses();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | undefined>(undefined);
    const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

    const handleCreate = () => {
        setEditingAddress(undefined);
        setIsModalOpen(true);
    };

    const handleEdit = (address: Address) => {
        setEditingAddress(address);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (address: Address) => {
        setDeletingAddress(address);
    };

    const handleSetDefault = async (address: Address) => {
        try {
            setSettingDefaultId(address.id);
            await setDefaultAddress(address.id);
        } finally {
            setSettingDefaultId(null);
        }
    };

    const handleSubmit = async (data: CreateAddressValues) => {
        try {
            setIsSubmitting(true);
            if (editingAddress) {
                await updateAddress(editingAddress.id, data);
            } else {
                await createAddress(data);
            }
            setIsModalOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingAddress) return;
        try {
            setIsSubmitting(true);
            await deleteAddress(deletingAddress.id);
            setDeletingAddress(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
                <div className="h-40 bg-gray-200 rounded-lg"></div>
                <div className="h-40 bg-gray-200 rounded-lg"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-700 bg-red-100 rounded-lg">
                Error al cargar direcciones: {error}
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Mis Direcciones</h2>
                <Button onClick={handleCreate} className="flex items-center gap-2">
                    <PlusIcon className="w-5 h-5" />
                    Agregar dirección
                </Button>
            </div>

            {addresses.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                        <MapPinIcon />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No tienes direcciones guardadas</h3>
                    <p className="text-gray-500 mb-6">Agrega una dirección para facilitar tus solicitudes de servicio.</p>
                    <Button onClick={handleCreate}>Agregar dirección</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map((address) => (
                        <AddressCard
                            key={address.id}
                            address={address}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            onSetDefault={handleSetDefault}
                            isSettingDefault={settingDefaultId === address.id}
                        />
                    ))}
                </div>
            )}

            <AddressModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingAddress}
                isLoading={isSubmitting}
            />

            <DeleteAddressDialog
                isOpen={!!deletingAddress}
                onClose={() => setDeletingAddress(null)}
                onConfirm={handleConfirmDelete}
                address={deletingAddress}
                isLoading={isSubmitting}
            />
        </div>
    );
}
