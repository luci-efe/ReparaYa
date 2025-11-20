/**
 * Single Service API Routes
 *
 * GET /api/services/:id - Get service details
 * PATCH /api/services/:id - Update service (owner only)
 * DELETE /api/services/:id - Soft-delete service (owner only)
 *
 * TODO: Implement all route handlers
 * TODO: Add authentication middleware
 * TODO: Add ownership validation
 * TODO: Add error handling
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/services/:id
 * Get single service details
 *
 * TODO: Implement service retrieval
 * TODO: Apply visibility rules (ACTIVE visible to all, DRAFT/PAUSED only to owner/admin)
 * TODO: Call serviceService.getService()
 * TODO: Return 200 OK with service data
 *
 * Auth: Optional (affects visibility)
 * Response: 200 OK | 404 Not Found | 500 Internal Server Error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Implement
    return NextResponse.json(
      { error: 'Not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error(`Error in GET /api/services/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/services/:id
 * Update service details
 *
 * TODO: Implement service update
 * TODO: Validate user is authenticated and is owner
 * TODO: Validate request body with updateServiceSchema
 * TODO: Call serviceService.updateService()
 * TODO: Return 200 OK with updated service
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
    // TODO: Implement
    return NextResponse.json(
      { error: 'Not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error(`Error in PATCH /api/services/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/services/:id
 * Soft-delete service (set status to ARCHIVED)
 *
 * TODO: Implement service deletion
 * TODO: Validate user is authenticated and is owner
 * TODO: Check for active bookings (future)
 * TODO: Call serviceService.deleteService()
 * TODO: Return 204 No Content
 *
 * Auth: Required (CONTRACTOR, owner only)
 * Response: 204 No Content | 400 Bad Request | 403 Forbidden | 404 Not Found | 500 Internal Server Error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Implement
    return NextResponse.json(
      { error: 'Not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error(`Error in DELETE /api/services/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
