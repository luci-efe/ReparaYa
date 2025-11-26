import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { RatingForm } from './RatingForm';

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { stars: number; comment: string }) => Promise<void>;
    title?: string;
    isLoading?: boolean;
}

export const RatingModal: React.FC<RatingModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    title = 'Calificar Servicio',
    isLoading,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 hover:bg-gray-100"
                    >
                        <XMarkIcon className="h-5 w-5 text-gray-500" />
                    </button>
                </div>
                <RatingForm onSubmit={onSubmit} isLoading={isLoading} />
            </div>
        </div>
    );
};
