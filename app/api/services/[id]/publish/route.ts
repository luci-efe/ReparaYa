/**
 * Service Publication API Route
 *
 * PATCH /api/services/:id/publish - Publish service (DRAFT → ACTIVE or PAUSED → ACTIVE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serviceService } from '@/modules/services/services/serviceService';
import {
  ServiceNotFoundError,
  UnauthorizedServiceActionError,
  ServicePublicationRequirementsNotMetError,
  InvalidServiceStateTransitionError
} from '@/modules/services/errors';

/**
 * PATCH /api/services/:id/publish
 * Publish service (DRAFT → ACTIVE or PAUSED → ACTIVE)
 *
 * Auth: Required (CONTRACTOR, owner only)
 * Response: 200 OK | 400 Bad Request | 403 Forbidden | 404 Not Found | 500 Internal Server Error
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Publish service
    const service = await serviceService.publishService(params.id, userId);

    return NextResponse.json(service);

  } catch (error) {
    console.error(`Error in PATCH /api/services/${params.id}/publish:`, error);

    if (error instanceof ServiceNotFoundError) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    if (error instanceof UnauthorizedServiceActionError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error instanceof ServicePublicationRequirementsNotMetError) {
      return NextResponse.json(
        {
          error: 'El servicio no cumple con los requisitos para publicación',
          missingRequirements: error.missingRequirements
        },
        { status: 400 }
      );
    }

    if (error instanceof InvalidServiceStateTransitionError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
