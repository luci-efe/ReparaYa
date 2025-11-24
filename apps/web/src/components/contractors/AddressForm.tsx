"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { addressSchema, type AddressInput } from '@/modules/contractors/validators/location';

interface AddressFormProps {
  defaultValues?: Partial<AddressInput>;
  onSubmit: (data: AddressInput) => void;
  isLoading?: boolean;
  error?: string;
}

/**
 * Formulario para capturar dirección normalizada de contratista
 *
 * Características:
 * - Validación client-side con Zod
 * - Accesibilidad WCAG 2.1 AA
 * - Mensajes de error en español
 * - Estados de carga durante geocodificación
 */
export function AddressForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  error
}: AddressFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: defaultValues || {
      country: 'MX',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Dirección de Base de Operaciones
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Esta será la dirección desde donde ofreces tus servicios. Se utilizará para calcular distancias y mostrar tu cobertura a los clientes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Calle */}
          <div className="md:col-span-2">
            <Input
              {...register('street')}
              label="Calle"
              placeholder="Av. Insurgentes Sur"
              error={errors.street?.message}
              required
              disabled={isLoading}
              autoComplete="address-line1"
            />
          </div>

          {/* Número Exterior */}
          <div>
            <Input
              {...register('exteriorNumber')}
              label="Número Exterior"
              placeholder="123"
              error={errors.exteriorNumber?.message}
              required
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          {/* Número Interior */}
          <div>
            <Input
              {...register('interiorNumber')}
              label="Número Interior"
              placeholder="Depto. 4B (opcional)"
              error={errors.interiorNumber?.message}
              disabled={isLoading}
              autoComplete="off"
            />
          </div>

          {/* Colonia */}
          <div>
            <Input
              {...register('neighborhood')}
              label="Colonia"
              placeholder="Del Valle (opcional)"
              error={errors.neighborhood?.message}
              disabled={isLoading}
              autoComplete="address-level3"
            />
          </div>

          {/* Código Postal */}
          <div>
            <Input
              {...register('postalCode')}
              label="Código Postal"
              placeholder="03100"
              error={errors.postalCode?.message}
              required
              disabled={isLoading}
              autoComplete="postal-code"
              maxLength={5}
              inputMode="numeric"
            />
          </div>

          {/* Ciudad */}
          <div>
            <Input
              {...register('city')}
              label="Ciudad"
              placeholder="Ciudad de México"
              error={errors.city?.message}
              required
              disabled={isLoading}
              autoComplete="address-level2"
            />
          </div>

          {/* Estado */}
          <div>
            <Input
              {...register('state')}
              label="Estado"
              placeholder="CDMX"
              error={errors.state?.message}
              required
              disabled={isLoading}
              autoComplete="address-level1"
            />
          </div>

          {/* País */}
          <div className="md:col-span-2">
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              País <span className="text-red-500">*</span>
            </label>
            <select
              {...register('country')}
              id="country"
              disabled={isLoading}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              aria-invalid={!!errors.country}
              aria-describedby={errors.country ? 'country-error' : undefined}
            >
              <option value="MX">México</option>
              <option value="US">Estados Unidos</option>
              <option value="CO">Colombia</option>
              <option value="PE">Perú</option>
              <option value="AR">Argentina</option>
            </select>
            {errors.country && (
              <p id="country-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.country.message}
              </p>
            )}
          </div>
        </div>

        {/* Error de geocodificación */}
        {error && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg" role="alert">
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
                  No pudimos validar la dirección automáticamente
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  {error}. Verifica que los datos sean correctos. Puedes continuar, pero es posible que necesites actualizar la ubicación más tarde.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Indicador de geocodificación en progreso */}
        {isLoading && (
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <svg
              className="animate-spin h-5 w-5 mr-2 text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
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
            Validando dirección...
          </div>
        )}
      </div>
    </form>
  );
}
