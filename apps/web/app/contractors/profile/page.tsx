"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Textarea, Checkbox, Card } from '@/components/ui';
import { updateContractorProfileSchema, type UpdateContractorProfileInput } from '@/modules/contractors/validators';
import type { ContractorProfileDTO } from '@/modules/contractors/types';

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

export default function ContractorProfileEditPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ContractorProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateContractorProfileInput>({
    resolver: zodResolver(updateContractorProfileSchema),
  });

  const descriptionLength = watch('description')?.length || 0;

  // Cargar perfil existente
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/contractors/profile/me');

        if (response.status === 404) {
          // Si no tiene perfil, redirigir a onboarding
          router.push('/onboarding/contractor-profile');
          return;
        }

        if (!response.ok) {
          throw new Error('Error al cargar el perfil');
        }

        const data: ContractorProfileDTO = await response.json();
        setProfile(data);

        // Inicializar formulario con datos existentes
        reset({
          businessName: data.businessName,
          description: data.description,
          specialties: data.specialties,
        });
      } catch (error) {
        console.error('Error al cargar perfil:', error);
        setApiError(error instanceof Error ? error.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [router, reset]);

  const onSubmit = async (data: UpdateContractorProfileInput) => {
    setIsSaving(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/contractors/profile/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar el perfil');
      }

      const updatedProfile: ContractorProfileDTO = await response.json();
      setProfile(updatedProfile);
      setSuccessMessage('Perfil actualizado exitosamente');

      // Resetear formulario con nuevos valores
      reset({
        businessName: updatedProfile.businessName,
        description: updatedProfile.description,
        specialties: updatedProfile.specialties,
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      setApiError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsSaving(false);
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
    return null;
  }

  const isVerified = profile.verified;
  const canEdit = !isVerified; // Solo puede editar si no está verificado (DRAFT)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Mi Perfil de Contratista
          </h1>
          <p className="mt-2 text-gray-600">
            Administra la información de tu negocio
          </p>
        </div>

        {/* Estado de Verificación */}
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Estado de Verificación
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {isVerified
                  ? 'Tu perfil ha sido aprobado. Ya puedes publicar servicios.'
                  : 'Tu perfil está en revisión. Podrás publicar servicios cuando sea aprobado.'}
              </p>
            </div>
            <div>
              {isVerified ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
                  ✓ Verificado
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800">
                  ⏱ En Revisión
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Mensaje si no puede editar */}
        {!canEdit && (
          <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-800">
              ℹ️ Tu perfil ha sido verificado. Para realizar cambios, por favor contacta a soporte.
            </p>
          </div>
        )}

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

        {/* Formulario de Edición */}
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Nombre del Negocio */}
            <Input
              label="Nombre del Negocio"
              type="text"
              placeholder="Ej: Plomería García"
              required
              disabled={!canEdit}
              error={errors.businessName?.message}
              {...register('businessName')}
            />

            {/* Descripción */}
            <div className="space-y-2">
              <Textarea
                label="Descripción del Negocio"
                placeholder="Describe tu negocio, experiencia y áreas de servicio"
                rows={5}
                required
                disabled={!canEdit}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {SPECIALTIES.map((specialty) => (
                  <Controller
                    key={specialty.value}
                    name="specialties"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        label={specialty.label}
                        disabled={!canEdit}
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
            </div>

            {/* Botones */}
            {canEdit && (
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isSaving}
                  disabled={!isDirty}
                >
                  Guardar Cambios
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => router.push('/dashboard')}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
