"use client";

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

interface ContractorTopbarProps {
  _user: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string;
  };
  onMenuClick: () => void;
}

export function ContractorTopbar({ _user, onMenuClick }: ContractorTopbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 h-16">
      <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
        {/* Left section: Menu button + Logo */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            aria-label="Abrir menú de navegación"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Logo */}
          <Link
            href="/contractors/dashboard"
            className="flex items-center gap-2 text-xl font-bold text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg px-2 py-1 transition-colors"
          >
            <svg
              className="w-8 h-8"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="hidden sm:inline">ReparaYa</span>
          </Link>
        </div>

        {/* Right section: Notifications + User menu */}
        <div className="flex items-center gap-4">
          {/* Notifications placeholder */}
          <button
            type="button"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors relative"
            aria-label="Notificaciones"
            title="Notificaciones (próximamente)"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {/* Notification badge placeholder */}
            {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" /> */}
          </button>

          {/* User menu - Clerk UserButton */}
          <div className="flex items-center">
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: 'w-10 h-10',
                },
              }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
