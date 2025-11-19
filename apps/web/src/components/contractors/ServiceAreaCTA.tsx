import Link from 'next/link';
import { Card, Button } from '@/components/ui';

interface ServiceAreaCTAProps {
  hasServiceArea: boolean;
}

export function ServiceAreaCTA({ hasServiceArea }: ServiceAreaCTAProps) {
  // Hide component if service area is already configured
  if (hasServiceArea) {
    return null;
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-blue-600"
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
            <h3 className="text-base font-semibold text-blue-900">
              Configura tu zona de operación
            </h3>
          </div>
          <p className="text-sm text-blue-800">
            Define el área donde ofreces tus servicios para empezar a recibir solicitudes de clientes cercanos.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link href="/contractors/settings" title="Configurar zona de operación">
            <Button variant="primary" size="sm">
              Configurar
              <svg
                className="w-4 h-4 ml-1.5 inline"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
