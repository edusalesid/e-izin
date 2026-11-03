'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Permission, UserAccount, UserRole } from '@/lib/types';
import {
  X,
  Search,
  Check,
  Clock,
  AlertTriangle,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, calculateLateMinutes, calculateLateFine, formatRupiah } from '@/lib/utils';
import { toast } from 'sonner';

interface ReturnStudentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: Permission[];
  currentUser: UserAccount | null;
  activeRole: UserRole;
  onCheckIn: (id: string, lateFineStatus?: 'UNPAID' | 'PAID') => Promise<void> | void;
}

export function ReturnStudentDrawer({
  isOpen,
  onClose,
  permissions,
  currentUser,
  activeRole,
  onCheckIn,
}: ReturnStudentDrawerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Santri yang sedang berada di luar
  const outsideList = useMemo(() => {
    return permissions.filter((p) => p.status === 'SEDANG_DI_LUAR');
  }, [permissions]);

  // Filter cepat berdasarkan nama, NIS, atau kelas
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return outsideList;
    return outsideList.filter(
      (p) =>
        p.studentName.toLowerCase().includes(q) ||
        p.studentNis.includes(q) ||
        p.className.toLowerCase().includes(q)
    );
  }, [outsideList, searchQuery]);

  // Focus search input saat drawer dibuka
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSuccessId(null);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async (permissionId: string) => {
    setProcessingId(permissionId);
    try {
      await onCheckIn(permissionId);
      setSuccessId(permissionId);
      setTimeout(() => {
        setSuccessId(null);
      }, 2000);
    } catch (err: any) {
      console.error('CheckIn error:', err);
      toast.error('Gagal Cek-in Santri', {
        description: err?.message || 'Terjadi kesalahan sistem saat memproses kepulangan.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatSchedule = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d).replace(/\./g, ':') + ' WIB';
    } catch {
      return '-';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg rounded-t-2xl bg-zinc-50 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden border-t border-zinc-200 animate-in slide-in-from-bottom duration-250">
        {/* Drawer Header */}
        <div className="pt-2.5 pb-3 px-4 bg-white border-b border-zinc-200 shrink-0">
          <div className="w-10 h-1 rounded-full bg-zinc-300 mx-auto mb-2.5" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 leading-tight">
                  Cek-in Santri Kembali
                </h2>
                <p className="text-[11px] text-zinc-500">
                  {outsideList.length > 0
                    ? `${outsideList.length} santri sedang berada di luar pondok`
                    : 'Tidak ada santri di luar'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Instant Search Bar */}
          <div className="mt-2.5 relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Ketik nama, NIS, atau kelas santri..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-8 text-xs bg-zinc-100/80 border-zinc-200 rounded-lg focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dense List Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mx-auto mb-2 text-zinc-400">
                {searchQuery ? <Search className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
              </div>
              <p className="text-xs font-bold text-zinc-800">
                {searchQuery ? 'Santri Tidak Ditemukan' : 'Semua Santri Berada di Pondok'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 max-w-xs mx-auto">
                {searchQuery
                  ? `Tidak ada santri di luar yang sesuai dengan kata kunci "${searchQuery}".`
                  : 'Saat ini tidak ada santri yang tercatat sedang izin keluar.'}
              </p>
            </div>
          ) : (
            filteredList.map((perm) => {
              const now = new Date();
              const plannedReturn = new Date(perm.plannedReturn);
              const isLate = plannedReturn < now;
              const lateMinutes = isLate ? calculateLateMinutes(perm.plannedReturn, now.toISOString()) : 0;
              const lateFine = isLate ? calculateLateFine(lateMinutes) : 0;
              const isCurrentProcessing = processingId === perm.id;
              const isCurrentSuccess = successId === perm.id;

              const initials = perm.studentName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={perm.id}
                  className={cn(
                    'p-2.5 rounded-xl border bg-white shadow-2xs transition-all flex flex-col gap-2',
                    isLate ? 'border-amber-200/90 bg-amber-50/20' : 'border-zinc-200'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-zinc-900 truncate">
                            {perm.studentName}
                          </h4>
                          <span className="text-[10px] font-medium bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded shrink-0">
                            {perm.className}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate">
                          NIS: {perm.studentNis} • {perm.category === 'PULANG_MENGINAP' ? 'Pulang' : 'Keluar'}
                        </p>
                      </div>
                    </div>

                    {/* Button Aksi Konfirmasi */}
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(perm.id)}
                      disabled={isCurrentProcessing || isCurrentSuccess}
                      className={cn(
                        'h-7 px-2.5 text-[11px] font-semibold gap-1 shrink-0 transition-all cursor-pointer',
                        isCurrentSuccess
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      )}
                    >
                      {isCurrentProcessing ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : isCurrentSuccess ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Tercatat</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Konfirmasi Kembali</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Bar Status Waktu & Keterlambatan */}
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[10px]">
                    <div className="flex items-center gap-1 text-zinc-600 truncate">
                      <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span>Rencana kembali: <strong>{formatSchedule(perm.plannedReturn)}</strong></span>
                    </div>

                    {isLate ? (
                      <span className="inline-flex items-center gap-1 text-amber-800 font-semibold bg-amber-100/90 px-1.5 py-0.2 rounded shrink-0">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                        Telat {Math.floor(lateMinutes / 60)}j {lateMinutes % 60}m {lateFine > 0 ? `(${formatRupiah(lateFine)})` : ''}
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium shrink-0">
                        Tepat Waktu
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info ringkas */}
        <div className="p-2.5 bg-zinc-100 border-t border-zinc-200 text-center shrink-0">
          <p className="text-[10px] text-zinc-500">
            Pemeriksa: <strong>{currentUser?.name || 'Musyrif Asrama'}</strong> • Waktu langsung tercatat di log
          </p>
        </div>
      </div>
    </div>
  );
}
