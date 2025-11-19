"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui';
import type { ContractorProfileDTO } from '@/modules/contractors/types';

export default function AdminContractorsPage() {
  const router = useRouter();
  const [profiles] = useState<ContractorProfileDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('pending');

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      setApiError(null);

      try {
        // TODO: Cuando exista el endpoint, usar /api/admin/contractors
        // Por ahora, simulamos con mensaje de "próximamente"
        setApiError('El listado de contratistas para admin estará disponible próximamente. Por ahora, puedes verificar contratistas directamente desde /admin/contractors/:id');
      } catch (error) {
        console.error('Error al cargar perfiles:', error);
        setApiError(error instanceof Error ? error.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [filter]);

  const filteredProfiles = profiles.filter((profile) => {
    if (filter === 'pending') return !profile.verified;
    if (filter === 'verified') return profile.verified;
    return true;
  });

  const pendingCount = profiles.filter((p) => !p.verified).length;
  const verifiedCount = profiles.filter((p) => p.verified).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Contratistas
          </h1>
          <p className="mt-2 text-gray-600">
            Verifica y administra perfiles de contratistas
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{profiles.length}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="mt-2 text-3xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">Verificados</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{verifiedCount}</p>
            </div>
          </Card>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Todos ({profiles.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Pendientes ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('verified')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'verified'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            Verificados ({verifiedCount})
          </button>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm text-yellow-800">{apiError}</p>
          </div>
        )}

        {/* Lista de Perfiles */}
        {filteredProfiles.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600">No hay perfiles {filter === 'pending' ? 'pendientes' : filter === 'verified' ? 'verificados' : ''} en este momento</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => router.push(`/admin/contractors/${profile.id}`)}
              >
                <Card hover clickable>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {profile.businessName}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {profile.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {profile.specialties.map((specialty) => (
                          <span
                            key={specialty}
                            className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="ml-6">
                      {profile.verified ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
                          ✓ Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800">
                          ⏱ Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
