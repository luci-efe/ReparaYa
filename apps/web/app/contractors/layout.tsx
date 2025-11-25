'use client';

import { ReactNode, useState } from 'react';
import { ContractorSidebar } from '@/components/contractors/ContractorSidebar';
import { ContractorTopbar } from '@/components/contractors/ContractorTopbar';

export default function ContractorsLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorTopbar onMenuClick={() => setSidebarOpen(true)} />
      <ContractorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="lg:pl-64 pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
