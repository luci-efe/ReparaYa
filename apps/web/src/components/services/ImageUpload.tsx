"use client";

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmationDialog } from './ConfirmationDialog';
import type { ServiceImageDTO } from '@/modules/services/types';

interface ImageUploadProps {
  serviceId: string;
  images: ServiceImageDTO[];
  onImagesChange: () => void;
  maxImages?: number;
}

interface UploadingImage {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'validating' | 'uploading' | 'confirming' | 'success' | 'error';
  error?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Image Upload Component
 *
 * Features:
 * - Drag-and-drop zone with visual feedback
 * - File picker button
 * - Preview thumbnails with loading states
 * - Progress bar for each upload
 * - Delete button with confirmation
 * - Client-side validation (size, type)
 * - S3 presigned URL upload flow
 * - Max 5 images enforcement
 * - Accessible (keyboard navigation, ARIA labels)
 *
 * Upload Flow:
 * 1. User selects/drops image
 * 2. Validate size (max 10MB) and type (jpeg/png/webp)
 * 3. Show preview with loading spinner
 * 4. POST to /api/services/:id/images/upload-url
 * 5. Upload to S3 using presigned URL
 * 6. POST to /api/services/:id/images/confirm
 * 7. Show success, refresh images
 */
export function ImageUpload({
  serviceId,
  images,
  onImagesChange,
  maxImages = 5,
}: ImageUploadProps) {
  const [uploadingImages, setUploadingImages] = useState<UploadingImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; imageId: string; imageUrl: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUploadMore = images.length + uploadingImages.length < maxImages;

  // Validate file before upload
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Tipo de archivo no permitido. Solo se permiten: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `El archivo es demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }

    return null;
  };

  // Get image dimensions from file
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Error al cargar la imagen'));
      };

      img.src = objectUrl;
    });
  };

  // Upload a single file
  const uploadFile = async (file: File) => {
    // Validate
    const error = validateFile(file);
    if (error) {
      alert(error);
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    const uploadId = `${Date.now()}-${Math.random()}`;

    const newUpload: UploadingImage = {
      id: uploadId,
      file,
      preview,
      progress: 0,
      status: 'validating',
    };

    setUploadingImages((prev) => [...prev, newUpload]);

    try {
      // Get image dimensions
      const dimensions = await getImageDimensions(file);

      // Update status
      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === uploadId ? { ...img, status: 'uploading', progress: 10 } : img
        )
      );

      // Step 1: Get presigned URL
      const uploadUrlResponse = await fetch(`/api/services/${serviceId}/images/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        }),
      });

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json();
        throw new Error(errorData.error || 'Error al obtener URL de subida');
      }

      const { presignedUrl, s3Key, s3Url } = await uploadUrlResponse.json();

      // Update progress
      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === uploadId ? { ...img, progress: 30 } : img
        )
      );

      // Step 2: Upload to S3
      const s3Response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!s3Response.ok) {
        throw new Error('Error al subir imagen a S3');
      }

      // Update progress
      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === uploadId ? { ...img, status: 'confirming', progress: 70 } : img
        )
      );

      // Step 3: Confirm upload
      const confirmResponse = await fetch(`/api/services/${serviceId}/images/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          s3Url,
          s3Key,
          width: dimensions.width,
          height: dimensions.height,
          altText: file.name,
        }),
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.error || 'Error al confirmar subida');
      }

      // Success!
      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === uploadId ? { ...img, status: 'success', progress: 100 } : img
        )
      );

      // Remove from uploading list after 1 second
      setTimeout(() => {
        setUploadingImages((prev) => prev.filter((img) => img.id !== uploadId));
        URL.revokeObjectURL(preview);
        // Refresh images
        onImagesChange();
      }, 1000);
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadingImages((prev) =>
        prev.map((img) =>
          img.id === uploadId
            ? {
                ...img,
                status: 'error',
                error: error instanceof Error ? error.message : 'Error desconocido',
              }
            : img
        )
      );
    }
  };

  // Handle file selection
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length + images.length + uploadingImages.length > maxImages) {
      alert(`Solo puedes subir un máximo de ${maxImages} imágenes`);
      return;
    }

    files.forEach((file) => uploadFile(file));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag events
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!canUploadMore) {
      alert(`Solo puedes tener un máximo de ${maxImages} imágenes`);
      return;
    }

    const files = Array.from(e.dataTransfer.files);

    if (files.length + images.length + uploadingImages.length > maxImages) {
      alert(`Solo puedes subir un máximo de ${maxImages} imágenes`);
      return;
    }

    files.forEach((file) => uploadFile(file));
  };

  // Handle image deletion
  const handleDeleteImage = async () => {
    if (!deleteConfirm) return;

    setDeleteLoading(true);

    try {
      const response = await fetch(
        `/api/services/${serviceId}/images/${deleteConfirm.imageId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar imagen');
      }

      // Success - refresh images
      onImagesChange();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting image:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar imagen');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Retry failed upload
  const retryUpload = (uploadId: string) => {
    const upload = uploadingImages.find((img) => img.id === uploadId);
    if (upload) {
      setUploadingImages((prev) => prev.filter((img) => img.id !== uploadId));
      uploadFile(upload.file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {canUploadMore && (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(',')}
            multiple
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Seleccionar imágenes"
          />

          <div className="flex flex-col items-center gap-3">
            <svg
              className={`h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>

            <div>
              <p className="text-sm text-gray-700 font-medium mb-1">
                {isDragging
                  ? 'Suelta las imágenes aquí'
                  : 'Arrastra imágenes aquí o haz clic para seleccionar'}
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG o WEBP • Máximo {MAX_FILE_SIZE / 1024 / 1024}MB por imagen
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {images.length + uploadingImages.length} / {maxImages} imágenes
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Seleccionar Archivos
            </Button>
          </div>
        </div>
      )}

      {!canUploadMore && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-sm text-yellow-800">
            Has alcanzado el límite de {maxImages} imágenes. Elimina una imagen para subir otra.
          </p>
        </div>
      )}

      {/* Uploading Images */}
      {uploadingImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {uploadingImages.map((upload) => (
            <div
              key={upload.id}
              className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100"
            >
              <img
                src={upload.preview}
                alt="Subiendo..."
                className={`w-full h-full object-cover ${
                  upload.status === 'error' ? 'opacity-50' : 'opacity-70'
                }`}
              />

              {/* Progress Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-40 text-white">
                {upload.status === 'error' ? (
                  <>
                    <svg
                      className="h-8 w-8 text-red-400 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <p className="text-xs text-center px-2 mb-2">{upload.error}</p>
                    <button
                      onClick={() => retryUpload(upload.id)}
                      className="text-xs bg-white text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Reintentar
                    </button>
                  </>
                ) : upload.status === 'success' ? (
                  <svg
                    className="h-12 w-12 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <>
                    <svg
                      className="animate-spin h-8 w-8 mb-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <p className="text-xs font-medium">{upload.progress}%</p>
                    <p className="text-xs opacity-80 mt-1">
                      {upload.status === 'validating' && 'Validando...'}
                      {upload.status === 'uploading' && 'Subiendo...'}
                      {upload.status === 'confirming' && 'Finalizando...'}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Images */}
      {images.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            Imágenes del servicio ({images.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 group"
              >
                <img
                  src={image.s3Url}
                  alt={image.altText || `Imagen ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Order badge */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                  #{image.order + 1}
                </div>

                {/* Delete button */}
                <button
                  onClick={() =>
                    setDeleteConfirm({
                      isOpen: true,
                      imageId: image.id,
                      imageUrl: image.s3Url,
                    })
                  }
                  className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  aria-label={`Eliminar imagen ${index + 1}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmationDialog
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteImage}
          title="Eliminar Imagen"
          message="¿Estás seguro de que deseas eliminar esta imagen? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="danger"
          isLoading={deleteLoading}
        />
      )}
    </div>
  );
}
