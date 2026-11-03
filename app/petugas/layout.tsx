import React from 'react';
import { StaffProvider } from '@/hooks/useStaff';

export default function PetugasLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffProvider>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-zinc-200 bg-zinc-50 shadow-sm relative p-3.5 pb-24">
        {children}
      </div>
    </StaffProvider>
  );
}
