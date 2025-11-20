"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { AddressForm } from '@/components/contractors/AddressForm';
import { ServiceZoneConfigurator } from '@/components/contractors/ServiceZoneConfigurator';
import { type AddressInput, type RadiusServiceZone } from '@/modules/contractors/validators/location';

interface ContractorLocationOnboardingFormProps {
  contractorProfileId: string;
}

/**
 * Client component for contractor location onboarding flow
 *
 * This component handles the two-step wizard for capturing:
 * 1. Business address
 * 2. Service zone configuration
 */
export function ContractorLocationOnboardingForm({ contractorProfileId }: ContractorLocationOnboardingFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [geocodingError, setGeocodingError] = useState<string | null>(null);

  // Form state (separated by steps)
  const [addressData, setAddressData] = useState<AddressInput | null>(null);
  const [serviceZoneData, setServiceZoneData] = useState<RadiusServiceZone | null>(null);
  const [currentStep, setCurrentStep] = useState<'address' | 'zone'>('address');

  // Form element references (using callback refs to access form inside component)
  const [addressFormElement, setAddressFormElement] = useState<HTMLFormElement | null>(null);
  const [zoneFormElement, setZoneFormElement] = useState<HTMLFormElement | null>(null);

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
      await submitLocation(addressData, data);
    }
  };

  // Submit complete location to backend
  const submitLocation = async (address: AddressInput, zone: RadiusServiceZone) => {
    setIsLoading(true);
    setApiError(null);
    setGeocodingError(null);

    try {
      // Flatten data structure to match backend schema
      const payload = {
        ...address,
        zoneType: zone.zoneType,
        radiusKm: zone.radiusKm,
      };

      const response = await fetch(`/api/contractors/${contractorProfileId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // If geocoding error, allow continuation
        if (response.status === 500 && data.geocodingStatus === 'FAILED') {
          setGeocodingError(data.message || 'No pudimos validar la dirección automáticamente');
          // Continue anyway (location saved without coordinates)
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('onboarding_skipped');
          }
          router.push('/contractors/dashboard');
          return;
        }

        throw new Error(data.error || 'Error al guardar la ubicación');
      }

      // Success - redirect to dashboard
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('onboarding_skipped');
      }
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

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Configura tu ubicación y zona de servicio
        </h1>
        <p className="mt-2 text-gray-600">
          Define dónde ofreces tus servicios para que los clientes puedan encontrarte
        </p>
      </div>

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
                // Trigger form submit
                if (addressFormElement) addressFormElement.requestSubmit();
              }}
              disabled={isLoading}
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
                // Trigger form submit
                if (zoneFormElement) zoneFormElement.requestSubmit();
              }}
              isLoading={isLoading}
            >
              Guardar y Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Additional information */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          ¿Por qué necesitamos esta información?
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Tu dirección se usa para calcular distancias a clientes potenciales</li>
          <li>Solo los administradores pueden ver tu dirección exacta</li>
          <li>Los clientes solo ven tu ciudad y estado</li>
          <li>Tu zona de servicio ayuda a los clientes a saber si puedes atenderlos</li>
        </ul>
      </div>
    </div>
  );
}
