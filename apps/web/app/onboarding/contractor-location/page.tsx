import { requireRole } from '@/modules/auth/utils/requireRole';
import { contractorProfileService } from '@/modules/contractors';
import { ContractorProfileNotFoundError } from '@/modules/contractors/errors';
import { redirect } from 'next/navigation';
import { ContractorLocationOnboardingForm } from '@/components/contractors/ContractorLocationOnboardingForm';

/**
 * Página de onboarding para capturar ubicación y zona de servicio del contratista (Server Component)
 *
 * Requisitos:
 * - Usuario autenticado con rol CONTRACTOR
 * - Flujo de wizard (paso después de completar perfil)
 * - Validación client-side y server-side
 * - Manejo de errores de geocodificación
 */
export default async function ContractorLocationOnboardingPage() {
  // Verify authentication and role
  const user = await requireRole('CONTRACTOR');

  // Get contractor profile
  let profile;
  try {
    profile = await contractorProfileService.getProfileByUserId(user.id);
  } catch (error) {
    // If no profile exists, redirect to profile creation first
    if (error instanceof ContractorProfileNotFoundError) {
      redirect('/onboarding/contractor-profile');
    }
    throw error;
  }

  // Render client component with profile ID
  return <ContractorLocationOnboardingForm contractorProfileId={profile.id} />;
}
