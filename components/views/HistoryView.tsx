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
  Check,
  Clock,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  SlidersHorizontal,
  Banknote,
  Edit2,
  Trash2,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { EditPermissionModal } from '@/components/modals/EditPermissionModal';
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
  canEditDelete?: boolean;
  actorName?: string;
  onPreviewSurat?: (permission: Permission) => void;
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
  canEditDelete,
  actorName = 'Admin Asrama',
  onPreviewSurat,
}: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | PermissionCategory>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [payingId, setPayingId] = useState<string | null>(null);

  const activeExtraFilterCount =
    (classFilter !== 'ALL' ? 1 : 0) + (categoryFilter !== 'ALL' ? 1 : 0);

  // State Fitur Edit & Hapus Arsip Perizinan
  const [editPermission, setEditPermission] = useState<Permission | null>(null);
  const [deleteConfirmPermission, setDeleteConfirmPermission] = useState<Permission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = canEditDelete ?? (activeRole === 'KEPALA_ASRAMA' || activeRole === 'SUPER_ADMIN');

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

  // Handler Hapus Arsip Perizinan Permanen
  const handleDeletePermission = async () => {
    if (!deleteConfirmPermission) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/permissions?id=${deleteConfirmPermission.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deleteConfirmPermission.id,
          actorName: actorName || 'Admin Asrama',
          actorRole: activeRole,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Gagal menghapus arsip perizinan.');
      }

      toast.success('Arsip Izin Berhasil Dihapus', {
        description: `Data perizinan ananda ${deleteConfirmPermission.studentName} telah dihapus dari sistem.`,
      });

      setDeleteConfirmPermission(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Delete permission failed:', err);
      toast.error('Gagal Menghapus Izin', {
        description: err.message || 'Terjadi kesalahan sistem saat menghapus arsip perizinan.',
      });
    } finally {
      setIsDeleting(false);
    }
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

  const activeStatusGroupsCount = [
    stats.approved,
    stats.outside,
    stats.onTime,
    stats.late,
    stats.rejected,
  ].filter((c) => c > 0).length;
  const showStatusStrip = activeStatusGroupsCount > 1 || statusFilter !== 'ALL';

  return (
    <div className="space-y-4 pb-8">
      {/* 1. Header Riwayat */}
      <div className="flex items-start justify-between gap-3 px-0.5 pt-0.5">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-zinc-600 mt-0.5">
            {description}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 bg-zinc-100 text-zinc-700 tabular-nums">
          {permissions.length} Arsip
        </span>
      </div>

      {/* Banner Rekapitulasi Denda jika Ada yang Terlambat & Belum Lunas */}
      {stats.late > 0 && unpaidLateCount > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Banknote className="w-4 h-4 text-amber-800" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-amber-950 text-xs sm:text-sm truncate tabular-nums">
                Total Tagihan Denda: {formatRupiah(unpaidLateCount * 20000)}
              </p>
              <p className="text-xs text-amber-900">
                <strong className="text-rose-800 font-semibold tabular-nums">{unpaidLateCount} santri belum melunasi</strong>
              </p>
            </div>
          </div>

          <Badge
            variant="destructive"
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 tabular-nums"
          >
            {unpaidLateCount} Belum Lunas
          </Badge>
        </div>
      )}

      {/* 2. Pencarian & Filter Terpadu */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Cari santri, NIS, pemohon, atau alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 bg-white border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-500 rounded-xl focus-visible:ring-emerald-700/20 focus-visible:border-emerald-700 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Hapus pencarian"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            aria-expanded={showFilters}
            className={cn(
              'h-11 px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 shrink-0 transition-colors cursor-pointer',
              showFilters || activeExtraFilterCount > 0
                ? 'bg-emerald-700 border-emerald-700 text-white'
                : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filter</span>
            {activeExtraFilterCount > 0 && (
              <span className="bg-white text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums">
                {activeExtraFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Panel Filter Lanjutan (Kelas & Jenis Izin) */}
        {showFilters && (
          <div className="rounded-2xl bg-white border border-zinc-200 p-3.5 space-y-3 shadow-2xs animate-in fade-in-50 duration-150">
            {uniqueClasses.length > 1 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Kelas Santri
                </label>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 text-xs sm:text-sm rounded-xl text-zinc-800 font-medium focus:outline-emerald-700 cursor-pointer"
                >
                  <option value="ALL">Semua Kelas ({uniqueClasses.length})</option>
                  {uniqueClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700">Jenis Izin</span>
                {activeExtraFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setClassFilter('ALL');
                      setCategoryFilter('ALL');
                    }}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { value: 'ALL', label: 'Semua Jenis' },
                  { value: 'KELUAR_SEBENTAR', label: 'Keluar Sebentar' },
                  { value: 'PULANG_MENGINAP', label: 'Pulang Menginap' },
                  { value: 'PESIAR', label: 'Pesiar' },
                ].map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategoryFilter(cat.value as 'ALL' | PermissionCategory)}
                    className={cn(
                      'min-h-[36px] px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer',
                      categoryFilter === cat.value
                        ? 'bg-emerald-700 text-white'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200/70'
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filter Status Tunggal (Hanya tampil jika ada >1 kelompok status atau sedang aktif) */}
        {showStatusStrip && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={cn(
                'min-h-[36px] px-3 rounded-xl font-medium transition-colors shrink-0 cursor-pointer text-xs tabular-nums',
                statusFilter === 'ALL'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
              )}
            >
              Semua ({stats.total})
            </button>

            {stats.approved > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('APPROVED_WALI_KELAS')}
                className={cn(
                  'min-h-[36px] px-3 rounded-xl font-medium transition-colors shrink-0 cursor-pointer text-xs tabular-nums',
                  statusFilter === 'APPROVED_WALI_KELAS'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                )}
              >
                Disetujui ({stats.approved})
              </button>
            )}

            {stats.outside > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('SEDANG_DI_LUAR')}
                className={cn(
                  'min-h-[36px] px-3 rounded-xl font-medium transition-colors shrink-0 cursor-pointer text-xs tabular-nums',
                  statusFilter === 'SEDANG_DI_LUAR'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                )}
              >
                Di Luar ({stats.outside})
              </button>
            )}

            {stats.onTime > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('KEMBALI_TEPAT_WAKTU')}
                className={cn(
                  'min-h-[36px] px-3 rounded-xl font-medium transition-colors shrink-0 cursor-pointer text-xs tabular-nums',
                  statusFilter === 'KEMBALI_TEPAT_WAKTU'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                )}
              >
                Tepat Waktu ({stats.onTime})
              </button>
            )}

            {stats.late > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('KEMBALI_TERLAMBAT')}
                className={cn(
                  'min-h-[36px] px-3 rounded-xl font-medium transition-colors shrink-0 cursor-pointer text-xs tabular-nums',
                  statusFilter === 'KEMBALI_TERLAMBAT'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                )}
              >
                Terlambat ({stats.late})
              </button>
            )}

            {stats.rejected > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('REJECTED')}
                className={cn(
                  'min-h-[36px] px-3 rounded-xl font-medium transition-colors shrink-0 cursor-pointer text-xs tabular-nums',
                  statusFilter === 'REJECTED'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                )}
              >
                Ditolak ({stats.rejected})
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Daftar Kartu Riwayat */}
      {isLoading ? (
        <div className="space-y-3">
          <PermissionCardSkeleton />
          <PermissionCardSkeleton />
          <PermissionCardSkeleton />
        </div>
      ) : filteredList.length === 0 ? (
        <Card className="border border-zinc-200 bg-white p-8 text-center rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-500">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900">
              {searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || classFilter !== 'ALL'
                ? 'Tidak Ada Data yang Cocok'
                : emptyTitle}
            </h3>
            <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto leading-relaxed">
              {searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL' || classFilter !== 'ALL'
                ? 'Sesuaikan kata kunci pencarian atau atur ulang filter yang aktif.'
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
              className="min-h-[40px] px-4 text-xs font-semibold rounded-xl border-zinc-200 text-zinc-800 cursor-pointer"
            >
              Reset Semua Filter
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
            const categoryLabel =
              perm.category === 'PESIAR'
                ? 'Pesiar'
                : perm.category === 'KELUAR_SEBENTAR'
                ? 'Keluar Sebentar'
                : 'Pulang Menginap';

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
                className="border border-zinc-200 hover:border-zinc-300 bg-white p-4 rounded-2xl shadow-2xs transition-colors space-y-3"
              >
                {/* 1. Status & Jenis Izin */}
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={perm.status} className="shrink-0" />
                  <span className="text-xs font-medium text-zinc-600 tabular-nums text-right">
                    {categoryLabel} · {durationLabel}
                  </span>
                </div>

                {/* 2. Identitas Santri (Full Width tanpa Truncate Prematur) */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                    {perm.studentName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-zinc-900 leading-snug tracking-tight">
                      {perm.studentName}
                    </h3>
                    <p className="text-xs text-zinc-600 mt-0.5 tabular-nums">
                      <span className="font-semibold text-zinc-800">{perm.className}</span>
                      {' · '}
                      <span>NIS {perm.studentNis}</span>
                    </p>
                  </div>
                </div>

                {/* 2. Keperluan */}
                <p className="text-xs sm:text-[13px] text-zinc-800 line-clamp-2 leading-relaxed">
                  <span className="font-medium text-zinc-600">Keperluan: </span>
                  <span className="font-medium text-zinc-900">{perm.reason}</span>
                </p>

                {/* 3. Metadata Ringkas (Flat Hierarchy, Tanpa Box-in-a-Box) */}
                <div className="pt-2.5 border-t border-zinc-100 space-y-2 text-xs">
                  {/* Jadwal & Penjemput */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-zinc-700 tabular-nums">
                    <div>
                      <span className="text-zinc-600">Jadwal: </span>
                      <span className="font-medium text-zinc-900">{scheduleRange}</span>
                    </div>
                    <div>
                      <span className="text-zinc-600">Penjemput: </span>
                      <span className="font-medium text-zinc-900">{escortLabel}</span>
                    </div>
                  </div>

                  {/* Pemohon & Penyetuju */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-zinc-700">
                    <div className="min-w-0 truncate">
                      <span className="text-zinc-600">Pemohon: </span>
                      <span className="font-medium text-zinc-900">{perm.applicantName}</span>
                      <span className="text-zinc-600">
                        {' '}({perm.applicantType === 'ORANG_TUA' ? 'Wali Santri' : 'Ustadz'})
                      </span>
                    </div>

                    {perm.approvedByName ? (
                      <div className="flex items-center gap-1.5 text-emerald-800 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="truncate tabular-nums">
                          <span className="text-zinc-600">Disetujui: </span>
                          <strong className="font-semibold text-zinc-900">{perm.approvedByName}</strong>
                          {perm.approvedAt && (
                            <span className="text-zinc-600 font-normal"> · {formatDateTime(perm.approvedAt)}</span>
                          )}
                        </span>
                      </div>
                    ) : perm.status === 'REJECTED' ? (
                      <div className="flex items-center gap-1.5 text-rose-800 font-medium">
                        <XCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                        <span>
                          Ditolak{perm.approvedByName ? ` oleh ${perm.approvedByName}` : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-800 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Menunggu Persetujuan</span>
                      </div>
                    )}
                  </div>

                  {/* Log Gerbang (Strip Lembut Tanpa Border Menyerupai Input) */}
                  {(perm.actualDeparture || perm.actualReturn) && (
                    <div className="flex items-center gap-2 text-xs text-zinc-700 bg-zinc-100/80 px-3 py-2 rounded-xl tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                      <span className="leading-snug">
                        <span className="font-semibold text-zinc-900">Gerbang: </span>
                        Keluar{' '}
                        <span className="font-medium text-zinc-900">
                          {perm.actualDeparture ? formatDateTime(perm.actualDeparture) : '-'}
                        </span>
                        {perm.satpamDepartureName && (
                          <span className="text-zinc-600"> ({perm.satpamDepartureName})</span>
                        )}
                        {perm.actualReturn && (
                          <>
                            {' → '}Kembali{' '}
                            <span className="font-medium text-zinc-900">
                              {formatDateTime(perm.actualReturn)}
                            </span>
                            {perm.satpamReturnName && (
                              <span className="text-zinc-600"> ({perm.satpamReturnName})</span>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Peringatan Keterlambatan jika Terlambat */}
                {isLateViolation && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-rose-900 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                        <span className="tabular-nums">
                          Terlambat {formatDuration(perm.lateDurationMinutes || 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 tabular-nums">
                        <span className="text-xs font-medium text-rose-800">Denda:</span>
                        <span className="font-bold text-rose-950 text-xs">
                          {formatRupiah(perm.lateFineAmount || 20000)}
                        </span>
                        {perm.lateFineStatus === 'PAID' ? (
                          <span className="bg-emerald-100 text-emerald-900 text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            Lunas
                          </span>
                        ) : (
                          <span className="bg-rose-200/80 text-rose-950 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                            Belum Dibayar
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tombol Pelunasan Denda jika belum lunas */}
                    {perm.lateFineStatus !== 'PAID' &&
                      (activeRole === 'WALI_KELAS' || activeRole === 'KEPALA_ASRAMA' || activeRole === 'SUPER_ADMIN' || activeRole === 'SATPAM') && (
                        <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between gap-2">
                          <span className="text-xs text-rose-900">Pelunasan denda kas pondok:</span>
                          <Button
                            type="button"
                            size="sm"
                            disabled={payingId === perm.id}
                            onClick={() => handleMarkFinePaid(perm.id)}
                            className="min-h-[36px] px-3 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            {payingId === perm.id ? 'Memproses...' : 'Tandai Lunas'}
                          </Button>
                        </div>
                      )}
                  </div>
                )}

                {/* Catatan Alasan Ditolak */}
                {Boolean(perm.rejectionReason) && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-950">
                    <span className="text-rose-800 font-bold block mb-0.5">Alasan Penolakan:</span>
                    <span>{perm.rejectionReason}</span>
                  </div>
                )}

                {/* Footer Bar: 1 Baris Ringkas (Aksi Utama + Toggle Rincian >= 40px) */}
                <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
                  {onPreviewSurat &&
                  perm.status !== 'REJECTED' &&
                  perm.status !== 'PENDING_WALI_KELAS' &&
                  perm.status !== 'CANCELLED' ? (
                    <button
                      type="button"
                      onClick={() => onPreviewSurat(perm)}
                      className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 font-semibold text-xs transition-colors cursor-pointer"
                      title="Lihat Pratinjau & Cetak Surat Izin (PDF)"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Surat Izin</span>
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-600 tabular-nums">
                      {formatDateOnly(perm.createdAt)}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleDetails(perm.id)}
                    aria-expanded={isExpanded}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-semibold text-zinc-800 hover:text-zinc-900 bg-zinc-100/80 hover:bg-zinc-200/70 active:scale-[0.98] rounded-xl transition-all cursor-pointer ml-auto"
                  >
                    <span>{isExpanded ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-zinc-600" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-zinc-600" />
                    )}
                  </button>
                </div>

                {/* Accordion Rincian Lengkap & Manajemen Admin */}
                {isExpanded && (
                  <div className="pt-2.5 border-t border-zinc-100 text-xs animate-in fade-in-50 duration-150">
                    <div className="rounded-xl bg-zinc-50/90 p-3.5 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-zinc-600 block">Tanggal Pengajuan</span>
                          <strong className="text-zinc-900 font-semibold tabular-nums">
                            {formatDateOnly(perm.createdAt)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-zinc-600 block">Pihak Penjemput</span>
                          <strong className="text-zinc-900 font-semibold">{escortLabel}</strong>
                          {perm.escortNote && (
                            <span className="text-zinc-600 italic block mt-0.5">({perm.escortNote})</span>
                          )}
                        </div>
                        <div>
                          <span className="text-zinc-600 block">Pemohon Izin</span>
                          <strong className="text-zinc-900 font-semibold">{perm.applicantName}</strong>
                          {perm.applicantPhone && perm.applicantPhone !== '-' && (
                            <span className="text-zinc-600 block tabular-nums">{perm.applicantPhone}</span>
                          )}
                        </div>
                        <div>
                          <span className="text-zinc-600 block">Kelas</span>
                          <strong className="text-zinc-900 font-semibold">{perm.className}</strong>
                        </div>
                        {perm.approvedByName && (
                          <div>
                            <span className="text-zinc-600 block">Pejabat Penyetuju</span>
                            <strong className="text-emerald-900 font-semibold">{perm.approvedByName}</strong>
                            {perm.approvedAt && (
                              <span className="text-zinc-600 block tabular-nums">
                                {formatDateTime(perm.approvedAt)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {((activeRole !== 'ORANG_TUA' && perm.applicantPhone && perm.applicantPhone !== '-') || canManage) && (
                        <div className="pt-2.5 border-t border-zinc-200/80 flex items-center justify-between gap-2 flex-wrap">
                          {activeRole !== 'ORANG_TUA' && perm.applicantPhone && perm.applicantPhone !== '-' && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 min-h-[40px] text-emerald-900 hover:text-emerald-950 font-semibold text-xs py-1.5 px-3.5 rounded-xl bg-emerald-100/70 hover:bg-emerald-100 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Hubungi Wali</span>
                            </a>
                          )}

                          {canManage && (
                            <div className="flex items-center gap-2 ml-auto">
                              <button
                                type="button"
                                onClick={() => setEditPermission(perm)}
                                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100 font-semibold text-xs transition-colors cursor-pointer"
                                title="Edit rincian data perizinan santri ini"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-zinc-600" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmPermission(perm)}
                                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-xs transition-colors cursor-pointer"
                                title="Hapus data izin santri ini dari arsip"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          )}
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

      {/* Modal Edit Data Perizinan Santri */}
      <EditPermissionModal
        isOpen={!!editPermission}
        onClose={() => setEditPermission(null)}
        permission={editPermission}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
        actorName={actorName}
        actorRole={activeRole}
      />

      {/* Dialog Konfirmasi Hapus Data Perizinan */}
      <Dialog
        open={!!deleteConfirmPermission}
        onOpenChange={(open) => !open && !isDeleting && setDeleteConfirmPermission(null)}
      >
        <DialogContent className="max-w-md p-5 bg-white rounded-2xl">
          <DialogHeader>
            <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>
            <DialogTitle className="text-base font-bold text-zinc-900">
              Hapus Arsip Izin Santri?
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-600 leading-relaxed mt-1">
              Apakah Anda yakin ingin menghapus data perizinan santri{' '}
              <strong className="text-zinc-900 font-bold">{deleteConfirmPermission?.studentName}</strong>{' '}
              (NIS: {deleteConfirmPermission?.studentNis}, Kelas {deleteConfirmPermission?.className})?
              <br />
              <span className="text-rose-600 font-medium mt-1.5 block">
                Tindakan ini akan menghapus arsip izin dan seluruh catatan riwayat log gerbang secara permanen dari sistem.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteConfirmPermission(null)}
              className="min-h-[40px] px-4 rounded-xl border-zinc-300 text-zinc-700 font-semibold text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              onClick={handleDeletePermission}
              className="min-h-[40px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Arsip'}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
