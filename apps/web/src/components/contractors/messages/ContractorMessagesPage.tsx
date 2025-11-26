'use client';

import { ConversationList } from '@/components/shared/messaging/ConversationList';

export function ContractorMessagesPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Mensajes</h1>
                <p className="text-gray-600 mt-2">
                    Gestiona tus conversaciones con los clientes.
                </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h2 className="font-semibold text-gray-700">Conversaciones Recientes</h2>
                </div>
                <div className="p-4">
                    <ConversationList role="contractor" />
                </div>
            </div>
        </div>
    );
}
