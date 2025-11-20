/**
 * Service Image Deletion API Route
 *
 * DELETE /api/services/:id/images/:imageId - Delete service image
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serviceService } from '@/modules/services/services/serviceService';
import { mockStorageService } from '@/lib/aws/__mocks__/s3StorageService';
import {
  ServiceNotFoundError,
  UnauthorizedServiceActionError,
  ServiceImageNotFoundError
} from '@/modules/services/errors';

/**
 * DELETE /api/services/:id/images/:imageId
 * Delete service image from S3 and database
 *
 * NOTE: This is a STUB implementation. Full implementation requires:
 * - serviceImageRepository for deleting metadata from database
 * - Verification that user owns the service
 * - Transaction support for atomicity (delete from S3 and DB)
 * - Error handling for partial failures
 *
 * Auth: Required (CONTRACTOR, owner only)
 * Response: 204 No Content | 403 Forbidden | 404 Not Found | 500 Internal Server Error
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
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

    // Verify service exists and user is owner
    const service = await serviceService.getService(params.id, userId);
    if (service.contractorId !== userId) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar imágenes de este servicio' },
        { status: 403 }
      );
    }

    // TODO: Get image metadata from database
    // const image = await serviceImageRepository.findById(params.imageId);
    // if (!image || image.serviceId !== params.id) {
    //   throw new ServiceImageNotFoundError(params.imageId);
    // }

    // TODO: Delete from S3
    // const bucket = process.env.AWS_S3_BUCKET_MEDIA || 'reparaya-media-dev';
    // await storageService.deleteObject({ bucket, key: image.s3Key });

    // TODO: Delete metadata from database
    // await serviceImageRepository.delete(params.imageId);

    // STUB: Simulate deletion (mock storage service doesn't actually delete)
    console.log(`STUB: Would delete image ${params.imageId} from service ${params.id}`);

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error(`Error in DELETE /api/services/${params.id}/images/${params.imageId}:`, error);

    if (error instanceof ServiceNotFoundError) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' },
        { status: 404 }
      );
    }

    if (error instanceof ServiceImageNotFoundError) {
      return NextResponse.json(
        { error: 'Imagen no encontrada' },
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
