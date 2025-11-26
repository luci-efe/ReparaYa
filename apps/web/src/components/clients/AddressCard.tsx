"use client";

import { Address } from "@/hooks/useAddresses";
import { Button } from "@/components/ui/Button";
import { PencilIcon, TrashIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";

interface AddressCardProps {
    address: Address;
    onEdit: (address: Address) => void;
    onDelete: (address: Address) => void;
    onSetDefault: (address: Address) => void;
    isDeleting?: boolean;
    isSettingDefault?: boolean;
    canDelete?: boolean;
}

export function AddressCard({
    address,
    onEdit,
    onDelete,
    onSetDefault,
    isDeleting = false,
    isSettingDefault = false,
    canDelete = true,
}: AddressCardProps) {
    const isDeleteDisabled = isDeleting || !canDelete;
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative">
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{address.addressLine1}</h3>
                    {address.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Predeterminada
                        </span>
                    )}
                </div>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(address)}
                        aria-label="Editar dirección"
                        className="text-gray-500 hover:text-blue-600"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(address)}
                        disabled={isDeleteDisabled}
                        aria-label="Eliminar dirección"
                        className="text-gray-500 hover:text-red-600 disabled:opacity-30"
                        title={!canDelete ? "No puedes eliminar tu única dirección" : undefined}
                    >
                        <TrashIcon className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="text-sm text-gray-600 space-y-1 mb-4">
                {address.addressLine2 && <p>{address.addressLine2}</p>}
                <p>
                    {address.city}, {address.state} {address.postalCode}
                </p>
            </div>

            {!address.isDefault && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSetDefault(address)}
                    disabled={isSettingDefault}
                    className="text-sm text-gray-500 hover:text-blue-600 pl-0 flex items-center gap-1"
                >
                    {isSettingDefault ? (
                        <span className="animate-pulse">Guardando...</span>
                    ) : (
                        <>
                            <CheckCircleIcon className="w-4 h-4" />
                            Establecer como predeterminada
                        </>
                    )}
                </Button>
            )}
            {address.isDefault && (
                <div className="text-sm text-blue-600 flex items-center gap-1 font-medium">
                    <CheckCircleSolidIcon className="w-4 h-4" />
                    Dirección principal
                </div>
            )}
        </div>
    );
}
