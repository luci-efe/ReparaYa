import { requireRole } from '@/modules/auth/utils/requireRole';

export default async function ClientSettingsPage() {
    await requireRole('CLIENT');

    return (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuración</h1>
            <p className="text-gray-500">Esta sección estará disponible próximamente.</p>
        </div>
    );
}
