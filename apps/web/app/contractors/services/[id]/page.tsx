import { requireRole } from '@/modules/auth/utils/requireRole';
import { contractorProfileService } from '@/modules/contractors';
import { ContractorProfileNotFoundError } from '@/modules/contractors/errors';
import { serviceService, ServiceNotFoundError } from '@/modules/services';
import { redirect, notFound } from 'next/navigation';
import { ServiceDetailClient } from '@/components/contractors/services/ServiceDetailClient';
import { DashboardShell } from '@/components/contractors/DashboardShell';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

/**
 * Service Detail Page (Server Component)
 *
 * Requirements:
 * - Usuario autenticado con rol CONTRACTOR
 * - Verificar ownership del servicio
 * - Mostrar detalles completos del servicio
 * - Galería de imágenes con capacidad de subir/eliminar
 * - Acciones: Editar, Publicar/Pausar, Eliminar
 * - Publication checklist para servicios DRAFT
 *
 * Route: /contractors/services/:id
 */
export default async function ServiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Verify authentication and role
  const user = await requireRole('CONTRACTOR');

  // Get contractor profile to verify it exists and get verification status
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

  // Fetch service directly from service layer
  // This avoids the issue where calling the API without auth headers returns 404 for DRAFT services
  let service;
  try {
    // We pass user.id and user.role to ensure the service layer knows it's the owner accessing it
    const serviceData = await serviceService.getServiceById(params.id, user.id, user.role);

    if (!serviceData) {
      notFound();
    }

    service = serviceData;

    // Verify ownership (extra safety check, though getServiceById should handle it with the params)
    if (service.contractorId !== user.id) {
      notFound();
    }
  } catch (error) {
    if (error instanceof ServiceNotFoundError) {
      notFound();
    }
    console.error('Error fetching service:', error);
    throw error;
  }

  // Prepare user data for DashboardShell
  const userName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.email;

  // Render client component for interactivity wrapped in DashboardShell
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ServiceDetailClient
          service={service}
          contractorId={user.id}
          profileVerified={profile.verified}
        />
      </div>
    </DashboardShell>
  );
}
