import { NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import {
  imageUploadService,
  ServiceImageNotFoundError,
  UnauthorizedResourceAccessError,
  S3DeleteFailedError,
} from '@/modules/services';

/**
 * DELETE /api/services/:id/images/:imageId
 * Delete an image from both S3 and database
 *
 * Requires CONTRACTOR role and service ownership
 *
 * Flow:
 * 1. Verify contractor owns the service
 * 2. Delete image from S3
 * 3. Delete image record from database
 *
 * Returns: 204 No Content
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const user = await requireRole('CONTRACTOR');

    await imageUploadService.deleteImage(params.id, params.imageId, user.id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error instanceof UnauthorizedResourceAccessError) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar imágenes de este servicio' },
        { status: 403 }
      );
    }

    // Handle image not found (wrapped in generic Error by service)
    if (error instanceof Error && error.message.includes('Image not found')) {
      return NextResponse.json(
        { error: 'Imagen no encontrada' },
        { status: 404 }
      );
    }

    if (error instanceof ServiceImageNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof S3DeleteFailedError) {
      console.error('Error eliminando imagen de S3:', error);
      return NextResponse.json(
        { error: 'Error al eliminar imagen de S3. La imagen en la base de datos no fue eliminada.' },
        { status: 500 }
      );
    }

    console.error('Error en DELETE /api/services/:id/images/:imageId:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
