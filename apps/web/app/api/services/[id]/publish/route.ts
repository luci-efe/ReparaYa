import { NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import {
  serviceService,
  ServiceNotFoundError,
  UnauthorizedServiceActionError,
  InvalidVisibilityStatusError,
  PublicationRequirementsNotMetError,
} from '@/modules/services';

/**
 * PATCH /api/services/:id/publish
 * Publish a service (DRAFT → ACTIVE or PAUSED → ACTIVE)
 *
 * Requires CONTRACTOR role and ownership
 *
 * Business rules:
 * - Contractor must be verified
 * - Service must have at least 1 image
 * - All required fields must be filled
 * - Updates lastPublishedAt timestamp
 *
 * Returns: ServiceDTO
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('CONTRACTOR');

    const publishedService = await serviceService.publishService(params.id, user.id);

    return NextResponse.json(publishedService, { status: 200 });
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

    if (error instanceof InvalidVisibilityStatusError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof PublicationRequirementsNotMetError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error en PATCH /api/services/:id/publish:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
