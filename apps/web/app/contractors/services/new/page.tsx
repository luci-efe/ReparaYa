import { requireRole } from '@/modules/auth/utils/requireRole';
import { ServiceForm } from '@/components/services/ServiceForm';

// Force dynamic rendering since this page uses authentication
export const dynamic = 'force-dynamic';

/**
 * Create Service Page (Server Component)
 *
 * Requirements:
 * - User must be authenticated with CONTRACTOR role
 * - Renders client form component for service creation
 * - On success, redirects to service detail page
 *
 * Breadcrumb: Dashboard > Mis Servicios > Crear
 */
export default async function CreateServicePage() {
  // Verify authentication and role (CONTRACTOR only)
  await requireRole('CONTRACTOR');

  return <ServiceForm mode="create" />;
}
