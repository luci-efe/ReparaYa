import { requireRole } from '@/modules/auth/utils/requireRole';
import { ClientDashboardShell } from '@/components/clients/ClientDashboardShell';
import { getUserDisplayName } from '@/lib/userUtils';
import { ProfileForm } from '@/components/clients/ProfileForm';

export default async function ClientProfilePage() {
    const user = await requireRole('CLIENT');
    const userName = getUserDisplayName(user);

    return (
        <ClientDashboardShell
            user={{
                id: user.id,
                name: userName,
                email: user.email,
                imageUrl: user.avatarUrl || undefined,
            }}
        >
            <ProfileForm />
        </ClientDashboardShell>
    );
}
