import { requireRole } from '@/modules/auth/utils/requireRole';
import { AddressList } from '@/components/clients/AddressList';

export default async function ClientAddressesPage() {
    await requireRole('CLIENT');

    return (
        <div className="container mx-auto px-4 py-8">
            <AddressList />
        </div>
    );
}
