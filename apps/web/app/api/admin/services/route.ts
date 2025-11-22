import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import { serviceService } from '@/modules/services/services/serviceService';
import type { ServiceVisibilityStatus } from '@prisma/client';

/**
 * GET /api/admin/services
 * List all services with filters (admin only)
 *
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20)
 * - status: VisibilityStatus (DRAFT | ACTIVE | PAUSED | ARCHIVED)
 * - contractorId: string
 * - categoryId: string
 * - search: string
 *
 * Returns: ServiceListResponseDTO
 */
export async function GET(request: NextRequest) {
  try {
    // Require ADMIN role
    const admin = await requireRole('ADMIN');

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status') as ServiceVisibilityStatus | null;
    const contractorId = searchParams.get('contractorId');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');

    // Validate pagination params
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Parámetros de paginación inválidos (page >= 1, 1 <= limit <= 100)' },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'].includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido. Valores permitidos: DRAFT, ACTIVE, PAUSED, ARCHIVED' },
        { status: 400 }
      );
    }

    // Build filters
    const filters = {
      page,
      limit,
      ...(status && { status }),
      ...(contractorId && { contractorId }),
      ...(categoryId && { category: categoryId }),
      ...(search && { search }),
    };

    // Get services using admin service method
    const result = await serviceService.adminGetAllServices(filters);

    // Audit log
    console.log('[AUDIT] Admin list services', {
      adminUserId: admin.id,
      filters,
      resultCount: result.services.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error('Error en GET /api/admin/services:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
