import { requireRole } from '@/modules/auth/utils/requireRole';
import { WelcomeWidget } from '@/components/clients/WelcomeWidget';
import { ClientQuickAccessTiles } from '@/components/clients/ClientQuickAccessTiles';
import { ClientMetricsOverview } from '@/components/clients/ClientMetricsOverview';
import { UpcomingBookings } from '@/components/clients/UpcomingBookings';
import { getUserDisplayName } from '@/lib/userUtils';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

export default async function ClientDashboardPage() {
    // Verify authentication and role
    const user = await requireRole('CLIENT');

    const userName = getUserDisplayName(user);

    return (
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
    );
}
