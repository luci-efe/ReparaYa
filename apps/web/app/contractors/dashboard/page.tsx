import { requireRole } from '@/modules/auth/utils/requireRole';
import { contractorProfileService } from '@/modules/contractors';
import { VerificationStatusWidget } from '@/components/contractors/VerificationStatusWidget';
import { QuickAccessTiles } from '@/components/contractors/QuickAccessTiles';
import { ServiceAreaCTA } from '@/components/contractors/ServiceAreaCTA';
import { MetricsOverview } from '@/components/contractors/MetricsOverview';
import { AvailabilitySummary } from '@/components/contractors/AvailabilitySummary';
import { ContractorProfileNotFoundError } from '@/modules/contractors/errors';
import { redirect } from 'next/navigation';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

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

  return (
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
  );
}
