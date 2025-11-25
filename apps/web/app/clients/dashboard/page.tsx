import { requireAuth } from '@/modules/auth/utils/requireAuth';
import { redirect } from 'next/navigation';
import { ClientDashboardShell } from '@/components/clients/ClientDashboardShell';
import { WelcomeWidget } from '@/components/clients/WelcomeWidget';
import { ClientQuickAccessTiles } from '@/components/clients/ClientQuickAccessTiles';
import { ClientMetricsOverview } from '@/components/clients/ClientMetricsOverview';
import { UpcomingBookings } from '@/components/clients/UpcomingBookings';
import { getUserDisplayName } from '@/lib/userUtils';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

export default async function ClientDashboardPage() {
    // Verify authentication
    const user = await requireAuth();

    // Verify role and redirect if not CLIENT
    if (user.role !== 'CLIENT') {
        if (user.role === 'CONTRACTOR') {
            redirect('/contractors/dashboard');
        }
        if (user.role === 'ADMIN') {
            redirect('/admin/dashboard');
        }
        redirect('/');
    }

    // TODO: Fetch user addresses count
    const addressCount = 0;

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
            <div className="space-y-6">
                {/* 1. Welcome Widget */}
                <WelcomeWidget
                    user={{ name: userName, imageUrl: user.avatarUrl || undefined }}
                />

                {/* 2. Quick Access Tiles */}
                <ClientQuickAccessTiles />

                {/* 3. Metrics Overview */}
                <ClientMetricsOverview />

                {/* 4. Upcoming Bookings */}
                <UpcomingBookings />
            </div>
        </ClientDashboardShell>
    );
}
