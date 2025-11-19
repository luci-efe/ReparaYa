import { Card } from '@/components/ui';

interface VerificationStatusWidgetProps {
  verified: boolean;
}

export function VerificationStatusWidget({ verified }: VerificationStatusWidgetProps) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Estado de Verificación
          </h3>
          <p className="mt-1 text-sm text-gray-600" role="status" aria-live="polite">
            {verified
              ? 'Tu perfil ha sido aprobado. Ya puedes publicar servicios.'
              : 'Tu perfil está en revisión. Podrás publicar servicios cuando sea aprobado.'}
          </p>
        </div>
        <div>
          {verified ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
              <svg
                className="w-4 h-4 mr-1.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Verificado
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800">
              <svg
                className="w-4 h-4 mr-1.5 animate-pulse"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              En Revisión
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
