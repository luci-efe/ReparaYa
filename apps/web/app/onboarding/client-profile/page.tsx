"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input } from '@/components/ui';

// Schema de validación
const clientProfileSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, 'El teléfono debe tener 10 dígitos').optional().or(z.literal('')),
  addressLine1: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  city: z.string().min(2, 'La ciudad debe tener al menos 2 caracteres'),
  state: z.string().min(2, 'El estado debe tener al menos 2 caracteres'),
  postalCode: z.string().regex(/^\d{5}$/, 'El código postal debe tener 5 dígitos'),
});

type ClientProfileForm = z.infer<typeof clientProfileSchema>;

export default function ClientProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientProfileForm>({
    resolver: zodResolver(clientProfileSchema),
  });

  const onSubmit = async (data: ClientProfileForm) => {
    setIsLoading(true);
    setApiError(null);

    try {
      // 1. Actualizar teléfono si se proporcionó
      if (data.phone) {
        const phoneResponse = await fetch('/api/users/me', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: data.phone }),
        });

        if (!phoneResponse.ok) {
          throw new Error('Error al actualizar el teléfono');
        }
      }

      // 2. Crear dirección
      const addressResponse = await fetch('/api/users/me/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressLine1: data.addressLine1,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          isDefault: true,
        }),
      });

      if (!addressResponse.ok) {
        const errorData = await addressResponse.json();
        throw new Error(errorData.error || 'Error al crear la dirección');
      }

      // 3. Limpiar flag de omisión y redirect a dashboard
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('onboarding_skipped');
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Error al completar perfil:', error);
      setApiError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Marcar que el usuario omitió el onboarding para evitar redirects
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('onboarding_skipped', 'true');
    }
    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Completa tu perfil
        </h1>
        <p className="mt-2 text-gray-600">
          Necesitamos algunos datos para brindarte el mejor servicio
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className="h-2 w-12 rounded-full bg-blue-600"></div>
        <div className="h-2 w-12 rounded-full bg-blue-600"></div>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{apiError}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Teléfono */}
        <Input
          label="Teléfono"
          type="tel"
          placeholder="3312345678"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div className="border-t border-gray-200 my-4"></div>

        {/* Dirección */}
        <Input
          label="Dirección"
          type="text"
          placeholder="Av. Chapultepec 123"
          required
          error={errors.addressLine1?.message}
          {...register('addressLine1')}
        />

        {/* Ciudad y Código Postal */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ciudad"
            type="text"
            placeholder="Guadalajara"
            required
            error={errors.city?.message}
            {...register('city')}
          />
          <Input
            label="Código Postal"
            type="text"
            placeholder="44100"
            required
            error={errors.postalCode?.message}
            {...register('postalCode')}
          />
        </div>

        {/* Estado */}
        <Input
          label="Estado"
          type="text"
          placeholder="Jalisco"
          required
          error={errors.state?.message}
          {...register('state')}
        />

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
          >
            Completar Perfil
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleSkip}
            disabled={isLoading}
          >
            Omitir por ahora
          </Button>
        </div>
      </form>
    </div>
  );
}
