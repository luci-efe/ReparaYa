'use client';

import { ReactNode, useState } from 'react';
import { ClientSidebar } from '@/components/clients/ClientSidebar';
import { ClientTopbar } from '@/components/clients/ClientTopbar';

export default function ClientLayout({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            <ClientTopbar onMenuClick={() => setSidebarOpen(true)} />
            <ClientSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="lg:pl-64 pt-16 min-h-screen">
                <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
