import { NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import { serviceService } from '@/modules/services';
import type { ServiceVisibilityStatus } from '@prisma/client';

/**
 * GET /api/services/me
 * List all services owned by the authenticated contractor
 *
 * Query params:
 * - status: VisibilityStatus (optional) - Filter by status (DRAFT, ACTIVE, PAUSED, ARCHIVED)
 *
 * Returns: ServiceDTO[]
 */
export async function GET(request: Request) {
  try {
    const user = await requireRole('CONTRACTOR');
    const { searchParams } = new URL(request.url);

    // Parse optional status filter
    const statusParam = searchParams.get('status');
    console.log('[API] GET /services/me - Status Param:', statusParam);

    const filters = statusParam
      ? { status: statusParam as ServiceVisibilityStatus }
      : undefined;

    console.log('[API] GET /services/me - Filters:', filters);

    const services = await serviceService.getContractorServices(user.id, filters);
    console.log(`[API] GET /services/me - Found ${services.length} services`);

    return NextResponse.json(services, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error('Error en GET /api/services/me:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
