import { requireAnyRole } from '@/modules/auth/utils/requireRole';
import { contractorProfileService } from '@/modules/contractors';
import { ContractorProfileNotFoundError } from '@/modules/contractors/errors';
import { redirect } from 'next/navigation';
import { ContractorLocationSettingsForm } from '@/components/contractors/ContractorLocationSettingsForm';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

/**
 * Página de configuración de ubicación para contratistas (Server Component)
 *
 * Requisitos:
 * - Usuario autenticado con rol CONTRACTOR o ADMIN
 * - Fetch de ubicación existente
 * - Edición permitida si:
 *   - Perfil está en DRAFT, o
 *   - Usuario es ADMIN (puede editar perfiles activos)
 * - Advertencia si perfil está ACTIVE y no es admin
 */
export default async function ContractorLocationSettingsPage() {
  // Verify authentication and role (allow both CONTRACTOR and ADMIN)
  const user = await requireAnyRole(['CONTRACTOR', 'ADMIN']);

  const isAdmin = user.role === 'ADMIN';

  // Get contractor profile
  let profile;
  try {
    profile = await contractorProfileService.getProfileByUserId(user.id);
  } catch (error) {
    // If no profile exists, redirect to profile creation
    if (error instanceof ContractorProfileNotFoundError) {
      redirect('/onboarding/contractor-profile');
    }
    throw error;
  }

  // Determine profile status based on verified field
  const profileStatus = profile.verified ? 'ACTIVE' : 'DRAFT';

  // Render client component with profile data
  return (
    <ContractorLocationSettingsForm
      contractorProfileId={profile.id}
      isAdmin={isAdmin}
      profileStatus={profileStatus}
    />
  );
}
