import { NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import { serviceService } from '@/modules/services/services/serviceService';
import {
  ServiceNotFoundError,
  InvalidStateTransitionError,
} from '@/modules/services/errors';

/**
 * PATCH /api/admin/services/:id/activate
 * Admin reactivate paused service (PAUSED → ACTIVE)
 *
 * Business rules:
 * - Only ADMIN role can access
 * - Service must be PAUSED
 * - Audit log captures admin action
 *
 * Returns: ServiceDTO
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Require ADMIN role
    const admin = await requireRole('ADMIN');

    // Activate service using admin service method
    const activatedService = await serviceService.adminActivateService(
      params.id,
      admin.id
    );

    return NextResponse.json(activatedService, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ServiceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof InvalidStateTransitionError) {
      return NextResponse.json(
        {
          error: error.message,
          details: {
            fromStatus: error.fromStatus,
            toStatus: error.toStatus,
          },
        },
        { status: 400 }
      );
    }

    console.error('Error en PATCH /api/admin/services/:id/activate:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
