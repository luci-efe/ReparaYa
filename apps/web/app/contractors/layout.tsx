import type { ReactNode } from 'react';

/**
 * Layout compartido para todas las páginas de contratistas
 *
 * Propósito:
 * - Envolver todas las rutas bajo /contractors/* con un layout consistente
 * - Permite que componentes como sidebars persistan entre navegaciones
 * - Proporciona estructura común para futuras features (sidebar, topbar, etc.)
 */
export default function ContractorsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content area */}
      {children}
    </div>
  );
}
