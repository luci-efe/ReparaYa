/**
 * Services API Routes
 *
 * POST /api/services - Create new service (CONTRACTOR only)
 * GET /api/services - List public active services (catalog)
 *
 * TODO: Implement all route handlers
 * TODO: Add authentication middleware
 * TODO: Add validation and error handling
 * TODO: Add rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/services
 * Create a new service draft
 *
 * TODO: Implement service creation
 * TODO: Validate user is authenticated with CONTRACTOR role
 * TODO: Validate request body with createServiceSchema
 * TODO: Call serviceService.createService()
 * TODO: Return 201 Created with service data
 *
 * Auth: Required (CONTRACTOR)
 * Request Body: CreateServiceDTO
 * Response: 201 Created | 400 Bad Request | 403 Forbidden | 500 Internal Server Error
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Implement
    return NextResponse.json(
      { error: 'Not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in POST /api/services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/services
 * List public active services (catalog)
 *
 * TODO: Implement public service listing
 * TODO: Parse query params (categoryId, page, limit, minPrice, maxPrice)
 * TODO: Validate query params with serviceQuerySchema
 * TODO: Call serviceService.getPublicServices()
 * TODO: Return 200 OK with paginated services
 *
 * Auth: None required
 * Query Params: categoryId?, page?, limit?, minPrice?, maxPrice?
 * Response: 200 OK | 400 Bad Request | 500 Internal Server Error
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Implement
    return NextResponse.json(
      { error: 'Not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in GET /api/services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
