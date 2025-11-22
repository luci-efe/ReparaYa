import { requireRole } from '@/modules/auth/utils/requireRole';
import { ServiceForm } from '@/components/services/ServiceForm';
import { notFound } from 'next/navigation';
import { serviceService, ServiceNotFoundError } from '@/modules/services';
import type { CreateServiceInput } from '@/modules/services/validators/service';
import { DashboardShell } from '@/components/contractors/DashboardShell';
// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

interface EditServicePageProps {
  params: {
    id: string;
  };
}

/**
 * Edit Service Page (Server Component)
 *
 * Requirements:
 * - User must be authenticated with CONTRACTOR role
 * - Fetch existing service data directly from service layer
 * - Verify service belongs to current contractor
 * - Renders client form component with pre-filled data
 * - On success, redirects to service detail page
 */
export default async function EditServicePage({ params }: EditServicePageProps) {
  // Verify authentication and role (CONTRACTOR only)
  const user = await requireRole('CONTRACTOR');

  // Fetch service data directly from service layer
  let service;
  try {
    service = await serviceService.getServiceById(params.id, user.id, user.role);

    if (!service) {
      notFound();
    }
  } catch (error) {
    if (error instanceof ServiceNotFoundError) {
      notFound();
    }
    console.error('Error fetching service:', error);
    notFound();
  }

  // Map service data to form default values
  const defaultValues: Partial<CreateServiceInput> = {
    categoryId: service.categoryId,
    title: service.title,
    description: service.description,
    basePrice: service.basePrice,
    durationMinutes: service.durationMinutes,
  };

  return (
    <DashboardShell title="Editar Servicio">
      <div className="max-w-3xl mx-auto">
        <ServiceForm mode="edit" serviceId={params.id} defaultValues={defaultValues} />
      </div>
    </DashboardShell>
  );
}
