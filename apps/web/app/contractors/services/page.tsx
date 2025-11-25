import { requireRole } from '@/modules/auth/utils/requireRole';

import { contractorProfileService } from '@/modules/contractors';
import { ContractorProfileNotFoundError } from '@/modules/contractors/errors';
import { redirect } from 'next/navigation';
import { ServiceList } from '@/components/contractors/services/ServiceList';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

/**
 * Contractor Services List Page (Server Component)
 *
 * Requirements:
 * - Usuario autenticado con rol CONTRACTOR
 * - Muestra listado de servicios del contratista
 * - Permite filtrar por estado (DRAFT, ACTIVE, PAUSED)
 * - Acciones: Crear, Editar, Publicar/Pausar, Eliminar
 */
export default async function ContractorServicesPage() {
  // Verify authentication and role
  const user = await requireRole('CONTRACTOR');

  // Get contractor profile to verify it exists
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

  // Prepare user data for DashboardShell
  const _userName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.email;

  // Render page content directly since layout handles the shell
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mis Servicios</h1>
          <p className="mt-2 text-sm text-gray-600">
            Administra tus servicios publicados y en borrador
          </p>
        </div>
      </div>

      {/* Service List Component */}
      <ServiceList contractorId={user.id} profileVerified={profile.verified} />
    </div>
  );
}
