import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';

const tiles = [
    {
        title: 'Buscar Servicios',
        description: 'Encuentra profesionales calificados para tu hogar',
        icon: (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
        href: '/clients/search',
        color: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
        hoverColor: 'group-hover:shadow-lg',
        span: 'md:col-span-3', // Full width
        textColor: 'text-white',
        descColor: 'text-emerald-50',
    },
    {
        title: 'Mis Reservas',
        description: 'Ver historial y estado',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        href: '/clients/bookings',
        color: 'bg-indigo-50 text-indigo-600',
        hoverColor: 'group-hover:bg-indigo-100',
        span: 'md:col-span-1',
        textColor: 'text-gray-900',
        descColor: 'text-gray-500',
    },
    {
        title: 'Mensajes',
        description: 'Chat con contratistas',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
        ),
        href: '/clients/messages',
        color: 'bg-amber-50 text-amber-600',
        hoverColor: 'group-hover:bg-amber-100',
        span: 'md:col-span-1',
        textColor: 'text-gray-900',
        descColor: 'text-gray-500',
    },
    {
        title: 'Mi Perfil',
        description: 'Gestionar información personal',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
        href: '/clients/profile',
        color: 'bg-blue-50 text-blue-600',
        hoverColor: 'group-hover:bg-blue-100',
        span: 'md:col-span-1',
        textColor: 'text-gray-900',
        descColor: 'text-gray-500',
    },
];

export function ClientQuickAccessTiles() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiles.map((tile) => (
                <Link key={tile.title} href={tile.href} className={`group block ${tile.span}`}>
                    <Card className={`h-full transition-all duration-200 hover:-translate-y-1 border-gray-200 ${tile.span === 'md:col-span-2' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-none' : 'hover:shadow-md'}`}>
                        <CardContent className="p-6 flex items-center gap-4 h-full">
                            <div className={`p-3 rounded-xl transition-colors ${tile.span === 'md:col-span-2' ? 'bg-white/20 text-white' : `${tile.color} ${tile.hoverColor}`}`}>
                                {tile.icon}
                            </div>
                            <div>
                                <h3 className={`font-semibold text-lg transition-colors ${tile.span === 'md:col-span-2' ? 'text-white' : 'text-gray-900 group-hover:text-blue-600'}`}>
                                    {tile.title}
                                </h3>
                                <p className={`text-sm mt-1 ${tile.span === 'md:col-span-2' ? 'text-emerald-50' : 'text-gray-500'}`}>
                                    {tile.description}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
