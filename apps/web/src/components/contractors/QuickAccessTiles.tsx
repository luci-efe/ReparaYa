import Link from 'next/link';
import { Card } from '@/components/ui';

const tiles = [
  {
    title: 'Mis Servicios',
    description: 'Administra y publica tus servicios',
    href: '/contractors/services',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Disponibilidad',
    description: 'Gestiona tu calendario y horarios',
    href: '/contractors/availability',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Mensajes',
    description: 'Comunícate con tus clientes',
    href: '/contractors/messages',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
];

export function QuickAccessTiles() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tiles.map((tile) => (
        <Link
          key={tile.title}
          href={tile.href}
          className="group focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-xl"
        >
          <Card hover clickable className="h-full transition-all">
            <div className="flex flex-col items-start">
              <div className={`${tile.bgColor} ${tile.color} p-3 rounded-lg mb-4 group-hover:scale-110 transition-transform`}>
                {tile.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {tile.title}
              </h3>
              <p className="text-sm text-gray-600">
                {tile.description}
              </p>
              <div className="mt-4 flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                <span>Acceder</span>
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
          </Card>
        </Link>
      ))}
    </div>
  );
}
