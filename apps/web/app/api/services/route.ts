import { NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import {
  serviceService,
  ServiceNotFoundError,
  ServiceCategoryNotFoundError,
} from '@/modules/services';
import { createServiceSchema, serviceSearchFiltersSchema } from '@/modules/services/validators';
import { ZodError } from 'zod';

/**
 * GET /api/services
 * List ACTIVE services (public catalog)
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 10, max: 50)
 * - categoryId: string (optional)
 * - minPrice: number (optional)
 * - maxPrice: number (optional)
 * - search: string (optional)
 *
 * Returns: ServiceListResponseDTO (paginated)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse and validate query parameters
    const filters = serviceSearchFiltersSchema.parse({
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 10,
      category: searchParams.get('categoryId') || undefined,
      minPrice: searchParams.get('minPrice')
        ? parseFloat(searchParams.get('minPrice')!)
        : undefined,
      maxPrice: searchParams.get('maxPrice')
        ? parseFloat(searchParams.get('maxPrice')!)
        : undefined,
      search: searchParams.get('search') || undefined,
    });

    const result = await serviceService.getActiveServices(filters);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Parámetros de búsqueda inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error en GET /api/services:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/services
 * Create a new service (requires CONTRACTOR role)
 *
 * Body: CreateServiceDTO
 * Returns: ServiceDTO
 */
export async function POST(request: Request) {
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
    const validatedData = createServiceSchema.parse(body);

    const service = await serviceService.createService(validatedData, user.id);

    return NextResponse.json(service, { status: 201 });
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

    if (error instanceof ServiceCategoryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error('Error en POST /api/services:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
