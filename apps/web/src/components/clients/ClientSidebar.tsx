"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface ClientSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NavItem {
    name: string;
    href: string;
    icon: ReactNode;
}

const navigation: NavItem[] = [
    {
        name: 'Dashboard',
        href: '/clients/dashboard',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        name: 'Buscar Servicios',
        href: '/clients/search',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
    {
        name: 'Mi Perfil',
        href: '/clients/profile',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
    {
        name: 'Mis Reservas',
        href: '/clients/bookings',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        name: 'Mensajes',
        href: '/clients/messages',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
        ),
    },
    {
        name: 'Direcciones',
        href: '/clients/addresses',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        name: 'Configuración',
        href: '/clients/settings',
        icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
];

interface NavLinkProps {
    item: NavItem;
    isActive: boolean;
    onClick?: () => void;
}

function NavLink({ item, isActive, onClick }: NavLinkProps) {
    return (
        <Link
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            aria-current={isActive ? 'page' : undefined}
        >
            {item.icon}
            <span>{item.name}</span>
        </Link>
    );
}

interface NavigationListProps {
    pathname: string;
    onLinkClick?: () => void;
}

function NavigationList({ pathname, onLinkClick }: NavigationListProps) {
    return (
        <nav className="flex-1 px-4 py-6 space-y-1" aria-label="Navegación del dashboard">
            {navigation.map((item) => (
                <NavLink
                    key={item.name}
                    item={item}
                    isActive={pathname === item.href}
                    onClick={onLinkClick}
                />
            ))}
        </nav>
    );
}

export function ClientSidebar({ isOpen, onClose }: ClientSidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {/* Desktop sidebar */}
            <aside
                className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col lg:pt-16 lg:z-20"
                aria-label="Navegación principal"
            >
                <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
                    <NavigationList pathname={pathname} />
                </div>
            </aside>

            {/* Mobile sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:hidden pt-16 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                aria-label="Navegación principal"
            >
                <div className="flex-1 flex flex-col min-h-0">
                    <NavigationList pathname={pathname} onLinkClick={onClose} />
                </div>
            </aside>
        </>
    );
}
