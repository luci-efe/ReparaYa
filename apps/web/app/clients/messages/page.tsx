import { requireRole } from '@/modules/auth/utils/requireRole';
import { ClientDashboardShell } from '@/components/clients/ClientDashboardShell';
import { getUserDisplayName } from '@/lib/userUtils';

export default async function ClientMessagesPage() {
    const user = await requireRole('CLIENT');

    const userName = getUserDisplayName(user);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Mensajes</h1>
                <p className="text-gray-500">Esta sección estará disponible próximamente.</p>
            </div>
        </div>
    );
}
