import { requireRole } from '@/modules/auth/utils/requireRole';
import { contractorProfileService } from '@/modules/contractors';
import { DashboardShell } from '@/components/contractors/DashboardShell';
import { VerificationStatusWidget } from '@/components/contractors/VerificationStatusWidget';
import { QuickAccessTiles } from '@/components/contractors/QuickAccessTiles';
import { ServiceAreaCTA } from '@/components/contractors/ServiceAreaCTA';
import { MetricsOverview } from '@/components/contractors/MetricsOverview';
import { AvailabilitySummary } from '@/components/contractors/AvailabilitySummary';
import { ContractorProfileNotFoundError } from '@/modules/contractors/errors';
import { redirect } from 'next/navigation';

/**
 * Contractor Dashboard Page (Server Component)
 *
 * Reglas de negocio:
 * - Solo accesible para usuarios con rol CONTRACTOR
 * - Si el contratista no tiene perfil, redirige a onboarding
 * - Muestra estado de verificación y secciones del dashboard
 */
export default async function ContractorDashboardPage() {
  // Verificar autenticación y rol
  const user = await requireRole('CONTRACTOR');

  // Intentar obtener perfil de contratista
  let profile;
  try {
    profile = await contractorProfileService.getProfileByUserId(user.id);
  } catch (error) {
    // Si no tiene perfil, redirigir a onboarding
    if (error instanceof ContractorProfileNotFoundError) {
      redirect('/onboarding/contractor-profile');
    }
    throw error; // Re-throw other errors
  }

  // Renderizar dashboard con datos del servidor
  const userName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.email;

  return (
    <DashboardShell
      user={{
        id: user.id,
        name: userName,
        email: user.email,
        imageUrl: user.avatarUrl || undefined,
      }}
      _profile={{
        verified: profile.verified,
        businessName: profile.businessName || 'Mi Negocio',
      }}
    >
      {/* Dashboard Content */}
      <div className="space-y-6">
        {/* 1. Verification Status */}
        <VerificationStatusWidget verified={profile.verified} />

        {/* 2. Service Area CTA (conditional) */}
        {/* TODO: Check profile.serviceArea once service area feature is implemented */}
        <ServiceAreaCTA hasServiceArea={false} />

        {/* 3. Quick Access Tiles */}
        <QuickAccessTiles />

        {/* 4. Metrics Overview */}
        <MetricsOverview />

        {/* 5. Availability Summary */}
        <AvailabilitySummary />
      </div>
    </DashboardShell>
  );
}
