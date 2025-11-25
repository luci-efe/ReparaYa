import { requireRole } from '@/modules/auth/utils/requireRole';
import { ClientDashboardShell } from '@/components/clients/ClientDashboardShell';
import { getUserDisplayName } from '@/lib/userUtils';
import { AddressList } from '@/components/clients/AddressList';

export default async function ClientAddressesPage() {
    const user = await requireRole('CLIENT');
    const userName = getUserDisplayName(user);

    return (
        <div className="container mx-auto px-4 py-8">
            <AddressList />
        </div>
    );
}
