'use client';

import React, { useState, useMemo } from 'react';
import { Permission, UserRole, PermissionStatus, PermissionCategory } from '@/lib/types';
import { StatusBadge } from '../cards/StatusBadge';
import { formatDateTime, formatDateOnly, formatDuration, formatRupiah } from '@/lib/utils';
import {
  Search,
  X,
  History,
  CheckCircle2,
  CheckCheck,
  Check,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Shield,
  Home,
  User,
  Calendar,
  LogOut,
  SlidersHorizontal,
  Banknote,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PermissionCardSkeleton } from '@/components/skeletons/AppSkeletons';

interface HistoryViewProps {
  permissions: Permission[];
  title?: string;
  description?: string;
  activeRole: UserRole;
  emptyTitle?: string;
  emptySubtitle?: string;
  onRefresh?: () => void;
  onPayFine?: (id: string) => Promise<void> | void;
  isLoading?: boolean;
}

function formatScheduleRange(startIso?: string, endIso?: string): string {
  if (!startIso || !endIso) return '-';
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

    const startDateStr = new Intl.DateTimeFormat('id-ID', dateOptions).format(start);
    const startTimeStr = new Intl.DateTimeFormat('id-ID', timeOptions).format(start).replace(/\./g, ':');
    const endTimeStr = new Intl.DateTimeFormat('id-ID', timeOptions).format(end).replace(/\./g, ':');

    const isSameDay = start.toDateString() === end.toDateString();
    if (isSameDay) {
      return `${startDateStr}, ${startTimeStr} - ${endTimeStr} WIB`;
    }

    const endDateStr = new Intl.DateTimeFormat('id-ID', dateOptions).format(end);
    return `${startDateStr} ${startTimeStr} s/d ${endDateStr} ${endTimeStr} WIB`;
  } catch {
    return '-';
  }
}

function getEstimatedDuration(startIso?: string, endIso?: string): string {
  if (!startIso || !endIso) return '-';
  try {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const diffMs = end - start;
    if (isNaN(diffMs) || diffMs <= 0) return 'Waktu tidak valid';
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (hours < 24) return `${hours} Jam`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (remHours === 0) return `${days} Hari`;
    return `${days} Hari ${remHours} Jam`;
  } catch {
    return '-';
  }
}

