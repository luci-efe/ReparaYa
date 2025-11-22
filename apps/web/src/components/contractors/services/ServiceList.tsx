"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ServiceDTO } from '@/modules/services/types';
import type { ServiceVisibilityStatus } from '@prisma/client';

interface ServiceListProps {
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
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  ARCHIVED: 'bg-red-100 text-red-800',
};

export function ServiceList({ contractorId: _contractorId, profileVerified }: ServiceListProps) {
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ServiceVisibilityStatus | 'ALL'>('ALL');
  const [_actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (filter !== 'ALL') {
        queryParams.append('status', filter);
      }

      const response = await fetch(`/api/services/me?${queryParams.toString()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error al cargar servicios');
      }

      const data = await response.json();

      // Filter out ARCHIVED services when showing ALL
      const filteredData = filter === 'ALL'
        ? data.filter((s: ServiceDTO) => s.visibilityStatus !== 'ARCHIVED')
        : data;

      setServices(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch services
  useEffect(() => {
    fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const _handlePublish = async (serviceId: string) => {
    if (!profileVerified) {
      alert('Debes verificar tu perfil antes de publicar servicios');
      return;
    }

    try {
      setActionLoading(serviceId);
      const response = await fetch(`/api/services/${serviceId}/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al publicar servicio');
      }

      // Refresh services list
      await fetchServices();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al publicar servicio');
    } finally {
      setActionLoading(null);
    }
  };

  const _handlePause = async (serviceId: string) => {
    try {
      setActionLoading(serviceId);
      const response = await fetch(`/api/services/${serviceId}/pause`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al pausar servicio');
      }

      // Refresh services list
      await fetchServices();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al pausar servicio');
    } finally {
      setActionLoading(null);
    }
  };

  const _handleDelete = async (serviceId: string, title: string) => {
    if (!confirm(`¿Estás seguro de eliminar el servicio "${title}"?`)) {
      return;
    }

    try {
      setActionLoading(serviceId);
      const response = await fetch(`/api/services/${serviceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar servicio');
      }

      // Refresh services list
      await fetchServices();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar servicio');
    } finally {
      setActionLoading(null);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchServices}>Reintentar</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {(['ALL', 'DRAFT', 'ACTIVE', 'PAUSED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
            >
              {status === 'ALL' ? 'Todos' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <Link href="/contractors/services/new">
          <Button variant="primary">
            Crear Nuevo Servicio
          </Button>
        </Link>
      </div>

      {/* Verification Warning */}
      {!profileVerified && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Perfil no verificado</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Debes verificar tu perfil antes de poder publicar servicios. Los servicios en borrador pueden ser creados y editados.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Services List */}
      {services.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No hay servicios</h3>
            <p className="mt-2 text-sm text-gray-500">
              {filter === 'ALL'
                ? 'Comienza creando tu primer servicio'
                : `No hay servicios con estado "${STATUS_LABELS[filter]}"`
              }
            </p>
            {filter === 'ALL' && (
              <Link href="/contractors/services/new">
                <Button variant="primary" className="mt-4">
                  Crear Primer Servicio
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <Card key={service.id} hover className="flex flex-col h-full">
              <div className="flex flex-col h-full">
                {/* Service Header */}
                <div className="mb-3">
                  <div className="flex items-start justify-between mb-2">
                    <Link href={`/contractors/services/${service.id}`} className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2">
                        {service.title}
                      </h3>
                    </Link>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[service.visibilityStatus]}`}>
                    {STATUS_LABELS[service.visibilityStatus]}
                  </span>
                </div>

                {/* Category */}
                <div className="mb-2">
                  <span className="text-sm text-gray-600">
                    {service.category?.name || 'Sin categoría'}
                  </span>
                </div>

                {/* Price and Duration */}
                <div className="mb-3 flex items-center gap-4">
                  <div className="flex items-center gap-1 text-lg font-semibold text-gray-900">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>${service.basePrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{Math.floor(service.durationMinutes / 60)}h {service.durationMinutes % 60}m</span>
                  </div>
                </div>

                {/* Images count */}
                {service.images && service.images.length > 0 && (
                  <div className="mb-3 flex items-center gap-1 text-sm text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{service.images.length} {service.images.length === 1 ? 'imagen' : 'imágenes'}</span>
                  </div>
                )}

                {/* Spacer to push actions to bottom */}
                <div className="flex-grow"></div>

                {/* Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-2">
                  <Link href={`/contractors/services/${service.id}/edit`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full">
                      Editar
                    </Button>
                  </Link>
                  <Link href={`/contractors/services/${service.id}`} className="w-full">
                    <Button variant="secondary" size="sm" className="w-full">
                      Ver Detalles
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
