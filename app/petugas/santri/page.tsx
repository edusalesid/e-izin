'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useStaff } from '@/hooks/useStaff';
import { StatusBadge } from '@/components/cards/StatusBadge';
import { formatDateTime } from '@/lib/utils';
import {
  Users,
  Search,
  MapPin,
  ChevronRight,
  Home,
  LogOut,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SantriListSkeleton } from '@/components/skeletons/AppSkeletons';

export default function SantriPosisiPage() {
  const { students, permissions, isLoading, refreshData } = useStaff();
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OUTSIDE' | 'DORM'>('ALL');

  if (isLoading) {
    return <SantriListSkeleton />;
  }

  // Extract distinct classes
  const classNames = Array.from(new Set(students.map((s) => s.className)));

  const filtered = students.filter((student) => {
    const matchesSearch =
      student.fullName.toLowerCase().includes(query.toLowerCase()) ||
      student.nis.includes(query) ||
      student.className.toLowerCase().includes(query.toLowerCase());

    if (!matchesSearch) return false;

    if (classFilter !== 'ALL' && student.className !== classFilter) {
      return false;
    }

    const activePerm = permissions.find(
      (p) =>
        p.studentId === student.id &&
        (p.status === 'SEDANG_DI_LUAR' || p.status === 'APPROVED_WALI_KELAS')
    );

    if (statusFilter === 'OUTSIDE') {
      return activePerm?.status === 'SEDANG_DI_LUAR';
    }
    if (statusFilter === 'DORM') {
      return !activePerm || activePerm.status !== 'SEDANG_DI_LUAR';
    }

    return true;
  });

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-black text-zinc-900 tracking-tight">
            Santri Kelas & Posisi
          </h1>
          <p className="text-[11px] text-zinc-500">
            Daftar santri dan status keberadaan fisik saat ini
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            await refreshData();
            toast.success('Data Diperbarui', {
              description: 'Posisi dan status keberadaan santri telah disinkronkan.',
            });
          }}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition cursor-pointer"
        >
          Segarkan
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama santri, NIS, atau kelas..."
          className="w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3.5 py-2.5 text-base sm:text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 min-h-[44px]"
        />
      </div>

      {/* Class & Status Quick Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            'shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
            statusFilter === 'ALL'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
          )}
        >
          Semua ({students.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('OUTSIDE')}
          className={cn(
            'shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
            statusFilter === 'OUTSIDE'
              ? 'bg-purple-700 text-white shadow-xs'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
          )}
        >
          Sedang di Luar
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('DORM')}
          className={cn(
            'shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
            statusFilter === 'DORM'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
          )}
        >
          Di Asrama
        </button>
      </div>

      {/* Class Dropdown Filter if needed */}
      {classNames.length > 1 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500 font-medium">Filter Kelas:</span>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-zinc-800"
          >
            <option value="ALL">Semua Kelas</option>
            {classNames.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* List of Students */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center">
            <Users className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-zinc-800">Tidak Ada Santri yang Cocok</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Coba sesuaikan kata kunci atau filter pencarian Anda.</p>
          </div>
        ) : (
          filtered.map((student) => {
            // Find active permission
            const activePerm = permissions.find(
              (p) =>
                p.studentId === student.id &&
                (p.status === 'SEDANG_DI_LUAR' ||
                  p.status === 'APPROVED_WALI_KELAS' ||
                  p.status === 'PENDING_WALI_KELAS')
            );

            const isOutside = activePerm?.status === 'SEDANG_DI_LUAR';
            const isApproved = activePerm?.status === 'APPROVED_WALI_KELAS';
            const isPending = activePerm?.status === 'PENDING_WALI_KELAS';

            return (
              <div
                key={student.id}
                className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs flex items-center justify-between gap-3 hover:border-zinc-300 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 font-bold text-xs">
                    {student.fullName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 leading-snug line-clamp-2">
                      {student.fullName}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                      NIS: {student.nis} &bull; {student.className}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {isOutside && activePerm ? (
                    <Link
                      href={`/petugas/izin/${activePerm.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold hover:bg-purple-200 transition"
                    >
                      <span>Sedang di Luar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : isApproved && activePerm ? (
                    <Link
                      href={`/petugas/izin/${activePerm.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-200 transition"
                    >
                      <span>Siap Keluar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : isPending && activePerm ? (
                    <Link
                      href={`/petugas/izin/${activePerm.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold hover:bg-amber-200 transition"
                    >
                      <span>Menunggu Izin</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-bold">
                      <span>Di Asrama</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
