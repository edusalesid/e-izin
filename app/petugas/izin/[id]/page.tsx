'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useStaff } from '@/hooks/useStaff';
import { StatusBadge } from '@/components/cards/StatusBadge';
import { formatDateTime, formatDuration } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MapPin,
  Car,
  FileText,
  Check,
  X,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  Phone,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PermissionDetailSkeleton } from '@/components/skeletons/AppSkeletons';

export default function PermissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { session, permissions, refreshData } = useStaff();

  const [permission, setPermission] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Rejection State
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/permissions?id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setPermission(data.permission);
        if (data.logs) setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to load detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'APPROVED_WALI_KELAS',
          actorName: session?.user?.name || 'Wali Kelas',
          actorRole: 'WALI_KELAS',
          actorId: session?.user?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal menyetujui izin');
      }

      toast.success('Izin Berhasil Disetujui', {
        description: `Izin untuk ${permission?.studentName || 'santri'} berhasil disetujui. Siap keluar gerbang.`,
      });

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#047857', '#10b981', '#34d399'],
        });
      } catch {}
      await refreshData();
      await fetchDetail();
    } catch (err: any) {
      console.error('Approve error:', err);
      toast.error('Gagal Menyetujui Izin', {
        description: err?.message || 'Terjadi kesalahan sistem saat menyetujui izin.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'REJECTED',
          actorName: session?.user?.name || 'Wali Kelas',
          actorRole: 'WALI_KELAS',
          actorId: session?.user?.id,
          rejectionReason: rejectReason.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal menolak izin');
      }

      toast.error('Izin Berhasil Ditolak', {
        description: `Izin santri ditolak dengan alasan: ${rejectReason.trim()}`,
      });

      await refreshData();
      await fetchDetail();
      setIsRejecting(false);
    } catch (err: any) {
      console.error('Reject error:', err);
      toast.error('Gagal Menolak Izin', {
        description: err?.message || 'Terjadi kesalahan sistem saat menolak izin.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'SEDANG_DI_LUAR',
          actorName: session?.user?.name || 'Pak Bambang (Pos Gerbang)',
          actorRole: 'SATPAM',
          actorId: session?.user?.id,
          actualDeparture: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal verifikasi check-out gerbang');
      }

      toast.success('Check-out Gerbang Berhasil', {
        description: `Santri ${permission?.studentName || ''} telah keluar gerbang pos keamanan.`,
      });

      await refreshData();
      await fetchDetail();
    } catch (err: any) {
      console.error('Check-out error:', err);
      toast.error('Gagal Check-Out Gerbang', {
        description: err?.message || 'Terjadi kesalahan sistem saat verifikasi keluar.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckIn = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'KEMBALI_TEPAT_WAKTU',
          actorName: session?.user?.name || 'Pak Bambang (Pos Gerbang)',
          actorRole: 'SATPAM',
          actorId: session?.user?.id,
          actualReturn: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal verifikasi kepulangan santri');
      }

      const resJson = await res.json().catch(() => ({}));
      const updated = resJson?.permission;
      const isLate = updated?.status === 'KEMBALI_TERLAMBAT';

      if (isLate) {
        toast.warning('Santri Kembali (Terlambat)', {
          description: `Santri ${permission?.studentName || ''} tercatat terlambat (${updated?.lateDurationMinutes || 0} menit).`,
        });
      } else {
        toast.success('Santri Berhasil Kembali', {
          description: `Santri ${permission?.studentName || ''} berhasil dicek kembali ke pondok.`,
        });
      }

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#047857', '#059669', '#10b981'],
        });
      } catch {}
      await refreshData();
      await fetchDetail();
    } catch (err: any) {
      console.error('Check-in error:', err);
      toast.error('Gagal Verifikasi Check-In', {
        description: err?.message || 'Terjadi kesalahan sistem saat verifikasi kepulangan.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PermissionDetailSkeleton />;
  }

  if (!permission) {
    return (
      <div className="space-y-3 pt-4 text-center">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <h2 className="text-sm font-bold text-zinc-900">Izin Tidak Ditemukan</h2>
        <p className="text-xs text-zinc-500">Data izin mungkin telah dihapus atau tidak valid.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 text-white px-4 py-2 text-xs font-bold mt-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Antrean</span>
        </Link>
      </div>
    );
  }

  const role = session?.role;
  const isPendingWali = permission.status === 'PENDING_WALI_KELAS';
  const isApproved = permission.status === 'APPROVED_WALI_KELAS';
  const isOutside = permission.status === 'SEDANG_DI_LUAR';

  return (
    <div className="space-y-4">
      {/* Top Back navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-emerald-800 transition cursor-pointer min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Pengajuan</span>
        </Link>
        <span className="text-[10px] font-mono text-zinc-400">
          ID: {permission.id.substring(0, 14)}
        </span>
      </div>

      {/* Main Student Info Card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                permission.category === 'KELUAR_SEBENTAR'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-emerald-100 text-emerald-900'
              )}
            >
              {permission.category === 'KELUAR_SEBENTAR' ? 'Keluar Sebentar' : 'Pulang Menginap'}
            </span>
            <h1 className="text-base font-black text-zinc-900 mt-1.5">
              {permission.studentName}
            </h1>
            <p className="text-xs text-zinc-500">
              NIS: <strong className="text-zinc-800">{permission.studentNis}</strong> &bull; Kelas: <strong className="text-zinc-800">{permission.className}</strong>
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Asrama: {permission.dormitory}
            </p>
          </div>

          <StatusBadge status={permission.status} />
        </div>

        {/* Keperluan / Alasan */}
        <div className="mt-3.5 pt-3 border-t border-zinc-100">
          <label className="text-[11px] font-bold text-zinc-800 flex items-center gap-1.5 mb-1">
            <FileText className="w-3.5 h-3.5 text-emerald-700" />
            Alasan / Keperluan Izin
          </label>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 text-xs text-zinc-800 leading-relaxed font-medium">
            {permission.reason}
          </div>
        </div>
      </div>

      {/* Jadwal & Realtime Waktu */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-700" />
          Rencana Waktu & Pos Gerbang
        </h2>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-2.5">
            <span className="text-[10px] text-zinc-500 block mb-0.5">Rencana Keluar</span>
            <strong className="text-zinc-900 text-xs block">{formatDateTime(permission.plannedDeparture)}</strong>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-2.5">
            <span className="text-[10px] text-zinc-500 block mb-0.5">Rencana Kembali</span>
            <strong className="text-zinc-900 text-xs block">{formatDateTime(permission.plannedReturn)}</strong>
          </div>
        </div>

        {/* Realtime Gerbang Information */}
        {(permission.actualDeparture || permission.actualReturn) && (
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600">Realisasi Keluar Gerbang:</span>
              <strong className="text-zinc-900">{formatDateTime(permission.actualDeparture)}</strong>
            </div>
            {permission.actualReturn && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Realisasi Kembali ke Pondok:</span>
                <strong className="text-zinc-900">{formatDateTime(permission.actualReturn)}</strong>
              </div>
            )}
          </div>
        )}

        {permission.lateDurationMinutes && permission.lateDurationMinutes > 0 ? (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-center gap-2 text-xs text-rose-800 font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Terlambat {formatDuration(permission.lateDurationMinutes)} dari rencana kepulangan.</span>
          </div>
        ) : null}
      </div>

      {/* Penjemput & Pemohon */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-2.5">
        <h2 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
          <Car className="w-4 h-4 text-emerald-700" />
          Pihak Penjemput & Pemohon
        </h2>

        <div className="space-y-1.5 text-xs text-zinc-700">
          <p className="flex items-center justify-between">
            <span className="text-zinc-500">Penjemput:</span>
            <strong className="text-zinc-900">{permission.escortType}</strong>
          </p>
          {permission.escortNote && (
            <p className="flex items-center justify-between">
              <span className="text-zinc-500">Keterangan:</span>
              <span className="text-zinc-900 font-medium">{permission.escortNote}</span>
            </p>
          )}
          <p className="flex items-center justify-between pt-1 border-t border-zinc-100">
            <span className="text-zinc-500">Diajukan Oleh:</span>
            <strong className="text-zinc-900">{permission.applicantName} ({permission.applicantType})</strong>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-zinc-500">Kontak:</span>
            <span className="text-zinc-900 font-mono font-medium">{permission.applicantPhone}</span>
          </p>
          {permission.approvedByName && (
            <p className="flex items-center justify-between pt-1 border-t border-zinc-100">
              <span className="text-zinc-500">Disetujui Oleh:</span>
              <strong className="text-emerald-800">{permission.approvedByName}</strong>
            </p>
          )}
          {permission.rejectionReason && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-rose-800 text-xs">
              <strong>Alasan Penolakan:</strong> {permission.rejectionReason}
            </div>
          )}
        </div>
      </div>

      {/* ROLE ACTION SECTION */}
      {/* 1. Wali Kelas Approval Actions */}
      {role === 'WALI_KELAS' && isPendingWali && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-zinc-900">Keputusan Wali Kelas</h2>
          <p className="text-[11px] text-zinc-600">
            Silakan tinjau permohonan izin ini sebelum diteruskan ke pos gerbang satpam.
          </p>

          {isRejecting ? (
            <div className="space-y-2.5">
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Tuliskan alasan mengapa izin ini ditolak..."
                className="w-full rounded-xl border border-rose-300 bg-white p-3 text-xs focus:ring-2 focus:ring-rose-200"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="rounded-xl border border-zinc-300 bg-white py-2.5 text-xs font-semibold text-zinc-700 min-h-[44px]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || !rejectReason.trim()}
                  onClick={handleReject}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white min-h-[44px] cursor-pointer disabled:opacity-50"
                >
                  Konfirmasi Tolak
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setIsRejecting(true)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 py-3 text-xs font-bold text-zinc-700 transition active:scale-95 min-h-[48px] cursor-pointer"
              >
                <X className="w-4 h-4 text-zinc-500" />
                <span>Tolak Izin</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleApprove}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 py-3 text-xs font-bold text-white shadow-md shadow-emerald-800/20 transition active:scale-95 min-h-[48px] cursor-pointer"
              >
                <Check className="w-4 h-4 text-emerald-100" />
                <span>Setujui Izin</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Satpam Gate Actions */}
      {role === 'SATPAM' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-zinc-900">Aksi Pos Gerbang Satpam</h2>

          {isApproved && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCheckOut}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 py-3 px-4 text-xs font-bold text-white shadow-md shadow-emerald-800/20 active:scale-[0.98] transition cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-100" />
              <span>Izinkan Keluar (Check-out Gerbang)</span>
            </button>
          )}

          {isOutside && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCheckIn}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 py-3 px-4 text-xs font-bold text-white shadow-md shadow-emerald-800/20 active:scale-[0.98] transition cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-100" />
              <span>Konfirmasi Kembali (Check-in Gerbang)</span>
            </button>
          )}

          {!isApproved && !isOutside && (
            <p className="text-xs text-zinc-600">
              Izin ini berstatus <strong className="text-zinc-900">{permission.status}</strong> dan tidak memerlukan tindakan gerbang saat ini.
            </p>
          )}
        </div>
      )}

      {/* Audit Log Timeline */}
      {logs.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <h2 className="text-xs font-bold text-zinc-900 mb-3">Catatan Riwayat Aktivitas</h2>
          <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
            {logs.map((log) => (
              <div key={log.id} className="relative flex items-start gap-3 text-xs">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 z-10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-zinc-900">{log.action}</p>
                  <p className="text-[11px] text-zinc-600">{log.note || '-'}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    Oleh: {log.actorName} ({log.actorRole}) &bull; {formatDateTime(log.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
