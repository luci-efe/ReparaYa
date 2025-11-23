import { NextResponse } from 'next/server';
import { requireRole } from '@/modules/auth/utils/requireRole';
import { UnauthorizedError, ForbiddenError } from '@/modules/auth/errors';
import {
  imageUploadService,
  MaxImagesExceededError,
  ImageSizeLimitExceededError,
  InvalidMimeTypeError,
  UnauthorizedResourceAccessError,
  PresignedUrlGenerationError,
} from '@/modules/services';
import { imageUploadRequestSchema } from '@/modules/services/validators';
import { ZodError } from 'zod';

/**
 * POST /api/services/:id/images/upload-url
 * Generate a presigned URL for uploading an image to S3
 *
 * Requires CONTRACTOR role and service ownership
 *
 * Body: ImageUploadRequestDTO
 * {
 *   fileName: string;
 *   mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
 *   fileSize: number;
 * }
 *
 * Returns: ImageUploadResponseDTO
 * {
 *   presignedUrl: string;
 *   s3Key: string;
 *   expiresAt: Date;
 * }
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
    const validatedData = imageUploadRequestSchema.parse(body);

    const uploadResponse = await imageUploadService.generatePresignedUploadUrl(
      params.id,
      user.id,
      validatedData.fileName,
      validatedData.mimeType,
      validatedData.fileSize
    );

    return NextResponse.json(uploadResponse, { status: 200 });
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
        { error: 'No tienes permiso para subir imágenes a este servicio' },
        { status: 403 }
      );
    }

    if (error instanceof MaxImagesExceededError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ImageSizeLimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof InvalidMimeTypeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof PresignedUrlGenerationError) {
      console.error('Error generando URL presignada:', error);
      return NextResponse.json(
        { error: 'Error al generar URL de subida' },
        { status: 500 }
      );
    }

    console.error('Error en POST /api/services/:id/images/upload-url:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
