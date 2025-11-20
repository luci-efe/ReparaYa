/**
 * Availability Manager Page
 * Main container component for contractor availability management
 *
 * TODO: Implement full component with state management
 * TODO: Add tabs for Weekly Schedule, Exceptions, Blockouts
 * TODO: Integrate with API endpoints
 * TODO: Add loading/error states
 * TODO: Add accessibility features (keyboard navigation, ARIA)
 */

"use client";

import { useState } from "react";

export interface AvailabilityManagerPageProps {
  /** Contractor profile ID */
  contractorProfileId: string;
}

/**
 * Main page component for managing contractor availability
 */
export function AvailabilityManagerPage({
  contractorProfileId,
}: AvailabilityManagerPageProps) {
  const [activeTab, setActiveTab] = useState<
    "schedule" | "exceptions" | "blockouts"
  >("schedule");

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Gestión de Disponibilidad
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Configura tu horario de trabajo, excepciones y bloqueos temporales
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`${
              activeTab === "schedule"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            aria-current={activeTab === "schedule" ? "page" : undefined}
          >
            Horario Semanal
          </button>
          <button
            onClick={() => setActiveTab("exceptions")}
            className={`${
              activeTab === "exceptions"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            aria-current={activeTab === "exceptions" ? "page" : undefined}
          >
            Excepciones
          </button>
          <button
            onClick={() => setActiveTab("blockouts")}
            className={`${
              activeTab === "blockouts"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            aria-current={activeTab === "blockouts" ? "page" : undefined}
          >
            Bloqueos
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === "schedule" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Horario Semanal
            </h2>
            <p className="text-gray-600">
              TODO: Implementar WeeklyScheduleEditor component
            </p>
          </div>
        )}

        {activeTab === "exceptions" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Excepciones y Feriados
            </h2>
            <p className="text-gray-600">
              TODO: Implementar ExceptionManager component
            </p>
          </div>
        )}

        {activeTab === "blockouts" && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Bloqueos Manuales
            </h2>
            <p className="text-gray-600">
              TODO: Implementar BlockoutManager component
            </p>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Nota:</strong> Los cambios en tu disponibilidad se reflejarán
          inmediatamente en las reservas futuras.
        </p>
      </div>
    </div>
  );
}
