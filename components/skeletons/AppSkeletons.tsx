import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Top Navbar Skeleton
 */
export function NavbarSkeleton() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          {/* Logo placeholder */}
          <Skeleton className="h-9 w-24 rounded-lg bg-zinc-200" />
          <div className="border-l border-zinc-200 pl-2 space-y-1">
            <Skeleton className="h-3.5 w-20 bg-zinc-200" />
            <Skeleton className="h-2.5 w-24 bg-zinc-100" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-8 w-24 rounded-full bg-zinc-200" />
        </div>
      </div>
    </header>
  );
}

/**
 * Bottom Navigation Skeleton
 */
export function BottomNavSkeleton({ tabCount = 4 }: { tabCount?: number }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-xs"
      aria-label="Memuat navigasi..."
    >
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {Array.from({ length: tabCount }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 py-1 px-3">
            <Skeleton className="h-5 w-5 rounded-full bg-zinc-200" />
            <Skeleton className="h-2.5 w-10 bg-zinc-100" />
          </div>
        ))}
      </div>
    </nav>
  );
}

/**
 * Permission Card Skeleton
 */
export function PermissionCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Skeleton className="h-9 w-9 rounded-lg bg-zinc-200 shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <Skeleton className="h-4 w-3/4 max-w-[160px] bg-zinc-200" />
            <Skeleton className="h-3 w-1/2 max-w-[120px] bg-zinc-100" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Skeleton className="h-5 w-20 rounded-full bg-zinc-200" />
          <Skeleton className="h-4 w-16 rounded bg-zinc-100" />
        </div>
      </div>

      {/* Schedule Box */}
      <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-28 bg-zinc-200" />
          <Skeleton className="h-3 w-16 bg-zinc-100" />
        </div>
        <Skeleton className="h-3 w-40 bg-zinc-100" />
      </div>

      {/* Action / Footer */}
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-24 bg-zinc-100" />
        <Skeleton className="h-8 w-24 rounded-lg bg-zinc-200" />
      </div>
    </div>
  );
}

/**
 * Student Row Skeleton (for SantriPosisiPage)
 */
export function StudentCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <Skeleton className="h-9 w-9 rounded-xl bg-zinc-200 shrink-0" />
        <div className="space-y-1.5 flex-1 min-w-0">
          <Skeleton className="h-3.5 w-32 bg-zinc-200" />
          <Skeleton className="h-2.5 w-24 bg-zinc-100" />
          <Skeleton className="h-2.5 w-20 bg-zinc-100" />
        </div>
      </div>
      <Skeleton className="h-6 w-20 rounded-lg bg-zinc-200 shrink-0" />
    </div>
  );
}

/**
 * Santri List View Skeleton (Full page for SantriPosisiPage)
 */
