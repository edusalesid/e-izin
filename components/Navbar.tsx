'use client';

import React from 'react';
import Image from 'next/image';
import { FilePlus2, UserCheck, UploadCloud } from 'lucide-react';
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
  const badgeLabel = outsideCount > 99 ? '99+' : outsideCount;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2.5 px-3.5 py-3">
        {/* Logo and Institution Branding */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative h-8 w-[54px] shrink-0 overflow-hidden">
            <Image
              src="/logo-smait.png"
              alt="Logo SMAIT Ihsanul Fikri"
              fill
              sizes="56px"
              className="object-contain object-left"
              priority
            />
          </div>
          <div className="border-l border-zinc-200 pl-2.5 min-w-0 flex-1">
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-zinc-900 leading-tight truncate">
              E-Izin Santri
            </h1>
            <p className="text-[11px] font-medium text-zinc-600 leading-tight truncate">
              SMAIT Ihsanul Fikri
            </p>
          </div>
        </div>

        {/* Action Buttons (44px minimum tap target) */}
        <div className="flex items-center gap-2 shrink-0">
          {isStaff && outsideCount > 0 && onOpenReturn && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={onOpenReturn}
                className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/90 shadow-2xs transition active:scale-95 cursor-pointer select-none touch-manipulation focus-visible:outline-2 focus-visible:outline-emerald-600"
                aria-label={`Cek-in santri kembali (${outsideCount} santri di luar)`}
                title={`Cek-in Santri Kembali (${outsideCount})`}
              >
                <UserCheck className="w-5 h-5 shrink-0" />
              </button>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-700 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white shadow-xs"
              >
                {badgeLabel}
              </span>
            </div>
          )}

          {isMasterTab && onOpenUploadCsv ? (
            <button
              type="button"
              onClick={onOpenUploadCsv}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer shrink-0 select-none touch-manipulation focus-visible:outline-2 focus-visible:outline-emerald-600"
              aria-label="Upload berkas CSV santri"
              title="Upload File CSV Data Santri"
            >
              <UploadCloud className="w-4 h-4 shrink-0" />
              <span>Import</span>
            </button>
          ) : (
            onOpenAjukan && (
              <button
                type="button"
                onClick={onOpenAjukan}
                className="inline-flex items-center justify-center gap-1.5 h-11 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer shrink-0 select-none touch-manipulation focus-visible:outline-2 focus-visible:outline-emerald-600"
                aria-label="Ajukan permohonan perizinan santri"
                title="Ajukan Izin Santri"
              >
                <FilePlus2 className="w-4 h-4 shrink-0" />
                <span>Buat Izin</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
