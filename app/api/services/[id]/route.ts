/**
 * Single Service API Routes
 *
 * GET /api/services/:id - Get service details
 * PATCH /api/services/:id - Update service (owner only)
 * DELETE /api/services/:id - Soft-delete service (owner only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { serviceService } from '@/modules/services/services/serviceService';
import { updateServiceSchema } from '@/modules/services/validators';
import {
  ServiceNotFoundError,
  UnauthorizedServiceActionError,
  CategoryNotFoundError,
  ServiceHasActiveBookingsError
} from '@/modules/services/errors';

/**
 * GET /api/services/:id
 * Get single service details
 *
 * Auth: Optional (affects visibility)
 * Response: 200 OK | 404 Not Found | 500 Internal Server Error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get optional authentication
    const { userId } = await auth();
    let isAdmin = false;

    if (userId) {
      const user = await currentUser();
      const userRole = user?.publicMetadata?.role as string | undefined;
      isAdmin = userRole === 'admin';
    }

    // Get service with visibility rules
    const service = await serviceService.getService(params.id, userId || undefined, isAdmin);

    return NextResponse.json(service);

  } catch (error) {
    console.error(`Error in GET /api/services/${params.id}:`, error);

    if (error instanceof ServiceNotFoundError) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/services/:id
 * Update service details
 *
 * Auth: Required (CONTRACTOR, owner only)
 * Request Body: UpdateServiceDTO
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

    // Parse and validate request body
    const body = await request.json();
    const validation = updateServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos de entrada inválidos',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    // Update service
    const service = await serviceService.updateService(params.id, userId, validation.data);

    return NextResponse.json(service);

  } catch (error) {
    console.error(`Error in PATCH /api/services/${params.id}:`, error);

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

    if (error instanceof CategoryNotFoundError) {
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

/**
 * DELETE /api/services/:id
 * Soft-delete service (set status to ARCHIVED)
 *
 * Auth: Required (CONTRACTOR, owner only)
 * Response: 204 No Content | 400 Bad Request | 403 Forbidden | 404 Not Found | 500 Internal Server Error
 */
export async function DELETE(
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

    // Delete service (soft delete)
    await serviceService.deleteService(params.id, userId);

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error(`Error in DELETE /api/services/${params.id}:`, error);

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

    if (error instanceof ServiceHasActiveBookingsError) {
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
