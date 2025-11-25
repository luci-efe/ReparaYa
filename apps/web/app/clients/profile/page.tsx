import { requireRole } from '@/modules/auth/utils/requireRole';
import { ProfileForm } from '@/components/clients/ProfileForm';

export default async function ClientProfilePage() {
    await requireRole('CLIENT');

    return (
        <div className="container mx-auto px-4 py-8">
            <ProfileForm />
        </div>
    );
}