export function SantriListSkeleton() {
  return (
    <div className="space-y-3.5" role="status" aria-label="Memuat daftar santri...">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-36 bg-zinc-200" />
          <Skeleton className="h-3 w-48 bg-zinc-100" />
        </div>
        <Skeleton className="h-6 w-16 rounded-md bg-zinc-200" />
      </div>

      {/* Search Input Skeleton */}
      <Skeleton className="h-11 w-full rounded-xl bg-zinc-200" />

      {/* Filter Tabs Skeleton */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <Skeleton className="h-8 w-20 rounded-lg bg-zinc-200 shrink-0" />
        <Skeleton className="h-8 w-28 rounded-lg bg-zinc-100 shrink-0" />
        <Skeleton className="h-8 w-36 rounded-lg bg-zinc-100 shrink-0" />
      </div>

      {/* List of cards */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <StudentCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Permission Detail Page Skeleton (for /petugas/izin/[id])
 */
export function PermissionDetailSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Memuat rincian izin santri...">
      {/* Back button line */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <Skeleton className="h-5 w-36 bg-zinc-200" />
        <Skeleton className="h-3 w-20 bg-zinc-100" />
      </div>

      {/* Main Student Info Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-24 rounded bg-zinc-200" />
            <Skeleton className="h-5 w-44 bg-zinc-200" />
            <Skeleton className="h-3.5 w-32 bg-zinc-100" />
            <Skeleton className="h-3 w-28 bg-zinc-100" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full bg-zinc-200" />
        </div>

        {/* Reason block */}
        <div className="pt-3 border-t border-zinc-100 space-y-1.5">
          <Skeleton className="h-3.5 w-28 bg-zinc-200" />
          <Skeleton className="h-16 w-full rounded-xl bg-zinc-100" />
        </div>
      </div>

      {/* Schedule & Gate Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
        <Skeleton className="h-4 w-36 bg-zinc-200" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-16 rounded-xl bg-zinc-100" />
          <Skeleton className="h-16 rounded-xl bg-zinc-100" />
        </div>
      </div>

      {/* Escort & Applicant Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-2.5">
        <Skeleton className="h-4 w-32 bg-zinc-200" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full bg-zinc-100" />
          <Skeleton className="h-3.5 w-3/4 bg-zinc-100" />
          <Skeleton className="h-3.5 w-1/2 bg-zinc-100" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-2.5">
        <Skeleton className="h-4 w-32 bg-zinc-200" />
        <div className="grid grid-cols-2 gap-2.5">
          <Skeleton className="h-11 rounded-xl bg-zinc-200" />
          <Skeleton className="h-11 rounded-xl bg-zinc-200" />
        </div>
      </div>
    </div>
  );
}

/**
 * Form Pengajuan Izin Skeleton (for /petugas/ajukan)
 */
export function AjukanFormSkeleton() {
  return (
    <div className="space-y-4 pb-12" role="status" aria-label="Memuat formulir pengajuan...">
      {/* Page Heading */}
      <div className="space-y-1">
        <Skeleton className="h-5 w-40 bg-zinc-200" />
        <Skeleton className="h-3 w-64 bg-zinc-100" />
      </div>

      {/* Caller Info Banner */}
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl bg-zinc-200 shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-2.5 w-24 bg-zinc-200" />
          <Skeleton className="h-3.5 w-36 bg-zinc-200" />
          <Skeleton className="h-3 w-28 bg-zinc-100" />
        </div>
      </div>

      {/* Group 1: Santri & Approver */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3.5">
        <div className="space-y-1 pb-2 border-b border-zinc-100">
          <Skeleton className="h-4 w-48 bg-zinc-200" />
          <Skeleton className="h-3 w-56 bg-zinc-100" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-32 bg-zinc-200" />
          <Skeleton className="h-11 w-full rounded-xl bg-zinc-100" />
        </div>
        <div className="space-y-2 pt-1">
          <Skeleton className="h-3 w-40 bg-zinc-200" />
          <Skeleton className="h-11 w-full rounded-xl bg-zinc-100" />
        </div>
      </div>

      {/* Group 2: Kategori & Jadwal */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3.5">
        <div className="space-y-1 pb-2 border-b border-zinc-100">
          <Skeleton className="h-4 w-40 bg-zinc-200" />
          <Skeleton className="h-3 w-52 bg-zinc-100" />
        </div>
        <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-zinc-100 p-1.5">
          <Skeleton className="h-10 rounded-lg bg-white" />
          <Skeleton className="h-10 rounded-lg bg-transparent" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-11 rounded-xl bg-zinc-100" />
          <Skeleton className="h-11 rounded-xl bg-zinc-100" />
        </div>
      </div>

      {/* Group 3: Keperluan & Pendamping */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3.5">
        <div className="space-y-1 pb-2 border-b border-zinc-100">
          <Skeleton className="h-4 w-44 bg-zinc-200" />
          <Skeleton className="h-3 w-56 bg-zinc-100" />
        </div>
        <Skeleton className="h-24 w-full rounded-xl bg-zinc-100" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-11 rounded-xl bg-zinc-100" />
          <Skeleton className="h-11 rounded-xl bg-zinc-100" />
          <Skeleton className="h-11 rounded-xl bg-zinc-100" />
          <Skeleton className="h-11 rounded-xl bg-zinc-100" />
        </div>
      </div>

      {/* Submit Button */}
      <Skeleton className="h-12 w-full rounded-xl bg-zinc-200" />
    </div>
  );
}

/**
 * Pesiar Schedule Card Skeleton
 */
export function PesiarScheduleSkeleton() {
  return (
    <div className="space-y-2.5" role="status" aria-label="Memuat jadwal pesiar...">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xs space-y-2"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32 bg-zinc-200" />
            <Skeleton className="h-5 w-16 rounded-full bg-zinc-100" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20 bg-zinc-100" />
            <Skeleton className="h-3 w-24 bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Unified Portal Dashboard Skeleton
 * Used by app/page.tsx during initial loading or session wait, and app/loading.tsx
 */
export function PortalDashboardSkeleton({ role }: { role?: string }) {
  const isParent = role === 'ORANG_TUA';

  return (
    <div className="space-y-3.5" role="status" aria-label="Memuat dashboard perizinan...">
      {/* 1. Header greeting & status */}
      <div className="flex items-center justify-between px-0.5 pt-0.5">
        <div className="space-y-1">
          <Skeleton className="h-5 w-40 bg-zinc-200" />
          <Skeleton className="h-3 w-56 bg-zinc-100" />
        </div>
        <Skeleton className="h-7 w-20 rounded-lg bg-zinc-200" />
      </div>

      {/* 2. Highlight / Profile / Quick Status Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-xl bg-zinc-200 shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <Skeleton className="h-4 w-36 bg-zinc-200" />
            <Skeleton className="h-3 w-48 bg-zinc-100" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full bg-zinc-200 shrink-0" />
        </div>

        {/* Quick summary strip */}
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-2.5 flex items-center justify-between">
          <Skeleton className="h-3 w-24 bg-zinc-200" />
          <Skeleton className="h-3 w-32 bg-zinc-200" />
        </div>
      </div>

      {/* 3. Metric Stat Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center space-y-1.5 shadow-xs">
          <Skeleton className="h-3 w-12 mx-auto bg-zinc-100" />
          <Skeleton className="h-6 w-8 mx-auto bg-zinc-200" />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center space-y-1.5 shadow-xs">
          <Skeleton className="h-3 w-14 mx-auto bg-zinc-100" />
          <Skeleton className="h-6 w-8 mx-auto bg-zinc-200" />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center space-y-1.5 shadow-xs">
          <Skeleton className="h-3 w-12 mx-auto bg-zinc-100" />
          <Skeleton className="h-6 w-8 mx-auto bg-zinc-200" />
        </div>
      </div>

      {/* 4. Filter / Sub-tab Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <Skeleton className="h-8 w-20 rounded-lg bg-zinc-200 shrink-0" />
        <Skeleton className="h-8 w-24 rounded-lg bg-zinc-100 shrink-0" />
        <Skeleton className="h-8 w-24 rounded-lg bg-zinc-100 shrink-0" />
      </div>

      {/* 5. Permission Cards Feed */}
      <div className="space-y-2.5 pt-1">
        <PermissionCardSkeleton />
        <PermissionCardSkeleton />
        <PermissionCardSkeleton />
      </div>
    </div>
  );
}

/**
 * Full Page Shell Skeleton (Header + Content + Bottom Nav)
 * Rendered when loading a fresh page or before hydration/session is established
 */
export function FullPortalPageSkeleton({ role }: { role?: string }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-zinc-200 bg-zinc-50 shadow-sm relative">
      <NavbarSkeleton />
      <main className="flex-1 p-3.5 pb-24 overflow-y-auto">
        <PortalDashboardSkeleton role={role} />
      </main>
      <BottomNavSkeleton tabCount={role === 'ORANG_TUA' ? 3 : 5} />
    </div>
  );
}
