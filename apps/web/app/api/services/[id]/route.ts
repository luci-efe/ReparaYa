import { NextResponse } from 'next/server';
import { requireRole, requireAnyRole } from '@/modules/auth/utils/requireRole';
import { requireAuth } from '@/modules/auth/utils/requireAuth';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import {
  serviceService,
  ServiceNotFoundError,
  UnauthorizedServiceActionError,
  UnauthorizedServiceAccessError,
  InvalidVisibilityStatusError,
  ServiceCategoryNotFoundError,
  PublicationRequirementsNotMetError,
  InvalidStateTransitionError,
} from '@/modules/services';
import { updateServiceSchema } from '@/modules/services/validators';
import { ZodError } from 'zod';

/**
 * GET /api/services/:id
 * Get a single service
 *
 * Business rules:
 * - Public users can see ACTIVE services only
 * - Service owner can see their service in any status
 * - Admins can see any service in any status
 *
 * Returns: ServiceDTO
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Try to get authenticated user (optional)
    let userId: string | undefined;
    let userRole: string | undefined;

    try {
      const user = await requireAuth();
      userId = user.id;
      userRole = user.role;
    } catch (error) {
      // Not authenticated, continue as public user
    }

    const service = await serviceService.getServiceById(params.id, userId, userRole);

    if (!service) {
      return NextResponse.json(
        { error: 'Servicio no encontrado o no accesible' },
        { status: 404 }
      );
    }

    return NextResponse.json(service, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('Error en GET /api/services/:id:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/services/:id
 * Update a service (requires CONTRACTOR role and ownership)
 *
 * Body: UpdateServiceDTO
 * Returns: ServiceDTO
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('CONTRACTOR');

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'JSON inválido en el cuerpo de la petición' },
        { status: 400 }
      );
    }

    // Validate data with Zod
    const validatedData = updateServiceSchema.parse(body);

    const updatedService = await serviceService.updateService(
      params.id,
      validatedData,
      user.id
    );

    return NextResponse.json(updatedService, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
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

    if (error instanceof ServiceCategoryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof UnauthorizedServiceAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof PublicationRequirementsNotMetError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof InvalidStateTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error en PATCH /api/services/:id:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/:id
 * Delete a service (soft delete to ARCHIVED status)
 * Requires CONTRACTOR role and ownership
 *
 * Returns: 204 No Content
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireRole('CONTRACTOR');

    await serviceService.deleteService(params.id, user.id);

    return new NextResponse(null, { status: 204 });
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

    if (error instanceof UnauthorizedServiceAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error('Error en DELETE /api/services/:id:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
