"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import {
  createServiceSchema,
  type CreateServiceInput,
} from '@/modules/services/validators/service';
import type { ServiceCategoryDTO } from '@/modules/services/types';

interface ServiceFormProps {
  /** Existing service data for edit mode */
  defaultValues?: Partial<CreateServiceInput>;
  /** Service ID for edit mode */
  serviceId?: string;
  /** Form mode */
  mode: 'create' | 'edit';
}

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1.5 horas' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
  { value: 240, label: '4 horas' },
  { value: 300, label: '5 horas' },
  { value: 360, label: '6 horas' },
  { value: 420, label: '7 horas' },
  { value: 480, label: '8 horas' },
];

/**
 * Service creation/editing form component
 *
 * Features:
 * - React Hook Form with Zod validation
 * - Real-time validation with Spanish error messages
 * - Character counters for text fields
 * - Category dropdown with searchable/filterable options
 * - Currency-formatted price input
 * - Duration select with preset options
 * - Loading states and error handling
 * - Accessibility compliant (WCAG 2.1 AA)
 */
export function ServiceForm({ defaultValues, serviceId, mode }: ServiceFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [categories, setCategories] = useState<ServiceCategoryDTO[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateServiceInput>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: defaultValues || {
      title: '',
      description: '',
      basePrice: 0,
      durationMinutes: 60,
      categoryId: '',
    },
  });

  // Watch fields for character counters
  const titleValue = watch('title') || '';
  const descriptionValue = watch('description') || '';

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      setIsCategoriesLoading(true);
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) {
          throw new Error('Error al cargar categorías');
        }
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories:', error);
        setApiError('No se pudieron cargar las categorías. Por favor, recarga la página.');
      } finally {
        setIsCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const onSubmit = async (data: CreateServiceInput) => {
    setIsLoading(true);
    setApiError(null);
    setSuccessMessage(null);

    try {
      const url = mode === 'create' ? '/api/services' : `/api/services/${serviceId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Error al guardar el servicio');
      }

      // Success - redirect immediately
      setSuccessMessage(
        mode === 'create' ? 'Servicio creado exitosamente' : 'Servicio actualizado exitosamente'
      );

      // Redirect to service detail page
      router.push(`/contractors/services/${responseData.id}`);
    } catch (error) {
      console.error('Error saving service:', error);
      setApiError(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && serviceId) {
      router.push(`/contractors/services/${serviceId}`);
    } else {
      router.push('/contractors/dashboard');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {mode === 'create' ? 'Crear Nuevo Servicio' : 'Editar Servicio'}
          </h1>
          <p className="mt-2 text-gray-600">
            {mode === 'create'
              ? 'Completa la información para crear tu servicio. Podrás publicarlo después de agregar imágenes.'
              : 'Actualiza la información de tu servicio.'}
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4" role="alert">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-green-400 mt-0.5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

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

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Servicio
            </h2>

            <div className="space-y-6">
              {/* Category */}
              <div>
                <label
                  htmlFor="categoryId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('categoryId')}
                  id="categoryId"
                  disabled={isLoading || isCategoriesLoading}
                  className={`w-full rounded-lg border px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.categoryId
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-300 focus:border-blue-600 focus:ring-blue-100'
                  }`}
                  aria-invalid={!!errors.categoryId}
                  aria-describedby={errors.categoryId ? 'categoryId-error' : undefined}
                >
                  <option value="">
                    {isCategoriesLoading ? 'Cargando categorías...' : 'Selecciona una categoría'}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && (
                  <p id="categoryId-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>

              {/* Title */}
              <div>
                <Input
                  {...register('title')}
                  label="Título del Servicio"
                  placeholder="Ej: Reparación de tuberías residenciales"
                  error={errors.title?.message}
                  required
                  disabled={isLoading}
                  maxLength={100}
                  autoComplete="off"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {titleValue.length}/100 caracteres
                </p>
              </div>

              {/* Description */}
              <div>
                <Textarea
                  {...register('description')}
                  label="Descripción"
                  placeholder="Describe tu servicio en detalle: qué incluye, materiales, experiencia, garantías, etc."
                  error={errors.description?.message}
                  required
                  disabled={isLoading}
                  rows={6}
                  maxLength={2000}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {descriptionValue.length}/2000 caracteres (mínimo 50)
                </p>
              </div>

              {/* Base Price */}
              <div>
                <label
                  htmlFor="basePrice"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Precio Base <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 pointer-events-none">
                    $
                  </span>
                  <input
                    {...register('basePrice', {
                      valueAsNumber: true,
                    })}
                    id="basePrice"
                    type="number"
                    step="0.01"
                    min="50"
                    max="50000"
                    placeholder="500.00"
                    disabled={isLoading}
                    className={`w-full rounded-lg border pl-8 pr-14 py-2 text-gray-900 focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${
                      errors.basePrice
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-300 focus:border-blue-600 focus:ring-blue-100'
                    }`}
                    aria-invalid={!!errors.basePrice}
                    aria-describedby={errors.basePrice ? 'basePrice-error' : 'basePrice-help'}
                  />
                  <span className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 pointer-events-none">
                    MXN
                  </span>
                </div>
                {errors.basePrice ? (
                  <p id="basePrice-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.basePrice.message}
                  </p>
                ) : (
                  <p id="basePrice-help" className="mt-1 text-xs text-gray-500">
                    Precio entre $50.00 y $50,000.00 MXN
                  </p>
                )}
              </div>

              {/* Duration */}
              <div>
                <label
                  htmlFor="durationMinutes"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Duración Estimada <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('durationMinutes', {
                    valueAsNumber: true,
                  })}
                  id="durationMinutes"
                  disabled={isLoading}
                  className={`w-full rounded-lg border px-4 py-2 text-gray-900 focus:ring-2 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.durationMinutes
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                      : 'border-gray-300 focus:border-blue-600 focus:ring-blue-100'
                  }`}
                  aria-invalid={!!errors.durationMinutes}
                  aria-describedby={errors.durationMinutes ? 'durationMinutes-error' : undefined}
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.durationMinutes && (
                  <p id="durationMinutes-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.durationMinutes.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isCategoriesLoading}
            >
              {mode === 'create' ? 'Crear Servicio' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
