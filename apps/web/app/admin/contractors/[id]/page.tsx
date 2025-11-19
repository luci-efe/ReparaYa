"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button, Card } from '@/components/ui';
import type { ContractorProfileDTO } from '@/modules/contractors/types';

export default function AdminContractorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contractorId = params.id as string;

  const [profile, setProfile] = useState<ContractorProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/contractors/${contractorId}`);

        if (!response.ok) {
          throw new Error('Error al cargar el perfil del contratista');
        }

        const data: ContractorProfileDTO = await response.json();
        setProfile(data);
      } catch (error) {
        console.error('Error al cargar perfil:', error);
        setApiError(error instanceof Error ? error.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [contractorId]);

  const handleVerify = async (verified: boolean) => {
    setIsVerifying(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/admin/contractors/${contractorId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al verificar el perfil');
      }

      const updatedProfile: ContractorProfileDTO = await response.json();
      setProfile(updatedProfile);
      setSuccessMessage(
        verified
          ? 'Perfil aprobado exitosamente'
          : 'Verificación del perfil revocada'
      );
    } catch (error) {
      console.error('Error al verificar perfil:', error);
      setApiError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <div className="text-center py-12 px-8">
            <p className="text-red-600 font-semibold mb-4">Perfil no encontrado</p>
            <Button onClick={() => router.push('/admin/contractors')}>
              Volver a la lista
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isVerified = profile.verified;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin/contractors')}
              className="text-blue-600 hover:text-blue-700 font-medium mb-2 flex items-center gap-2"
            >
              ← Volver a la lista
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Detalles del Contratista
            </h1>
          </div>
          <div>
            {isVerified ? (
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

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* API Error */}
        {apiError && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{apiError}</p>
          </div>
        )}

        {/* Información del Perfil */}
        <div className="space-y-6">
          {/* Información Básica */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Información del Negocio
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Nombre del Negocio
                </label>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {profile.businessName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600">
                  Descripción
                </label>
                <p className="mt-1 text-gray-900 whitespace-pre-line">
                  {profile.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Especialidades
                </label>
                <div className="flex flex-wrap gap-2">
                  {profile.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Información Técnica */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Información Técnica
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">ID del Perfil</span>
                <span className="text-sm text-gray-900 font-mono">{profile.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">ID del Usuario</span>
                <span className="text-sm text-gray-900 font-mono">{profile.userId}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">Estado de Verificación</span>
                <span className={`text-sm font-semibold ${isVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isVerified ? 'VERIFICADO' : 'PENDIENTE'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">Fecha de Creación</span>
                <span className="text-sm text-gray-900">
                  {new Date(profile.createdAt).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm font-medium text-gray-600">Última Actualización</span>
                <span className="text-sm text-gray-900">
                  {new Date(profile.updatedAt).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </Card>

          {/* Acciones de Verificación */}
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Acciones de Verificación
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {isVerified
                  ? 'Este perfil ya ha sido verificado. Puedes revocar la verificación si es necesario.'
                  : 'Revisa la información del contratista y aprueba o rechaza su perfil.'}
              </p>

              <div className="flex gap-3">
                {!isVerified ? (
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      onClick={() => handleVerify(true)}
                      isLoading={isVerifying}
                    >
                      ✓ Aprobar Perfil
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      fullWidth
                      onClick={() => router.push('/admin/contractors')}
                      disabled={isVerifying}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    onClick={() => handleVerify(false)}
                    isLoading={isVerifying}
                  >
                    Revocar Verificación
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
