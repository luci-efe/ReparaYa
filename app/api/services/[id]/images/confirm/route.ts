/**
 * Service Image Upload Confirmation API Route
 *
 * POST /api/services/:id/images/confirm - Confirm image upload and save metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serviceService } from '@/modules/services/services/serviceService';
import { confirmImageUploadSchema } from '@/modules/services/validators/image';
import {
  ServiceNotFoundError,
  UnauthorizedServiceActionError
} from '@/modules/services/errors';

/**
 * POST /api/services/:id/images/confirm
 * Confirm image upload and save metadata to database
 *
 * NOTE: This is a STUB implementation. Full implementation requires:
 * - serviceImageRepository for saving metadata to database
 * - Verification that S3 object actually exists
 * - Transaction support for atomicity
 *
 * Auth: Required (CONTRACTOR, owner only)
 * Request Body: { s3Key: string, s3Url: string, width?: number, height?: number, altText?: string }
 * Response: 201 Created | 400 Bad Request | 403 Forbidden | 404 Not Found | 500 Internal Server Error
 */
export async function POST(
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
    const validation = confirmImageUploadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos de entrada inválidos',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { s3Key, s3Url, width, height, altText } = validation.data;

    // Verify service exists and user is owner
    const service = await serviceService.getService(params.id, userId);
    if (service.contractorId !== userId) {
      return NextResponse.json(
        { error: 'No tienes permiso para agregar imágenes a este servicio' },
        { status: 403 }
      );
    }

    // TODO: Verify S3 object exists
    // const exists = await storageService.objectExists({ bucket, key: s3Key });
    // if (!exists.exists) {
    //   return NextResponse.json(
    //     { error: 'El archivo no fue subido correctamente a S3' },
    //     { status: 400 }
    //   );
    // }

    // TODO: Save image metadata to database
    // const imageMetadata = await serviceImageRepository.create({
    //   serviceId: params.id,
    //   s3Key,
    //   s3Url,
    //   width,
    //   height,
    //   altText,
    //   order: currentImageCount, // Get from repository
    // });

    // STUB: Return mock response
    const imageMetadata = {
      id: crypto.randomUUID(),
      serviceId: params.id,
      s3Key,
      s3Url,
      width: width || null,
      height: height || null,
      altText: altText || null,
      order: 0, // TODO: Get actual count
      uploadedAt: new Date().toISOString(),
    };

    return NextResponse.json(imageMetadata, { status: 201 });

  } catch (error) {
    console.error(`Error in POST /api/services/${params.id}/images/confirm:`, error);

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

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
