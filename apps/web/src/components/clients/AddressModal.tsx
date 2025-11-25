"use client";

import { Modal } from "@/components/ui/Modal";
import { AddressForm } from "./AddressForm";
import { Address } from "@/hooks/useAddresses";
import { CreateAddressValues } from "@/lib/validations/user";

interface AddressModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateAddressValues) => Promise<void>;
    initialData?: Address;
    isLoading?: boolean;
}

export function AddressModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isLoading,
}: AddressModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? "Editar dirección" : "Agregar nueva dirección"}
            maxWidth="lg"
        >
            <AddressForm
                initialData={initialData}
                onSubmit={onSubmit}
                onCancel={onClose}
                isLoading={isLoading}
            />
        </Modal>
    );
}
