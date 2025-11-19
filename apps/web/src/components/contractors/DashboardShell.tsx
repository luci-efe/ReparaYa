"use client";

import { useState } from 'react';
import { ContractorSidebar } from './ContractorSidebar';
import { ContractorTopbar } from './ContractorTopbar';

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string;
  };
  _profile: {
    verified: boolean;
    businessName: string;
  };
}

export function DashboardShell({ children, user, _profile }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Saltar al contenido principal
      </a>

      {/* Topbar */}
      <ContractorTopbar
        _user={user}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex">
        {/* Sidebar */}
        <ContractorSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <main
          id="main-content"
          aria-label="Contenido del dashboard"
          className="flex-1 w-full lg:ml-64 pt-16"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
