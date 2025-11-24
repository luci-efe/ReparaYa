import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { contractorProfileRepository } from '@/modules/contractors/repositories/contractorProfileRepository';
import { DashboardShell } from '@/components/contractors/DashboardShell';
import { AvailabilityManager } from '@/components/contractors/availability/AvailabilityManager';

export const metadata = {
    title: 'Gestionar Disponibilidad | ReparaYa',
    description: 'Configura tus horarios de trabajo y disponibilidad.',
};

export default async function AvailabilityPage() {
    const { userId } = auth();
    if (!userId) {
        redirect('/sign-in');
    }

    const user = await currentUser();
    if (!user) {
        redirect('/sign-in');
    }

    const profile = await contractorProfileRepository.findByClerkId(userId);

    if (!profile) {
        // If no profile, maybe redirect to onboarding or show error
        // For now, let's assume they should have one if they are in this route
        return (
            <div className="p-8 text-center">
                <h1 className="text-2xl font-bold text-red-600">No se encontró perfil de contratista</h1>
                <p className="mt-2 text-gray-600">Por favor completa tu registro como contratista.</p>
            </div>
        );
    }

    const mappedUser = {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim() || user.username || 'Usuario',
        email: user.emailAddresses[0]?.emailAddress || '',
        imageUrl: user.imageUrl,
    };

    const mappedProfile = {
        verified: profile.verified,
        businessName: profile.businessName,
    };

    return (
        <DashboardShell user={mappedUser} _profile={mappedProfile}>
            <AvailabilityManager />
        </DashboardShell>
    );
}
