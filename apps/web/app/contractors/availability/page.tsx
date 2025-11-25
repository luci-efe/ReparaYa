import { requireRole } from '@/modules/auth/utils/requireRole';
import { contractorProfileRepository } from '@/modules/contractors/repositories/contractorProfileRepository';
import { AvailabilityManager } from '@/components/contractors/availability/AvailabilityManager';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'Gestionar Disponibilidad | ReparaYa',
    description: 'Configura tus horarios de trabajo y disponibilidad.',
};

export default async function AvailabilityPage() {
    const user = await requireRole('CONTRACTOR');

    const profile = await contractorProfileRepository.findByUserId(user.id);

    if (!profile) {
        redirect('/onboarding/contractor-profile');
    }

    return <AvailabilityManager />;
}
