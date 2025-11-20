import { requireRole } from '@/modules/auth/utils/requireRole';
import { contractorProfileService } from '@/modules/contractors';
import { DashboardShell } from '@/components/contractors/DashboardShell';
import { ContractorProfileNotFoundError } from '@/modules/contractors/errors';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui';

/**
 * Contractor Settings Page (Server Component)
 *
 * Página principal de configuración del contratista.
 * Muestra todas las opciones de configuración disponibles.
 */
export default async function ContractorSettingsPage() {
  // Verificar autenticación y rol
  const user = await requireRole('CONTRACTOR');

  // Obtener perfil de contratista
  let profile;
  try {
    profile = await contractorProfileService.getProfileByUserId(user.id);
  } catch (error) {
    if (error instanceof ContractorProfileNotFoundError) {
      redirect('/onboarding/contractor-profile');
    }
    throw error;
  }

  const userName = user.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user.email;

  return (
    <DashboardShell
      user={{
        id: user.id,
        name: userName,
        email: user.email,
        imageUrl: user.avatarUrl || undefined,
      }}
      _profile={{
        verified: profile.verified,
        businessName: profile.businessName || 'Mi Negocio',
      }}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="mt-2 text-sm text-gray-600">
            Administra tu perfil, ubicación y preferencias de tu cuenta.
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ubicación y Zona de Servicio */}
          <Link
            href="/contractors/settings/location"
            className="group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-xl"
          >
            <Card hover clickable className="h-full">
              <div className="flex items-start gap-4">
                <div className="bg-blue-50 text-blue-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    Ubicación y Zona de Servicio
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Configura tu dirección base y el área donde ofreces tus servicios.
                  </p>
                  <div className="flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                    <span>Configurar</span>
                    <svg
                      className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Perfil de Negocio */}
          <Link
            href="/contractors/profile"
            className="group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-xl"
          >
            <Card hover clickable className="h-full">
              <div className="flex items-start gap-4">
                <div className="bg-purple-50 text-purple-600 p-3 rounded-lg group-hover:scale-110 transition-transform">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                    Perfil de Negocio
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Edita la información de tu negocio, servicios y descripción.
                  </p>
                  <div className="flex items-center text-sm font-medium text-purple-600 group-hover:text-purple-700">
                    <span>Editar</span>
                    <svg
                      className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          {/* Notificaciones (Futuro) */}
          <div className="opacity-50 cursor-not-allowed">
            <Card className="h-full">
              <div className="flex items-start gap-4">
                <div className="bg-gray-100 text-gray-400 p-3 rounded-lg">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Notificaciones
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Administra cómo recibes notificaciones de reservas y mensajes.
                  </p>
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    Próximamente
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Pagos y Facturación (Futuro) */}
          <div className="opacity-50 cursor-not-allowed">
            <Card className="h-full">
              <div className="flex items-start gap-4">
                <div className="bg-gray-100 text-gray-400 p-3 rounded-lg">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Pagos y Facturación
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Administra tus métodos de pago y consulta tu historial de pagos.
                  </p>
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    Próximamente
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Account Actions */}
        <div className="pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cuenta</h2>
          <div className="space-y-3">
            <button
              type="button"
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Cambiar contraseña
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
