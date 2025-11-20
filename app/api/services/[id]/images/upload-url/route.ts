/**
 * Service Image Upload URL API Route
 *
 * POST /api/services/:id/images/upload-url - Generate presigned upload URL
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { serviceService } from '@/modules/services/services/serviceService';
import { requestUploadUrlSchema } from '@/modules/services/validators/image';
import { mockStorageService } from '@/lib/aws/__mocks__/s3StorageService';
import {
  ServiceNotFoundError,
  UnauthorizedServiceActionError,
  ImageLimitExceededError,
  InvalidImageFormatError,
  ImageSizeExceededError
} from '@/modules/services/errors';

/**
 * POST /api/services/:id/images/upload-url
 * Generate presigned upload URL for service image
 *
 * NOTE: Using mock S3 service for now. Replace with real S3 service once AWS is configured.
 *
 * Auth: Required (CONTRACTOR, owner only)
 * Request Body: { fileName: string, fileType: string, fileSize: number }
 * Response: 200 OK | 400 Bad Request | 403 Forbidden | 404 Not Found | 500 Internal Server Error
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
    const validation = requestUploadUrlSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos de entrada inválidos',
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { fileName, fileType, fileSize } = validation.data;

    // Verify service exists and user is owner
    const service = await serviceService.getService(params.id, userId);
    if (service.contractorId !== userId) {
      return NextResponse.json(
        { error: 'No tienes permiso para agregar imágenes a este servicio' },
        { status: 403 }
      );
    }

    // TODO: Check image count limit (requires image repository)
    // const imageCount = await imageService.getImageCount(params.id);
    // if (imageCount >= MAX_IMAGES_PER_SERVICE) {
    //   throw new ImageLimitExceededError(params.id, MAX_IMAGES_PER_SERVICE);
    // }

    // Generate S3 key and presigned URL
    // NOTE: Using mock storage service for now
    const bucket = process.env.AWS_S3_BUCKET_MEDIA || 'reparaya-media-dev';
    const s3Key = mockStorageService.buildServiceImageKey(userId, params.id, fileName);

    const presignedUrlResponse = await mockStorageService.generatePresignedUploadUrl({
      bucket,
      key: s3Key,
      contentType: fileType,
      fileSizeBytes: fileSize,
      expirySeconds: 3600, // 1 hour
    });

    return NextResponse.json({
      uploadUrl: presignedUrlResponse.uploadUrl,
      s3Key: presignedUrlResponse.s3Key,
      expiresIn: presignedUrlResponse.expiresIn,
      s3Url: mockStorageService.buildPublicUrl(bucket, s3Key),
    });

  } catch (error) {
    console.error(`Error in POST /api/services/${params.id}/images/upload-url:`, error);

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

    if (error instanceof ImageLimitExceededError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (error instanceof InvalidImageFormatError || error instanceof ImageSizeExceededError) {
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
