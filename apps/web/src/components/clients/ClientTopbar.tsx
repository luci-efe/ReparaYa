"use client";

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

interface ClientTopbarProps {
    user: {
        name: string;
        email: string;
        imageUrl?: string;
    };
    onMenuClick: () => void;
}

export function ClientTopbar({ user, onMenuClick }: ClientTopbarProps) {
    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30">
            <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Mobile menu button */}
                    <button
                        type="button"
                        className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={onMenuClick}
                        aria-label="Abrir menú"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Logo */}
                    <Link href="/clients/dashboard" className="flex items-center gap-2">
                        <span className="text-xl font-bold text-blue-600">ReparaYa</span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            Cliente
                        </span>
                    </Link>
                </div>

                {/* User menu */}
                <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-right">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <UserButton afterSignOutUrl="/" />
                </div>
            </div>
        </header>
    );
}
