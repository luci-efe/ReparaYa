"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ImageUpload } from '@/components/services/ImageUpload';
import { ConfirmationDialog } from '@/components/services/ConfirmationDialog';
import type { ServiceDTO } from '@/modules/services/types';
import type { ServiceVisibilityStatus } from '@prisma/client';

interface ServiceDetailClientProps {
  service: ServiceDTO;
  contractorId: string;
  profileVerified: boolean;
}

const STATUS_LABELS: Record<ServiceVisibilityStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  PAUSED: 'Pausado',
  ARCHIVED: 'Archivado',
};

const STATUS_COLORS: Record<ServiceVisibilityStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 border-gray-300',
  ACTIVE: 'bg-green-100 text-green-800 border-green-300',
  PAUSED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  ARCHIVED: 'bg-red-100 text-red-800 border-red-300',
};

/**
 * Service Detail Client Component
 *
 * Features:
 * - Service information display
 * - Status badge
 * - Action buttons (Edit, Publish/Pause, Delete)
 * - Image gallery with upload functionality
 * - Publication checklist for DRAFT services
 * - Confirmation dialogs for destructive actions
 * - Loading states and error handling
 */
export function ServiceDetailClient({
  service: initialService,
  contractorId: _contractorId,
  profileVerified,
}: ServiceDetailClientProps) {
  const router = useRouter();
  const [service, setService] = useState<ServiceDTO>(initialService);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'publish' | 'pause' | 'delete';
    title: string;
    message: string;
  } | null>(null);
  const [showToast, setShowToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Check if service can be published
  const canPublish = (): { canPublish: boolean; reasons: string[] } => {
    const reasons: string[] = [];

    if (!profileVerified) {
      reasons.push('Perfil no verificado');
    }

    // Image check removed as per requirement
    // if (!service.images || service.images.length === 0) {
    //   reasons.push('Se requiere al menos 1 imagen');
    // }

    if (!service.title || !service.description || !service.basePrice || !service.durationMinutes) {
      reasons.push('Faltan campos requeridos');
    }

    return {
      canPublish: reasons.length === 0,
      reasons,
    };
  };

  const publicationCheck = canPublish();

  // Refresh service data
  const refreshService = async () => {
    try {
      const response = await fetch(`/api/services/${service.id}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error al refrescar servicio');
      }

      const updatedService = await response.json();
      setService(updatedService);
    } catch (error) {
      console.error('Error refreshing service:', error);
      setShowToast({
        message: 'Error al actualizar datos del servicio',
        type: 'error',
      });
    }
  };

  // Handle publish action
  const handlePublish = async () => {
    if (!publicationCheck.canPublish) {
      setShowToast({
        message: `No se puede publicar: ${publicationCheck.reasons.join(', ')}`,
        type: 'error',
      });
      return;
    }

    try {
      setActionLoading('publish');
      const response = await fetch(`/api/services/${service.id}/publish`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al publicar servicio');
      }

      setShowToast({
        message: 'Servicio publicado exitosamente',
        type: 'success',
      });

      await refreshService();
    } catch (error) {
      console.error('Error publishing service:', error);
      setShowToast({
        message: error instanceof Error ? error.message : 'Error al publicar servicio',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  // Handle pause action
  const handlePause = async () => {
    try {
      setActionLoading('pause');
      const response = await fetch(`/api/services/${service.id}/pause`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al pausar servicio');
      }

      setShowToast({
        message: 'Servicio pausado exitosamente',
        type: 'success',
      });

      await refreshService();
    } catch (error) {
      console.error('Error pausing service:', error);
      setShowToast({
        message: error instanceof Error ? error.message : 'Error al pausar servicio',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  // Handle delete action
  const handleDelete = async () => {
    try {
      setActionLoading('delete');
      const response = await fetch(`/api/services/${service.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar servicio');
      }

      setShowToast({
        message: 'Servicio eliminado exitosamente',
        type: 'success',
      });

      // Redirect to services list after 1 second
      setTimeout(() => {
        router.push('/contractors/services');
      }, 1000);
    } catch (error) {
      console.error('Error deleting service:', error);
      setShowToast({
        message: error instanceof Error ? error.message : 'Error al eliminar servicio',
        type: 'error',
      });
      setActionLoading(null);
      setConfirmDialog(null);
    }
  };

  // Execute confirmed action
  const handleConfirmAction = () => {
    if (!confirmDialog) return;

    switch (confirmDialog.action) {
      case 'publish':
        handlePublish();
        break;
      case 'pause':
        handlePause();
        break;
      case 'delete':
        handleDelete();
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600">
        <Link href="/contractors/services" className="hover:text-blue-600">
          Mis Servicios
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{service.title}</span>
      </nav>

      {/* Header Section */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{service.title}</h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${STATUS_COLORS[service.visibilityStatus]
                  }`}
              >
                {STATUS_LABELS[service.visibilityStatus]}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                <span>{service.category?.name || 'Sin categoría'}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{service.durationMinutes} minutos</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Link href={`/contractors/services/${service.id}/edit`}>
              <Button variant="outline" size="md" className="w-full sm:w-auto">
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Editar
              </Button>
            </Link>

            {service.visibilityStatus === 'DRAFT' && (
              <div className="relative group">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    if (!publicationCheck.canPublish) {
                      return; // Tooltip will show why
                    }
                    setConfirmDialog({
                      isOpen: true,
                      action: 'publish',
                      title: 'Publicar Servicio',
                      message:
                        '¿Estás seguro de que deseas publicar este servicio? Será visible para todos los clientes.',
                    });
                  }}
                  disabled={!publicationCheck.canPublish || actionLoading !== null}
                  isLoading={actionLoading === 'publish'}
                  className="w-full sm:w-auto"
                >
                  <svg
                    className="h-4 w-4 mr-2"
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
                  Publicar
                </Button>
                {!publicationCheck.canPublish && (
                  <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                    <div className="font-semibold mb-1">No se puede publicar:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {publicationCheck.reasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {service.visibilityStatus === 'ACTIVE' && (
              <Button
                variant="secondary"
                size="md"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    action: 'pause',
                    title: 'Pausar Servicio',
                    message:
                      '¿Estás seguro de que deseas pausar este servicio? Dejará de ser visible para los clientes.',
                  })
                }
                disabled={actionLoading !== null}
                isLoading={actionLoading === 'pause'}
                className="w-full sm:w-auto"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Pausar
              </Button>
            )}

            {service.visibilityStatus === 'PAUSED' && (
              <Button
                variant="primary"
                size="md"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    action: 'publish',
                    title: 'Reactivar Servicio',
                    message:
                      '¿Estás seguro de que deseas reactivar este servicio? Será visible para todos los clientes.',
                  })
                }
                disabled={actionLoading !== null}
                isLoading={actionLoading === 'publish'}
                className="w-full sm:w-auto"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Reactivar
              </Button>
            )}

            {service.visibilityStatus !== 'ARCHIVED' && (
              <Button
                variant="outline"
                size="md"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    action: 'delete',
                    title: 'Eliminar Servicio',
                    message:
                      '¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer.',
                  })
                }
                disabled={actionLoading !== null}
                isLoading={actionLoading === 'delete'}
                className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:border-red-300"
              >
                <svg
                  className="h-4 w-4 mr-2"
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
                Eliminar
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Publication Checklist (only for DRAFT) */}
      {service.visibilityStatus === 'DRAFT' && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Lista de verificación para publicar
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              {profileVerified ? (
                <svg className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <div>
                <p className={`text-sm font-medium ${profileVerified ? 'text-green-900' : 'text-gray-900'}`}>
                  Perfil verificado
                </p>
                {!profileVerified && (
                  <p className="text-xs text-gray-600 mt-1">
                    Tu perfil debe estar verificado para publicar servicios
                  </p>
                )}
              </div>
            </div>

            {/* Image check removed from required list */}
            <div className="flex items-start gap-3 opacity-50">
              <svg className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Imágenes (Opcional)
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {service.images && service.images.length > 0
                    ? `Tienes ${service.images.length} imagen(es)`
                    : 'Puedes agregar imágenes para mejorar tu servicio'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-900">
                  Todos los campos requeridos
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Título, descripción, precio y duración están completos
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Service Details */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles del servicio</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{service.description}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio base
              </label>
              <p className="text-lg font-semibold text-gray-900">
                ${service.basePrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })} {service.currency}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duración estimada
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {service.durationMinutes} minutos
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <p className="text-lg font-semibold text-gray-900">
                {service.category?.name || 'Sin categoría'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Image Gallery */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Galería de imágenes</h3>
        <ImageUpload
          serviceId={service.id}
          images={service.images || []}
          onImagesChange={refreshService}
          maxImages={5}
        />
      </Card>

      {/* Metadata */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información adicional</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Fecha de creación
            </label>
            <p className="text-gray-900">
              {new Date(service.createdAt).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Última actualización
            </label>
            <p className="text-gray-900">
              {new Date(service.updatedAt).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {service.lastPublishedAt && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Última publicación
              </label>
              <p className="text-gray-900">
                {new Date(service.lastPublishedAt).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmationDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={handleConfirmAction}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.action === 'delete' ? 'Eliminar' : 'Confirmar'}
          cancelText="Cancelar"
          variant={confirmDialog.action === 'delete' ? 'danger' : 'default'}
          isLoading={actionLoading !== null}
        />
      )}

      {/* Toast Notification */}
      {showToast && (
        <div
          className={`fixed bottom-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 animate-slide-up ${showToast.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-red-600 text-white'
            }`}
        >
          <div className="flex items-center gap-3">
            {showToast.type === 'success' ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <p className="font-medium">{showToast.message}</p>
            <button
              onClick={() => setShowToast(null)}
              className="ml-4 hover:opacity-75"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
