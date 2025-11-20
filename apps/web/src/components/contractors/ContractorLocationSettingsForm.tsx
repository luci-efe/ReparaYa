"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AddressForm } from '@/components/contractors/AddressForm';
import { ServiceZoneConfigurator } from '@/components/contractors/ServiceZoneConfigurator';
import { type AddressInput, type RadiusServiceZone } from '@/modules/contractors/validators/location';

interface LocationData {
  address: AddressInput;
  serviceZone: RadiusServiceZone;
  geocodingStatus: 'PENDING' | 'SUCCESS' | 'FAILED';
}

interface ContractorLocationSettingsFormProps {
  contractorProfileId: string;
  isAdmin: boolean;
  profileStatus: 'DRAFT' | 'ACTIVE';
}

/**
 * Client component for contractor location settings
 *
 * Features:
 * - Fetch existing location data
 * - Two-step edit wizard (address + service zone)
 * - Permission logic: DRAFT profiles OR admin can edit
 * - Warning for active profiles
 */
export function ContractorLocationSettingsForm({
  contractorProfileId,
  isAdmin,
  profileStatus
}: ContractorLocationSettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  // Location state
  const [hasLocation, setHasLocation] = useState(false);

  // Form state
  const [addressData, setAddressData] = useState<AddressInput | null>(null);
  const [serviceZoneData, setServiceZoneData] = useState<RadiusServiceZone | null>(null);
  const [currentStep, setCurrentStep] = useState<'address' | 'zone'>('address');

  // Form element references (using callback refs to access form inside component)
  const [addressFormElement, setAddressFormElement] = useState<HTMLFormElement | null>(null);
  const [zoneFormElement, setZoneFormElement] = useState<HTMLFormElement | null>(null);

  // Determine if user can edit
  const canEdit = profileStatus === 'DRAFT' || isAdmin;

  // Fetch existing location data
  useEffect(() => {
    const fetchLocation = async () => {
      setIsFetching(true);
      try {
        const locationResponse = await fetch(`/api/contractors/${contractorProfileId}/location`);

        if (locationResponse.ok) {
          const locationData = await locationResponse.json();

          // Map API response to form data
          const mappedLocation: LocationData = {
            address: {
              street: locationData.street,
              exteriorNumber: locationData.exteriorNumber,
              interiorNumber: locationData.interiorNumber || '',
              neighborhood: locationData.neighborhood || '',
              city: locationData.city,
              state: locationData.state,
              postalCode: locationData.postalCode,
              country: locationData.country,
            },
            serviceZone: {
              zoneType: 'RADIUS' as const,
              radiusKm: locationData.radiusKm || 10,
            },
            geocodingStatus: locationData.geocodingStatus || 'SUCCESS',
          };

          setAddressData(mappedLocation.address);
          setServiceZoneData(mappedLocation.serviceZone);
          setHasLocation(true);
        } else {
          // No location exists yet
          setHasLocation(false);
        }
      } catch (error) {
        console.error('Error loading location:', error);
        setApiError(error instanceof Error ? error.message : 'Error al cargar datos');
      } finally {
        setIsFetching(false);
      }
    };

    fetchLocation();
  }, [contractorProfileId]);

  // Handle address form submission
  const handleAddressSubmit = (data: AddressInput) => {
    setAddressData(data);
    setGeocodingError(null);
    setCurrentStep('zone');
  };

  // Handle service zone form submission
  const handleZoneSubmit = async (data: RadiusServiceZone) => {
    setServiceZoneData(data);

    // If we have both data pieces, submit to API
    if (addressData) {
      await saveLocation(addressData, data);
    }
  };

  // Save location
  const saveLocation = async (address: AddressInput, zone: RadiusServiceZone) => {
    setIsLoading(true);
    setApiError(null);
    setGeocodingError(null);

    try {
      const method = hasLocation ? 'PATCH' : 'POST';
      const response = await fetch(`/api/contractors/${contractorProfileId}/location`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          serviceZone: zone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If geocoding error, show warning but save
        if (response.status === 500 && data.geocodingStatus === 'FAILED') {
          setGeocodingError(data.message || 'No pudimos validar la dirección automáticamente');
          // Location saved, redirect
          router.push('/contractors/dashboard');
          return;
        }

        throw new Error(data.error || 'Error al guardar la ubicación');
      }

      // Success
      setApiError(null);
      router.push('/contractors/dashboard');
    } catch (error) {
      console.error('Error saving location:', error);
      setApiError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to previous step
  const handleBack = () => {
    setCurrentStep('address');
  };

  // Loading state
  if (isFetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <svg
          className="animate-spin h-12 w-12 text-blue-600"
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
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p className="mt-4 text-gray-600">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {hasLocation ? 'Editar Ubicación y Zona de Servicio' : 'Configurar Ubicación y Zona de Servicio'}
          </h1>
          <p className="mt-2 text-gray-600">
            Actualiza tu dirección de operaciones y área de cobertura
          </p>
        </div>

        {/* Warning if profile is ACTIVE and not admin */}
        {profileStatus === 'ACTIVE' && !canEdit && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4" role="alert">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-yellow-400 mt-0.5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Tu perfil está activo
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Los cambios de ubicación en perfiles activos requieren revisión de un administrador.
                  Contacta con soporte para actualizar tu ubicación.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Admin override notice */}
        {isAdmin && profileStatus === 'ACTIVE' && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4" role="alert">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-blue-400 mt-0.5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Modo Administrador
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  Estás editando la ubicación de un perfil activo con privilegios de administrador.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className={`h-2 w-12 rounded-full ${currentStep === 'address' || currentStep === 'zone' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
          <div className={`h-2 w-12 rounded-full ${currentStep === 'zone' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
        </div>

        {/* Current step label */}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">
            {currentStep === 'address' ? 'Paso 1 de 2: Dirección' : 'Paso 2 de 2: Zona de servicio'}
          </p>
        </div>

        {/* API Error */}
        {apiError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4" role="alert">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-red-400 mt-0.5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-800">{apiError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Geocoding Warning */}
        {geocodingError && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4" role="alert">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-yellow-400 mt-0.5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Advertencia
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  {geocodingError}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Address Form */}
        {currentStep === 'address' && (
          <div className="space-y-6">
            <div ref={(el) => {
              // Find the form element inside the div
              const form = el?.querySelector('form');
              if (form) setAddressFormElement(form);
            }}>
              <AddressForm
                defaultValues={addressData || undefined}
                onSubmit={handleAddressSubmit}
                isLoading={isLoading}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => {
                  if (addressFormElement) addressFormElement.requestSubmit();
                }}
                disabled={isLoading || !canEdit}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Service Zone Configuration */}
        {currentStep === 'zone' && (
          <div className="space-y-6">
            <div ref={(el) => {
              // Find the form element inside the div
              const form = el?.querySelector('form');
              if (form) setZoneFormElement(form);
            }}>
              <ServiceZoneConfigurator
                defaultValues={serviceZoneData || undefined}
                onSubmit={handleZoneSubmit}
                isLoading={isLoading}
              />
            </div>

            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleBack}
                disabled={isLoading}
              >
                Atrás
              </Button>

              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => {
                  if (zoneFormElement) zoneFormElement.requestSubmit();
                }}
                isLoading={isLoading}
                disabled={!canEdit}
              >
                Guardar Cambios
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
