"use client";

import { useOnboardingRedirect } from '@/hooks/useOnboardingRedirect';

export function DashboardContent({ userId }: { userId: string }) {
  const { isChecking } = useOnboardingRedirect();

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Verificando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Dashboard
          </h1>
          <p className="text-gray-600 mb-6">
            Bienvenido al dashboard de ReparaYa. Tu ID de usuario es:{' '}
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              {userId}
            </code>
          </p>

          <div className="border-t border-gray-200 pt-6 mt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ✅ Módulo de Usuarios - Completado
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Backend completo: servicios, repositorios, endpoints API</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>UI de onboarding: selección de rol y perfil de cliente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Validación con Zod en formularios</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>Redirects automáticos post-registro</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                <span>70 tests (56 unitarios + 14 integración)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
