'use client';

import React from 'react';
import Image from 'next/image';
import { FileText, UserCheck, UploadCloud } from 'lucide-react';
import { AuthSession } from '@/lib/types';
import { TabKey } from './BottomNav';

interface NavbarProps {
  onOpenInstall?: () => void;
  isInstalled?: boolean;
  session?: AuthSession | null;
  onLogout?: () => void;
  onOpenProfile?: () => void;
  onOpenAjukan?: () => void;
  onOpenReturn?: () => void;
  onOpenUploadCsv?: () => void;
  activeTab?: TabKey;
  outsideCount?: number;
}

export function Navbar({
  onOpenAjukan,
  onOpenReturn,
  onOpenUploadCsv,
  activeTab,
  outsideCount = 0,
  session,
}: NavbarProps) {
  const isStaff = session && session.role !== 'ORANG_TUA' && session.role !== 'SATPAM';
  const isMasterTab = activeTab === 'MASTER';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-3.5 py-2.5">
        {/* Logo and Institution Branding */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative h-9 w-24 shrink-0 overflow-hidden">
            <Image
              src="https://infosmait.ihsanulfikri.sch.id/wp-content/uploads/2026/10/Untitled-design-768x431.png"
              alt="Logo SMAIT Ihsanul Fikri"
              fill
              sizes="100px"
              className="object-contain object-left"
              priority
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="border-l border-zinc-200 pl-2 min-w-0">
            <h1 className="text-xs font-bold tracking-tight text-zinc-900 truncate">
              E-Izin Santri
            </h1>
            <p className="text-[11px] font-medium text-zinc-500 truncate">
              SMAIT Ihsanul Fikri
            </p>
          </div>
        </div>

        {/* Action Buttons: Cek-in Santri & (Upload CSV / Ajukan Izin) */}
        <div className="flex items-center gap-1.5 shrink-0">

          {isStaff && outsideCount > 0 && onOpenReturn && (
            <button
              type="button"
              onClick={onOpenReturn}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer"
              aria-label="Cek-in santri kembali"
              title="Konfirmasi Santri Kembali"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Cek-in</span>
              <span className="w-4 h-4 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center">
                {outsideCount}
              </span>
            </button>
          )}

          {isMasterTab && onOpenUploadCsv ? (
            <button
              type="button"
              onClick={onOpenUploadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
              aria-label="Upload berkas CSV santri"
              title="Upload File CSV Data Santri"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-100" />
              <span>Upload CSV</span>
            </button>
          ) : (
            onOpenAjukan && (
              <button
                type="button"
                onClick={onOpenAjukan}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                aria-label="Ajukan permohonan perizinan santri"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-100" />
                <span>Ajukan Izin</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
