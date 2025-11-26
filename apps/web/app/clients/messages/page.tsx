import { requireRole } from '@/modules/auth/utils/requireRole';
import { ClientMessagesPage } from '@/components/clients/messages/ClientMessagesPage';

export default async function Page() {
    await requireRole('CLIENT');
    return <ClientMessagesPage />;
}
