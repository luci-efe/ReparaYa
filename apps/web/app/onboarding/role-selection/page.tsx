"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui';
import { UserIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

export default function RoleSelectionPage() {
  const router = useRouter();
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClientRole = () => {
    router.push('/onboarding/client-profile');
  };

  const handleContractorRole = async () => {
    setIsUpdatingRole(true);
    setError(null);

    try {
      // Actualizar rol a CONTRACTOR en la BD
      const response = await fetch('/api/users/me/role', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'CONTRACTOR' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el rol');
      }

      // Redirigir a onboarding de contratista
      router.push('/onboarding/contractor-profile');
    } catch (err) {
      console.error('Error al actualizar rol:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setIsUpdatingRole(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          ¿Cómo quieres usar ReparaYa?
        </h1>
        <p className="mt-2 text-gray-600">
          Selecciona tu tipo de cuenta para continuar
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className="h-2 w-12 rounded-full bg-blue-600"></div>
        <div className="h-2 w-12 rounded-full bg-gray-200"></div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Options */}
      <div className="space-y-4">
        {/* Cliente */}
        <button
          onClick={handleClientRole}
          className="w-full text-left"
        >
          <Card hover clickable>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <UserIcon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">
                  Soy Cliente
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Busco servicios de reparación para mi hogar
                </p>
              </div>
            </div>
          </Card>
        </button>

        {/* Contratista */}
        <button
          onClick={handleContractorRole}
          className="w-full text-left"
          disabled={isUpdatingRole}
        >
          <Card hover clickable>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <WrenchScrewdriverIcon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">
                  Soy Contratista
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Ofrezco servicios de reparación y mantenimiento
                </p>
                {isUpdatingRole && (
                  <p className="mt-2 text-sm text-blue-600">
                    Configurando tu cuenta...
                  </p>
                )}
              </div>
            </div>
          </Card>
        </button>
      </div>
    </div>
  );
}
