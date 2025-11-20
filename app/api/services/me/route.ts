/**
 * Contractor's Own Services API Route
 *
 * GET /api/services/me - List all services owned by authenticated contractor
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { serviceService } from '@/modules/services/services/serviceService';
import { serviceQuerySchema } from '@/modules/services/validators';
import { ServiceStatus } from '@/modules/services/types';

/**
 * GET /api/services/me
 * List all services owned by authenticated contractor (all statuses)
 *
 * Auth: Required (CONTRACTOR)
 * Query Params: page?, limit?, status?
 * Response: 200 OK | 403 Forbidden | 500 Internal Server Error
 */
export async function GET(request: NextRequest) {
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
        { error: 'Solo contratistas pueden acceder a este endpoint' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const queryParams = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      visibilityStatus: statusParam ? (statusParam as ServiceStatus) : undefined,
    };

    // Validate query params
    const validation = serviceQuerySchema.partial().safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Parámetros de consulta inválidos',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    // Get contractor's services
    const services = await serviceService.getContractorServices(userId, validation.data);

    return NextResponse.json({
      services,
      pagination: {
        page: validation.data.page || 1,
        limit: validation.data.limit || 20,
        total: services.length, // TODO: Get actual count from repository
      }
    });

  } catch (error) {
    console.error('Error in GET /api/services/me:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
