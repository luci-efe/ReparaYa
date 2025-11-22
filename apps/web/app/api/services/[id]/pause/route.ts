import { NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import {
  serviceService,
  ServiceNotFoundError,
  UnauthorizedServiceActionError,
  InvalidVisibilityStatusError,
  InvalidStateTransitionError,
} from '@/modules/services';

/**
 * PATCH /api/services/:id/pause
 * Pause a service (ACTIVE → PAUSED)
 *
 * Requires CONTRACTOR role and ownership
 *
 * Business rules:
 * - Service must be ACTIVE
 * - Paused services are not visible in the public catalog
 * - Owner can resume service later by publishing again
 *
 * Returns: ServiceDTO
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('CONTRACTOR');

    const pausedService = await serviceService.pauseService(params.id, user.id);

    return NextResponse.json(pausedService, { status: 200 });
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

    if (error instanceof UnauthorizedServiceActionError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof InvalidStateTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error en PATCH /api/services/:id/pause:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
