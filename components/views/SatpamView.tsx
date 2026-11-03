'use client';

import React, { useState, useMemo } from 'react';
import { Permission, UserAccount } from '@/lib/types';
import { PermissionCard } from '../cards/PermissionCard';
import { HistoryView } from './HistoryView';
import { ShieldCheck, LogOut, Search, X, Shield, Clock } from 'lucide-react';
import { TabKey } from '../BottomNav';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SatpamViewProps {
  activeTab: TabKey;
  currentUser: UserAccount;
  permissions: Permission[];
  onCheckOut: (id: string) => void;
  onCheckIn: (id: string, lateFineStatus?: 'UNPAID' | 'PAID') => void;
  onRefresh: () => void;
  onTabChange?: (tab: TabKey) => void;
}

export function SatpamView({
  activeTab,
  currentUser,
  permissions,
  onCheckOut,
  onCheckIn,
  onRefresh,
  onTabChange,
}: SatpamViewProps) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'KELUAR_SEBENTAR' | 'PULANG_MENGINAP'>('ALL');

  const readyToLeaveAll = useMemo(() => {
    return permissions.filter((p) => p.status === 'APPROVED_WALI_KELAS');
  }, [permissions]);

  const currentlyOutsideAll = useMemo(() => {
    return permissions.filter((p) => p.status === 'SEDANG_DI_LUAR');
  }, [permissions]);

  const historyListAll = useMemo(() => {
    return permissions.filter(
      (p) => p.status === 'KEMBALI_TEPAT_WAKTU' || p.status === 'KEMBALI_TERLAMBAT'
    );
  }, [permissions]);

  const readyToLeave = useMemo(() => {
    return readyToLeaveAll.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          p.studentName.toLowerCase().includes(q) ||
          p.studentNis.includes(q) ||
          p.className.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [readyToLeaveAll, categoryFilter, query]);

  const currentlyOutside = useMemo(() => {
    return currentlyOutsideAll.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          p.studentName.toLowerCase().includes(q) ||
          p.studentNis.includes(q) ||
          p.className.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [currentlyOutsideAll, categoryFilter, query]);

  const historyList = useMemo(() => {
    return historyListAll.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          p.studentName.toLowerCase().includes(q) ||
          p.studentNis.includes(q) ||
          p.className.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [historyListAll, categoryFilter, query]);

  const isFilterActive = query.trim() !== '' || categoryFilter !== 'ALL';

  const handleResetFilter = () => {
    setQuery('');
    setCategoryFilter('ALL');
  };

  return (
    <div className="space-y-3.5 pb-8">
      {/* Header Pos Keamanan Gerbang */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-800 to-zinc-900 p-3.5 sm:p-4 text-white shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 text-[10px] font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                Pos Gerbang Utama
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-snug">
              Verifikasi Keluar-Masuk Gerbang
            </h1>
            <p className="text-xs text-emerald-100/90 mt-0.5 truncate">
              {activeTab === 'GERBANG'
                ? readyToLeave.length > 0
                  ? `${readyToLeave.length} santri siap verifikasi keluar gerbang.`
                  : 'Tidak ada antrean santri keluar gerbang.'
                : activeTab === 'DILUAR'
                ? currentlyOutside.length > 0
                  ? `${currentlyOutside.length} santri sedang berada di luar pondok.`
                  : 'Seluruh santri sudah kembali ke pondok.'
                : 'Arsip catatan verifikasi keluar-masuk gerbang.'}
            </p>
          </div>

          <div className="h-10 px-3 rounded-lg bg-black/20 border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white tabular-nums">
              {activeTab === 'GERBANG'
                ? `${readyToLeave.length} Siap Keluar`
                : activeTab === 'DILUAR'
                ? `${currentlyOutside.length} Di Luar`
                : `${historyList.length} Arsip`}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Search & Category Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, NIS, atau kelas santri..."
            className="pl-9 pr-8 h-10 bg-white border-zinc-200 text-xs rounded-xl focus-visible:ring-emerald-600/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
              categoryFilter === 'ALL'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
            )}
          >
            Semua Jenis
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('KELUAR_SEBENTAR')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
              categoryFilter === 'KELUAR_SEBENTAR'
                ? 'bg-amber-700 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200/60 hover:bg-amber-100/70'
            )}
          >
            Keluar Sebentar
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('PULANG_MENGINAP')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
              categoryFilter === 'PULANG_MENGINAP'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200/60 hover:bg-emerald-100/70'
            )}
          >
            Pulang Menginap
          </button>
        </div>
      </div>

      {/* Tab: GERBANG (Siap Keluar) */}
      {activeTab === 'GERBANG' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Santri Siap Keluar</h2>
              <p className="text-xs text-zinc-600">Izin telah disetujui Wali Kelas</p>
            </div>
            <div className="flex items-center gap-1.5">
              {isFilterActive && (
                <span className="text-[11px] text-zinc-500 font-medium">
                  {readyToLeave.length} dari {readyToLeaveAll.length}
                </span>
              )}
              <Badge variant="approved" className="text-xs font-semibold px-2.5 py-0.5">
                {readyToLeave.length} Santri
              </Badge>
            </div>
          </div>

          {readyToLeaveAll.length === 0 ? (
            <Card className="border border-zinc-200/80 bg-white p-7 text-center rounded-xl shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                Alhamdulillah, Tidak Ada Antrean Gerbang
              </h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Semua santri yang berizin keluar telah diverifikasi oleh petugas pos keamanan.
              </p>
              {onTabChange && (
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={() => onTabChange('DILUAR')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-9 px-3.5 rounded-lg cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1.5" />
                    Lihat Santri di Luar
                  </Button>
                </div>
              )}
            </Card>
          ) : readyToLeave.length === 0 ? (
            <Card className="border border-dashed border-zinc-300 bg-zinc-50/60 p-7 text-center rounded-xl">
              <Search className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-zinc-800">Santri Tidak Ditemukan</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 max-w-xs mx-auto leading-relaxed">
                Tidak ada santri siap keluar yang sesuai dengan pencarian atau filter jenis izin.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilter}
                className="mt-3 text-xs h-8 px-3 rounded-xl border-zinc-300 cursor-pointer"
              >
                Reset Filter & Pencarian
              </Button>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {readyToLeave.map((perm) => (
                <PermissionCard
                  key={perm.id}
                  permission={perm}
                  activeRole="SATPAM"
                  onCheckOut={onCheckOut}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: DILUAR (Sedang di Luar) */}
      {activeTab === 'DILUAR' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Santri Sedang di Luar</h2>
              <p className="text-xs text-zinc-600">Konfirmasi check-in saat santri kembali ke pondok</p>
            </div>
            <div className="flex items-center gap-1.5">
              {isFilterActive && (
                <span className="text-[11px] text-zinc-500 font-medium">
                  {currentlyOutside.length} dari {currentlyOutsideAll.length}
                </span>
              )}
              <Badge variant="active" className="text-xs font-semibold px-2.5 py-0.5">
                {currentlyOutside.length} Santri
              </Badge>
            </div>
          </div>

          {currentlyOutsideAll.length === 0 ? (
            <Card className="border border-zinc-200/80 bg-white p-7 text-center rounded-xl shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-700">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                Semua Santri Sudah Kembali
              </h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Tidak ada santri yang sedang berizin di luar lingkungan pondok saat ini.
              </p>
            </Card>
          ) : currentlyOutside.length === 0 ? (
            <Card className="border border-dashed border-zinc-300 bg-zinc-50/60 p-7 text-center rounded-xl">
              <Search className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
              <h3 className="text-xs font-bold text-zinc-800">Santri Tidak Ditemukan</h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 max-w-xs mx-auto leading-relaxed">
                Tidak ada santri di luar yang sesuai dengan pencarian atau filter jenis izin.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetFilter}
                className="mt-3 text-xs h-8 px-3 rounded-xl border-zinc-300 cursor-pointer"
              >
                Reset Filter & Pencarian
              </Button>
            </Card>
          ) : (
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Santri yang kembali dari luar <strong>wajib melapor langsung ke Ustadz/Musyrif Asrama</strong> untuk verifikasi kepulangan dan presensi waktu.
                </span>
              </div>
              {currentlyOutside.map((perm) => (
                <PermissionCard
                  key={perm.id}
                  permission={perm}
                  activeRole="SATPAM"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: RIWAYAT (Log Gerbang) */}
      {activeTab === 'RIWAYAT' && (
        <HistoryView
          permissions={historyList}
          title="Log Riwayat Pos Gerbang"
          description="Arsip verifikasi check-out keberangkatan dan kepulangan santri melalui gerbang pos keamanan."
          activeRole="SATPAM"
          emptyTitle="Belum Ada Catatan Log Gerbang"
          emptySubtitle="Perizinan santri yang telah selesai diverifikasi di pos gerbang akan tersimpan di sini."
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