function getWhatsAppUrl(phone: string, studentName: string, reason: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const message = encodeURIComponent(
    `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
    `Terkait perizinan ananda *${studentName}* di SMAIT Ihsanul Fikri Pabelan:\n"${reason}"\n\n` +
    `Ada hal yang ingin kami koordinasikan lebih lanjut. Terima kasih.`
  );
  return `https://wa.me/${formattedPhone}?text=${message}`;
}

export function HistoryView({
  permissions,
  title = 'Riwayat Perizinan Kelas',
  description = 'Arsip seluruh keputusan perizinan dan kepulangan santri.',
  activeRole,
  emptyTitle = 'Belum Ada Arsip Perizinan',
  emptySubtitle = 'Data perizinan santri yang telah disetujui, ditolak, atau selesai akan tersimpan rapi di sini.',
  onRefresh,
  onPayFine,
  isLoading = false,
}: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | PermissionCategory>('ALL');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [payingId, setPayingId] = useState<string | null>(null);

  // Daftar kelas unik dari seluruh riwayat
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    permissions.forEach((p) => p.className && set.add(p.className));
    return Array.from(set).sort();
  }, [permissions]);

  const toggleDetails = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Handler Pelunasan Denda Keterlambatan
  const handleMarkFinePaid = async (id: string) => {
    try {
      setPayingId(id);
      if (onPayFine) {
        await onPayFine(id);
      } else {
        const res = await fetch('/api/permissions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            status: 'PAY_FINE',
            lateFineStatus: 'PAID',
            actorName: 'Petugas / Wali Kelas',
            actorRole: activeRole,
          }),
        });
        if (!res.ok) {
          throw new Error('Gagal memperbarui status pelunasan denda');
        }
        if (onRefresh) onRefresh();
      }
      toast.success('Denda Keterlambatan Lunas', {
        description: 'Status denda santri berhasil ditandai Lunas ke kas pondok.',
      });
    } catch (err: any) {
      console.error('Gagal melunasi denda:', err);
      toast.error('Gagal Melunasi Denda', {
        description: err?.message || 'Terjadi kesalahan sistem saat memperbarui status denda.',
      });
    } finally {
      setPayingId(null);
    }
  };

  // Ringkasan Statistik Riwayat Komprehensif
  const stats = useMemo(() => {
    const total = permissions.length;
    const approved = permissions.filter((p) => p.status === 'APPROVED_WALI_KELAS').length;
    const outside = permissions.filter((p) => p.status === 'SEDANG_DI_LUAR').length;
    const onTime = permissions.filter((p) => p.status === 'KEMBALI_TEPAT_WAKTU').length;
    const late = permissions.filter((p) => p.status === 'KEMBALI_TERLAMBAT').length;
    const rejected = permissions.filter((p) => p.status === 'REJECTED').length;

    return { total, approved, outside, onTime, late, rejected };
  }, [permissions]);

  // Hitung Santri Terlambat yang Belum Lunas Denda Rp 20.000
  const unpaidLateCount = useMemo(() => {
    return permissions.filter(
      (p) =>
        (p.status === 'KEMBALI_TERLAMBAT' || (p.lateDurationMinutes && p.lateDurationMinutes > 0)) &&
        p.lateFineStatus !== 'PAID'
    ).length;
  }, [permissions]);

  // Filter Data (diurutkan terbaru ke terlama)
  const filteredList = useMemo(() => {
    const list = permissions.filter((p) => {
      // 1. Kategori filter
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) {
        return false;
      }

      // 2. Status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }

      // 3. Class filter
      if (classFilter !== 'ALL' && p.className !== classFilter) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.studentName.toLowerCase().includes(q);
        const matchNis = p.studentNis.includes(q);
        const matchClass = p.className.toLowerCase().includes(q);
        const matchReason = p.reason.toLowerCase().includes(q);
        const matchApplicant = p.applicantName.toLowerCase().includes(q);
        const matchApprover = p.approvedByName ? p.approvedByName.toLowerCase().includes(q) : false;

        if (!matchName && !matchNis && !matchClass && !matchReason && !matchApplicant && !matchApprover) {
          return false;
        }
      }

      return true;
    });

    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [permissions, categoryFilter, statusFilter, classFilter, searchQuery]);

  return (
    <div className="space-y-3.5 pb-8">
      {/* 1. Header Riwayat Ramping & Bersih (Anti-Slop) */}
      <div className="flex items-center justify-between px-0.5 pt-0.5">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-zinc-500">
            {description}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="text-xs font-semibold px-2.5 py-0.5 shrink-0 bg-zinc-100 text-zinc-700 border border-zinc-200"
        >
          {permissions.length} Arsip
        </Badge>
      </div>

      {/* Banner Rekapitulasi Denda jika Ada yang Terlambat & Belum Lunas */}
      {stats.late > 0 && unpaidLateCount > 0 && (
        <div className="rounded-xl bg-amber-50/90 border border-amber-300/80 p-3 flex items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
              <Banknote className="w-4 h-4 text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-amber-950 text-xs truncate">
                Total Tagihan Denda: {formatRupiah(unpaidLateCount * 20000)}
              </p>
              <p className="text-[11px] text-amber-800">
                <strong className="text-rose-700 font-bold">{unpaidLateCount} santri belum melunasi</strong>
              </p>
            </div>
          </div>

          <Badge
            variant="destructive"
            className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
          >
            {unpaidLateCount} Belum Lunas
          </Badge>
        </div>
      )}

      {/* 2. Filter & Pencarian Cepat */}
      <div className="space-y-2">
        {/* Search & Class Filter */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari santri, NIS, pemohon, penyetuju, atau alasan izin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 h-10 bg-white border-zinc-200 text-xs sm:text-sm rounded-xl focus-visible:ring-emerald-700/20 focus-visible:border-emerald-700 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {uniqueClasses.length > 0 && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="h-10 px-3 bg-white border border-zinc-200 text-xs sm:text-sm rounded-xl text-zinc-700 font-medium focus:outline-emerald-700 shadow-2xs shrink-0 cursor-pointer"
            >
              <option value="ALL">Semua Kelas ({uniqueClasses.length})</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Status Filter Chips (Hanya tampilkan kategori yang ada datanya, tanpa angka 0) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
              statusFilter === 'ALL'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
            )}
          >
            Semua ({stats.total})
          </button>

          {stats.approved > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('APPROVED_WALI_KELAS')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs flex items-center gap-1.5',
                statusFilter === 'APPROVED_WALI_KELAS'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100/80 border border-emerald-200/70'
              )}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Disetujui ({stats.approved})</span>
            </button>
          )}

          {stats.outside > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('SEDANG_DI_LUAR')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs flex items-center gap-1.5',
                statusFilter === 'SEDANG_DI_LUAR'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-900 hover:bg-blue-100/80 border border-blue-200/70'
              )}
            >
              <LogOut className="w-3 h-3" />
              <span>Di Luar ({stats.outside})</span>
            </button>
          )}

          {stats.onTime > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('KEMBALI_TEPAT_WAKTU')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs flex items-center gap-1.5',
                statusFilter === 'KEMBALI_TEPAT_WAKTU'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100/80 border border-emerald-200/70'
              )}
            >
              <CheckCheck className="w-3 h-3" />
              <span>Tepat Waktu ({stats.onTime})</span>
            </button>
          )}

          {stats.late > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('KEMBALI_TERLAMBAT')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs flex items-center gap-1.5',
                statusFilter === 'KEMBALI_TERLAMBAT'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 hover:bg-amber-100/80 border border-amber-200/70'
              )}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Terlambat ({stats.late})</span>
            </button>
          )}

          {stats.rejected > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('REJECTED')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs flex items-center gap-1.5',
                statusFilter === 'REJECTED'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-900 hover:bg-rose-100/80 border border-rose-200/70'
              )}
            >
              <XCircle className="w-3 h-3" />
              <span>Ditolak ({stats.rejected})</span>
            </button>
          )}
        </div>

        {/* Kategori Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setCategoryFilter('ALL')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 cursor-pointer',
              categoryFilter === 'ALL'
                ? 'bg-zinc-800 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            )}
          >
            Semua Jenis Izin
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('KELUAR_SEBENTAR')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 cursor-pointer',
              categoryFilter === 'KELUAR_SEBENTAR'
                ? 'bg-amber-600 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            )}
          >
            Keluar Sebentar
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('PULANG_MENGINAP')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 cursor-pointer',
              categoryFilter === 'PULANG_MENGINAP'
                ? 'bg-emerald-700 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            )}
          >
            Pulang Menginap
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('PESIAR')}
            className={cn(
              'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 cursor-pointer',
              categoryFilter === 'PESIAR'
                ? 'bg-teal-700 text-white'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            )}
          >
            Pesiar
          </button>
        </div>
      </div>

      {/* 3. Daftar Kartu Riwayat */}
      {isLoading ? (
        <div className="space-y-3">
          <PermissionCardSkeleton />
          <PermissionCardSkeleton />
          <PermissionCardSkeleton />
        </div>
      ) : filteredList.length === 0 ? (
        <Card className="border border-zinc-200/80 bg-white p-8 text-center rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center mx-auto text-zinc-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900">
              {searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                ? 'Tidak Ada Data yang Cocok'
                : emptyTitle}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
              {searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                ? 'Silakan sesuaikan kata kunci pencarian atau ganti filter status di atas.'
                : emptySubtitle}
            </p>
          </div>
          {(searchQuery || classFilter !== 'ALL' || statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setClassFilter('ALL');
                setStatusFilter('ALL');
                setCategoryFilter('ALL');
              }}
              className="text-xs rounded-xl border-zinc-200 cursor-pointer"
            >
              Reset Pilihan Filter
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredList.map((perm) => {
            const isExpanded = !!expandedIds[perm.id];
            const durationLabel = getEstimatedDuration(perm.plannedDeparture, perm.plannedReturn);
            const scheduleRange = formatScheduleRange(perm.plannedDeparture, perm.plannedReturn);
            const waUrl = getWhatsAppUrl(perm.applicantPhone, perm.studentName, perm.reason);
            const isLateViolation = Boolean(
              perm.status === 'KEMBALI_TERLAMBAT' ||
              (typeof perm.lateDurationMinutes === 'number' && perm.lateDurationMinutes > 0)
            );

            const escortLabel =
              perm.escortType === 'ORANG_TUA'
                ? 'Orang Tua Kandung'
                : perm.escortType === 'SAUDARA'
                ? 'Saudara / Kerabat Mahram'
                : perm.escortType === 'OJEK_TRAVEL'
                ? 'Ojek / Travel Jemputan'
                : perm.escortType === 'MANDIRI'
                ? 'Mandiri (Sendiri)'
                : 'Lainnya';

            return (
              <Card
                key={perm.id}
                className="border border-zinc-200/90 hover:border-zinc-300 bg-white p-3 sm:p-3.5 rounded-xl shadow-2xs transition-colors space-y-2.5"
              >
                {/* 1. Header Ringkas: Avatar, Nama, Status, Kategori */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                      {perm.studentName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-zinc-900 truncate leading-tight">
                          {perm.studentName}
                        </h3>
                        <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-1.5 py-0.2 rounded shrink-0">
                          {perm.className}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                          NIS: {perm.studentNis}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <StatusBadge status={perm.status} />
                    <span className="text-[10px] font-semibold text-zinc-500">
                      {perm.category === 'PESIAR'
                        ? 'Pesiar'
                        : perm.category === 'KELUAR_SEBENTAR'
                        ? 'Keluar Sebentar'
                        : 'Pulang Menginap'}
                      {' • '}{durationLabel}
                    </span>
                  </div>
                </div>

                {/* 2. Keperluan (Ringkas & Terbaca) */}
                <p className="text-xs text-zinc-700 line-clamp-2 leading-relaxed">
                  <span className="font-semibold text-zinc-500">Keperluan: </span>
                  {perm.reason}
                </p>

                {/* 3. Detail Aktor: Yang Mengajukan & Yang Menyetujui (Transparan & Lengkap) */}
                <div className="rounded-lg bg-zinc-50 p-2.5 border border-zinc-200/70 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-zinc-700">
                      <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>
                        Diajukan: <strong className="text-zinc-900 font-semibold">{perm.applicantName}</strong>
                        <span className="text-zinc-500 text-[10px]"> ({perm.applicantType === 'ORANG_TUA' ? 'Wali Santri' : 'Ustadz / Pembina'})</span>
                      </span>
                    </div>

                    {perm.approvedByName ? (
                      <div className="flex items-center gap-1 text-emerald-800 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Disetujui: <strong className="font-bold text-emerald-950">{perm.approvedByName}</strong>
                          {perm.approvedAt && (
                            <span className="text-zinc-500 text-[10px] font-normal"> ({formatDateTime(perm.approvedAt)})</span>
                          )}
                        </span>
                      </div>
                    ) : perm.status === 'REJECTED' ? (
                      <div className="flex items-center gap-1 text-rose-800 font-medium">
                        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>
                          Ditolak{perm.approvedByName ? ` oleh ${perm.approvedByName}` : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-800 text-[10px] font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Menunggu Persetujuan</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Baris Jadwal Resmi & Penjemput */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 text-[11px] text-zinc-600 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>Jadwal: {scheduleRange}</span>
                  </div>

                  <span className="text-[10px] text-zinc-500">
                    Penjemput: <strong className="font-medium text-zinc-700">{escortLabel}</strong>
                  </span>
                </div>

                {/* Baris Ringkas Jam Gerbang jika ada */}
                {(perm.actualDeparture || perm.actualReturn) && (
                  <div className="flex items-center gap-2 text-[10px] text-zinc-600 bg-zinc-50 px-2 py-1 rounded-md border border-zinc-200/70">
                    <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>
                      Gerbang: Keluar {perm.actualDeparture ? formatDateTime(perm.actualDeparture) : '-'}{perm.satpamDepartureName ? ` (${perm.satpamDepartureName})` : ''}
                      {perm.actualReturn ? ` → Kembali: ${formatDateTime(perm.actualReturn)}${perm.satpamReturnName ? ` (${perm.satpamReturnName})` : ''}` : ''}
                    </span>
                  </div>
                )}

                {/* Peringatan Keterlambatan jika Terlambat */}
                {isLateViolation && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-rose-900 font-semibold text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Terlambat {formatDuration(perm.lateDurationMinutes || 0)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold text-rose-800">Denda:</span>
                        <span className="font-bold text-rose-950 font-mono text-xs bg-white px-1.5 py-0.2 rounded border border-rose-200">
                          {formatRupiah(perm.lateFineAmount || 20000)}
                        </span>
                        {perm.lateFineStatus === 'PAID' ? (
                          <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                            Lunas
                          </span>
                        ) : (
                          <span className="bg-rose-200/80 text-rose-950 border border-rose-300 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                            Belum Dibayar
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tombol Pelunasan Denda jika belum lunas */}
                    {perm.lateFineStatus !== 'PAID' &&
                      (activeRole === 'WALI_KELAS' || activeRole === 'KEPALA_ASRAMA' || activeRole === 'SUPER_ADMIN' || activeRole === 'SATPAM') && (
                        <div className="pt-1.5 border-t border-rose-200/60 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-rose-800">Pelunasan denda kas pondok:</span>
                          <Button
                            type="button"
                            size="sm"
                            disabled={payingId === perm.id}
                            onClick={() => handleMarkFinePaid(perm.id)}
                            className="h-6 px-2 text-[10px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md shadow-2xs cursor-pointer"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            {payingId === perm.id ? 'Memproses...' : 'Tandai Lunas'}
                          </Button>
                        </div>
                      )}
                  </div>
                )}

                {/* Catatan Alasan Ditolak */}
                {Boolean(perm.rejectionReason) && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-950">
                    <span className="text-rose-700 font-bold block text-[11px] mb-0.5">Alasan Penolakan:</span>
                    <span>{perm.rejectionReason}</span>
                  </div>
                )}

                {/* Footer Bar: Tanggal Pengajuan & Toggle Rincian */}
                <div className="pt-1.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-zinc-400">
                    Diajukan: {formatDateOnly(perm.createdAt)}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleDetails(perm.id)}
                    className="text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 flex items-center gap-1 cursor-pointer py-0.5 px-1.5 rounded hover:bg-zinc-100 transition-colors"
                  >
                    <span>{isExpanded ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-zinc-500" />
                    )}
                  </button>
                </div>

                {/* Accordion Rincian Lengkap */}
                {isExpanded && (
                  <div className="pt-2 border-t border-zinc-100 text-xs animate-in fade-in-50 duration-150">
                    <div className="rounded-lg bg-zinc-50 p-2.5 space-y-1.5 border border-zinc-200/80 text-[11px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <span className="text-zinc-500 block">Pihak Penjemput:</span>
                          <strong className="text-zinc-900 font-medium">{escortLabel}</strong>
                          {perm.escortNote && (
                            <span className="text-zinc-500 italic block mt-0.5">({perm.escortNote})</span>
                          )}
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Pemohon Izin:</span>
                          <strong className="text-zinc-900 font-medium">{perm.applicantName}</strong>{' '}
                          {perm.applicantPhone && (
                            <span className="text-zinc-500 font-mono">({perm.applicantPhone})</span>
                          )}
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Kelas:</span>
                          <strong className="text-zinc-900 font-medium">{perm.className}</strong>
                        </div>
                        {perm.approvedByName && (
                          <div>
                            <span className="text-zinc-500 block">Pejabat Penyetuju:</span>
                            <strong className="text-emerald-900 font-semibold">{perm.approvedByName}</strong>
                            {perm.approvedAt && (
                              <span className="text-zinc-500 text-[10px] block font-mono">
                                ({formatDateTime(perm.approvedAt)})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {activeRole !== 'ORANG_TUA' && perm.applicantPhone && perm.applicantPhone !== '-' && (
                        <div className="pt-1.5 border-t border-zinc-200">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-900 font-bold text-xs py-1 px-2 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-700" />
                            <span>Hubungi Wali via WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
