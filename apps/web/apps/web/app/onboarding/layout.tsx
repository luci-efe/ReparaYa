import { ReactNode } from 'react';

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xl">
              R
            </div>
            <span className="text-xl font-bold text-gray-900">ReparaYa</span>
          </div>
        </div>

        {/* Contenido */}
        <div className="rounded-xl bg-white shadow-xl p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
