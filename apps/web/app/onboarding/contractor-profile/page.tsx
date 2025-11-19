"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Textarea, Checkbox } from '@/components/ui';
import { createContractorProfileSchema, type CreateContractorProfileInput } from '@/modules/contractors/validators';

// Especialidades disponibles
const SPECIALTIES = [
  { value: 'plomeria', label: 'Plomería' },
  { value: 'electricidad', label: 'Electricidad' },
  { value: 'carpinteria', label: 'Carpintería' },
  { value: 'pintura', label: 'Pintura' },
  { value: 'jardineria', label: 'Jardinería' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'albanileria', label: 'Albañilería' },
  { value: 'herreria', label: 'Herrería' },
  { value: 'climatizacion', label: 'Climatización' },
  { value: 'otros', label: 'Otros' },
];

export default function ContractorProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateContractorProfileInput>({
    resolver: zodResolver(createContractorProfileSchema),
    defaultValues: {
      businessName: '',
      description: '',
      specialties: [],
    },
  });

  const selectedSpecialties = watch('specialties');
  const descriptionLength = watch('description')?.length || 0;

  const onSubmit = async (data: CreateContractorProfileInput) => {
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/contractors/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear el perfil de contratista');
      }

      // Limpiar flag de omisión y redirect a dashboard
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('onboarding_skipped');
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Error al crear perfil de contratista:', error);
      setApiError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Completa tu perfil de contratista
        </h1>
        <p className="mt-2 text-gray-600">
          Cuéntanos sobre tu negocio para que los clientes te conozcan mejor
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Nombre del Negocio */}
        <Input
          label="Nombre del Negocio"
          type="text"
          placeholder="Ej: Plomería García"
          required
          error={errors.businessName?.message}
          {...register('businessName')}
        />

        {/* Descripción */}
        <div className="space-y-2">
          <Textarea
            label="Descripción del Negocio"
            placeholder="Describe tu negocio, experiencia y áreas de servicio. Ej: Servicio de plomería con 10 años de experiencia. Cubro Guadalajara y área metropolitana."
            rows={5}
            required
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="flex justify-end">
            <span className={`text-xs ${descriptionLength > 500 ? 'text-red-600' : 'text-gray-500'}`}>
              {descriptionLength} / 500 caracteres
            </span>
          </div>
        </div>

        {/* Especialidades */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Especialidades
            <span className="text-red-500 ml-1">*</span>
          </label>
          <p className="text-sm text-gray-600">
            Selecciona las especialidades que ofreces (mínimo 1)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            {SPECIALTIES.map((specialty) => (
              <Controller
                key={specialty.value}
                name="specialties"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label={specialty.label}
                    checked={field.value?.includes(specialty.value)}
                    onChange={(e) => {
                      const currentValue = field.value || [];
                      if (e.target.checked) {
                        field.onChange([...currentValue, specialty.value]);
                      } else {
                        field.onChange(currentValue.filter((v: string) => v !== specialty.value));
                      }
                    }}
                  />
                )}
              />
            ))}
          </div>

          {errors.specialties && (
            <p className="text-sm text-red-600" role="alert">
              {errors.specialties.message}
            </p>
          )}

          {selectedSpecialties && selectedSpecialties.length > 0 && (
            <p className="text-sm text-gray-600">
              {selectedSpecialties.length} especialidad{selectedSpecialties.length > 1 ? 'es' : ''} seleccionada{selectedSpecialties.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Información adicional */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            ℹ️ Estado de verificación
          </h3>
          <p className="text-sm text-blue-800">
            Tu perfil será revisado por nuestro equipo antes de que puedas publicar servicios.
            Este proceso puede tomar de 24 a 48 horas. Te notificaremos cuando tu perfil sea aprobado.
          </p>
        </div>

        {/* Botón de Submit */}
        <div className="pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
          >
            Completar Perfil
          </Button>
        </div>
      </form>
    </div>
  );
}
