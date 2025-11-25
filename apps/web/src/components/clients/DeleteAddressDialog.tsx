"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Address } from "@/hooks/useAddresses";

interface DeleteAddressDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    address: Address | null;
    isLoading?: boolean;
}

export function DeleteAddressDialog({
    isOpen,
    onClose,
    onConfirm,
    address,
    isLoading,
}: DeleteAddressDialogProps) {
    if (!address) return null;

    return (
        <ConfirmDialog
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={onConfirm}
            title="Eliminar dirección"
            description={`¿Estás seguro que deseas eliminar la dirección "${address.addressLine1}"? Esta acción no se puede deshacer.`}
            confirmText="Eliminar"
            variant="danger"
            isLoading={isLoading}
        />
    );
}
