import { NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import {
  imageUploadService,
  UnauthorizedResourceAccessError,
  S3ObjectNotFoundError,
} from '@/modules/services';
import { imageUploadConfirmSchema } from '@/modules/services/validators';
import { ZodError } from 'zod';

/**
 * POST /api/services/:id/images/confirm
 * Confirm that an image was successfully uploaded to S3
 *
 * Requires CONTRACTOR role and service ownership
 *
 * This endpoint is called after the client successfully uploads
 * the image to S3 using the presigned URL.
 *
 * Body: ImageUploadConfirmDTO
 * {
 *   s3Url: string;
 *   s3Key: string;
 *   width: number;
 *   height: number;
 *   altText?: string;
 * }
 *
 * Returns: ServiceImageDTO
 */
export async function POST(
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

    // Validate request body with Zod
    const validatedData = imageUploadConfirmSchema.parse(body);

    const savedImage = await imageUploadService.confirmImageUpload(
      params.id,
      user.id,
      validatedData
    );

    return NextResponse.json(savedImage, { status: 201 });
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

    if (error instanceof UnauthorizedResourceAccessError) {
      return NextResponse.json(
        { error: 'No tienes permiso para confirmar imágenes de este servicio' },
        { status: 403 }
      );
    }

    if (error instanceof S3ObjectNotFoundError) {
      return NextResponse.json(
        { error: 'La imagen no se encontró en S3. Asegúrate de haberla subido correctamente.' },
        { status: 404 }
      );
    }

    console.error('Error en POST /api/services/:id/images/confirm:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
