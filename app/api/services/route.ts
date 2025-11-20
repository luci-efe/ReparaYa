/**
 * Services API Routes
 *
 * POST /api/services - Create new service (CONTRACTOR only)
 * GET /api/services - List public active services (catalog)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { serviceService } from '@/modules/services/services/serviceService';
import { createServiceSchema, serviceQuerySchema } from '@/modules/services/validators';
import {
  UnauthorizedServiceActionError,
  CategoryNotFoundError
} from '@/modules/services/errors';
import { ServiceStatus } from '@/modules/services/types';

/**
 * POST /api/services
 * Create a new service draft
 *
 * Auth: Required (CONTRACTOR)
 * Request Body: CreateServiceDTO
 * Response: 201 Created | 400 Bad Request | 403 Forbidden | 500 Internal Server Error
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Get user details to check role
    const user = await currentUser();
    const userRole = user?.publicMetadata?.role as string | undefined;

    if (userRole !== 'contractor') {
      return NextResponse.json(
        { error: 'Solo contratistas pueden crear servicios' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = createServiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos de entrada inválidos',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    // Create service
    const service = await serviceService.createService(userId, validation.data);

    return NextResponse.json(service, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/services:', error);

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
 * GET /api/services
 * List public active services (catalog)
 *
 * Auth: None required
 * Query Params: categoryId?, page?, limit?, minPrice?, maxPrice?
 * Response: 200 OK | 400 Bad Request | 500 Internal Server Error
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      categoryId: searchParams.get('categoryId') || undefined,
      minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined,
      maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    // Validate query params
    const validation = serviceQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parámetros de consulta inválidos',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    // Get public services (ACTIVE only)
    const filters = {
      ...validation.data,
      visibilityStatus: ServiceStatus.ACTIVE,
    };

    const services = await serviceService.getPublicServices(filters);

    return NextResponse.json({
      services,
      pagination: {
        page: validation.data.page,
        limit: validation.data.limit,
        total: services.length, // TODO: Get actual count from repository
      }
    });

  } catch (error) {
    console.error('Error in GET /api/services:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
