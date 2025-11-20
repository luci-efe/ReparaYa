/**
 * Service Pause API Route
 *
 * PATCH /api/services/:id/pause - Pause service (ACTIVE → PAUSED)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { serviceService } from '@/modules/services/services/serviceService';
import {
  ServiceNotFoundError,
  UnauthorizedServiceActionError,
  InvalidServiceStateTransitionError
} from '@/modules/services/errors';

/**
 * PATCH /api/services/:id/pause
 * Pause service (ACTIVE → PAUSED)
 *
 * Auth: Required (CONTRACTOR owner or ADMIN)
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

    // Check if user is admin
    const user = await currentUser();
    const userRole = user?.publicMetadata?.role as string | undefined;
    const isAdmin = userRole === 'admin';

    // Pause service (admins can pause any service for moderation)
    const service = await serviceService.pauseService(params.id, userId, isAdmin);

    return NextResponse.json(service);

  } catch (error) {
    console.error(`Error in PATCH /api/services/${params.id}/pause:`, error);

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
