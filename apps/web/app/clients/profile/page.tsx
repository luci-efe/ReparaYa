import { requireRole } from '@/modules/auth/utils/requireRole';
import { ClientDashboardShell } from '@/components/clients/ClientDashboardShell';

export default async function ClientProfilePage() {
    const user = await requireRole('CLIENT');

    const userName = user.firstName
        ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
        : user.email;

    return (
        <ClientDashboardShell
            user={{
                id: user.id,
                name: userName,
                email: user.email,
                imageUrl: user.avatarUrl || undefined,
            }}
        >
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Mi Perfil</h1>
                <p className="text-gray-500">Esta sección estará disponible próximamente.</p>
            </div>
        </ClientDashboardShell>
    );
}
