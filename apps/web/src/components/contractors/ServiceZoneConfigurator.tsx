"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { radiusServiceZoneSchema, type RadiusServiceZone } from '@/modules/contractors/validators/location';

interface ServiceZoneConfiguratorProps {
  defaultValues?: RadiusServiceZone;
  onSubmit: (data: RadiusServiceZone) => void;
  isLoading?: boolean;
}

/**
 * Configurador de zona de servicio para contratistas
 *
 * MVP: Solo tipo RADIUS (1-100 km)
 * Futuro: Tipo POLYGON con mapa interactivo
 *
 * Características:
 * - Slider sincronizado con input numérico
 * - Validación con Zod
 * - Feedback visual de cobertura
 * - Accesibilidad (labels, ARIA)
 */
export function ServiceZoneConfigurator({
  defaultValues,
  onSubmit,
  isLoading = false,
}: ServiceZoneConfiguratorProps) {
  const [zoneType] = useState<'RADIUS' | 'POLYGON'>('RADIUS');
  const [sliderValue, setSliderValue] = useState(defaultValues?.radiusKm || 10);

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RadiusServiceZone>({
    resolver: zodResolver(radiusServiceZoneSchema),
    defaultValues: defaultValues || {
      zoneType: 'RADIUS',
      radiusKm: 10,
    },
  });

  // Sincronizar slider con input numérico
  useEffect(() => {
    setValue('radiusKm', sliderValue);
  }, [sliderValue, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Zona de Servicio
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Define el área geográfica donde ofreces tus servicios. Los clientes fuera de esta zona no podrán solicitar tus servicios.
        </p>

        {/* Selector de tipo de zona */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de Zona
          </label>
          <div className="space-y-3">
            {/* Radio */}
            <div className="flex items-center">
              <input
                type="radio"
                id="zone-radius"
                checked={zoneType === 'RADIUS'}
                disabled
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                aria-label="Zona tipo radio"
              />
              <label htmlFor="zone-radius" className="ml-3 flex items-center">
                <span className="text-sm font-medium text-gray-900">Radio de cobertura</span>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Activo
                </span>
              </label>
            </div>

            {/* Polygon - Disabled */}
            <div className="flex items-center">
              <input
                type="radio"
                id="zone-polygon"
                checked={zoneType === 'POLYGON'}
                disabled
                className="h-4 w-4 text-gray-300 border-gray-300 cursor-not-allowed"
                aria-label="Zona tipo polígono (disponible próximamente)"
              />
              <label htmlFor="zone-polygon" className="ml-3 flex items-center cursor-not-allowed">
                <span className="text-sm font-medium text-gray-400">Polígono personalizado</span>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                  Próximamente
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Configurador de Radio */}
        {zoneType === 'RADIUS' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="radius-slider" className="block text-sm font-medium text-gray-700 mb-2">
                Radio de cobertura (kilómetros)
              </label>
              <p className="text-sm text-gray-500 mb-4">
                Define qué tan lejos de tu ubicación base estás dispuesto a ofrecer servicios.
              </p>

              {/* Slider */}
              <Controller
                name="radiusKm"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    id="radius-slider"
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={sliderValue}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      setSliderValue(value);
                      field.onChange(value);
                    }}
                    disabled={isLoading}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 accent-blue-600"
                    aria-valuemin={1}
                    aria-valuemax={100}
                    aria-valuenow={sliderValue}
                    aria-label={`Radio de cobertura: ${sliderValue} kilómetros`}
                  />
                )}
              />

              {/* Marcadores de referencia */}
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1 km</span>
                <span>50 km</span>
                <span>100 km</span>
              </div>
            </div>

            {/* Input numérico sincronizado */}
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <Controller
                  name="radiusKm"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      label="Radio (km)"
                      min={1}
                      max={100}
                      step={1}
                      value={sliderValue}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        const clampedValue = Math.min(Math.max(value, 1), 100);
                        setSliderValue(clampedValue);
                        field.onChange(clampedValue);
                      }}
                      error={errors.radiusKm?.message}
                      disabled={isLoading}
                      inputMode="numeric"
                    />
                  )}
                />
              </div>

              {/* Visualización de cobertura */}
              <div className="pb-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-blue-900">
                    Cobertura: <span className="text-lg">{sliderValue}</span> km
                  </p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    Aproximadamente {Math.round(Math.PI * sliderValue * sliderValue)} km²
                  </p>
                </div>
              </div>
            </div>

            {/* Feedback visual */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg
                  className="h-5 w-5 text-gray-400 mt-0.5"
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
                  <p className="text-sm text-gray-700">
                    <strong>Tu zona de servicio cubre un radio de {sliderValue} km</strong> desde tu ubicación base.
                    Los clientes dentro de esta área podrán solicitar tus servicios.
                  </p>
                  {sliderValue < 5 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Considera ampliar tu radio para recibir más solicitudes.
                    </p>
                  )}
                  {sliderValue > 50 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      Un radio muy amplio puede afectar tus tiempos de desplazamiento.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje para tipo POLYGON (futuro) */}
        {zoneType === 'POLYGON' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <p className="mt-4 text-sm font-medium text-gray-900">
              Zonas personalizadas con polígonos
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Esta funcionalidad estará disponible próximamente. Podrás dibujar tu zona de servicio en un mapa interactivo.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
