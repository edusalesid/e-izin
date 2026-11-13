'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStaff } from '@/hooks/useStaff';
import { StatusBadge } from '@/components/cards/StatusBadge';
import { SuratIzinPreviewModal } from '@/components/modals/SuratIzinPreviewModal';
import { formatDateTime, formatDuration, isPermissionOutside } from '@/lib/utils';
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
  Ban,
  Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PermissionDetailSkeleton } from '@/components/skeletons/AppSkeletons';
import { Button } from '@/components/ui/button';

export default function PermissionDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const { session, refreshData } = useStaff();

  const [permission, setPermission] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Rejection State
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Cancellation State (Requirement 2)
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Preview / Export PDF Modal (Requirement 4)
  const [isPreviewSuratOpen, setIsPreviewSuratOpen] = useState(false);

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
          actorName: session?.user?.name || 'Wali Kelas / Super Admin',
          actorRole: session?.role || 'WALI_KELAS',
          actorId: session?.user?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal menyetujui izin');
      }

      const resData = await res.json().catch(() => ({}));
      const updatedPerm = resData?.permission || permission;
      const isOutNow = updatedPerm?.status === 'SEDANG_DI_LUAR';

      toast.success('Izin Berhasil Disetujui', {
        description: isOutNow
          ? `Izin untuk ${permission?.studentName || 'santri'} disetujui. Santri tercatat sudah keluar asrama.`
          : `Izin untuk ${permission?.studentName || 'santri'} disetujui. Santri siap keluar sesuai jadwal rencana keberangkatan.`,
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
      setIsPreviewSuratOpen(true);
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
    if (!rejectReason.trim()) {
      toast.error('Alasan Penolakan Wajib Diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'REJECTED',
          actorName: session?.user?.name || 'Wali Kelas / Super Admin',
          actorRole: session?.role || 'WALI_KELAS',
          actorId: session?.user?.id,
          rejectionReason: rejectReason.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal menolak izin');
      }

      toast.error('Izin Ditolak', {
        description: `Izin untuk ${permission?.studentName || 'santri'} telah ditolak.`,
      });

      setIsRejecting(false);
      await refreshData();
      await fetchDetail();
    } catch (err: any) {
      console.error('Reject error:', err);
      toast.error('Gagal Menolak Izin', {
        description: err?.message || 'Terjadi kesalahan sistem saat menolak izin.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pembatalan Izin oleh Guru / Musrif manapun (Requirement 2)
  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'CANCELLED',
          actorName: session?.user?.name || 'Petugas Asrama',
          actorRole: session?.role || 'USTADZ_UMUM',
          actorId: session?.user?.id,
          cancelReason: cancelReason.trim() || 'Santri menyatakan batal izin.',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal membatalkan izin');
      }

      toast.success('Izin Berhasil Dibatalkan', {
        description: `Izin untuk ${permission?.studentName} berhasil dibatalkan. Laporan otomatis terkirim ke Super Admin.`,
      });

      setIsCancelling(false);
      await refreshData();
      await fetchDetail();
    } catch (err: any) {
      console.error('Cancel error:', err);
      toast.error('Gagal Membatalkan Izin', {
        description: err?.message || 'Terjadi kesalahan sistem saat membatalkan izin.',
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
          actorName: session?.user?.name || 'Musrif Asrama',
          actorRole: session?.role || 'USTADZ_UMUM',
          actorId: session?.user?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal verifikasi kepulangan santri');
      }

      toast.success('Santri Berhasil Kembali', {
        description: `Santri ${permission?.studentName || ''} berhasil diverifikasi kembali ke asrama.`,
      });

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
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    );
  }

  const role = session?.role;
  const isPendingWali = permission.status === 'PENDING_WALI_KELAS';
  const isApproved = permission.status === 'APPROVED_WALI_KELAS';
  const isOutside = isPermissionOutside(permission);
  const isCancelled = permission.status === 'CANCELLED';

  return (
    <div className="space-y-4">
      {/* Top Back navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 hover:text-emerald-800 transition cursor-pointer min-h-[36px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Antrean</span>
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

        {/* Action Button: Export PDF Surat Izin (Requirement 4) */}
        {(isApproved || isOutside || permission.status === 'KEMBALI_TEPAT_WAKTU' || permission.status === 'KEMBALI_TERLAMBAT') && (
          <div className="mt-3 pt-3 border-t border-zinc-100">
            <Button
              type="button"
              onClick={() => setIsPreviewSuratOpen(true)}
              className="w-full h-10 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Pratinjau & Export PDF Surat Izin</span>
            </Button>
          </div>
        )}
      </div>

      {/* Jadwal & Realtime Waktu */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-700" />
          Rencana Waktu & Status Keberadaan
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

        {/* Realtime Status Keluar Asrama */}
        {isOutside ? (
          <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3 text-xs space-y-1 text-purple-950 font-medium">
            <div className="flex items-center gap-1.5 font-bold text-purple-900">
              <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
              <span>Santri Sedang Berada di Luar Asrama</span>
            </div>
            <p className="text-[11px] text-purple-800 pl-5.5">
              Santri aktif tercatat berada di luar pondok sejak {formatDateTime(permission.actualDeparture || permission.plannedDeparture)}.
            </p>
          </div>
        ) : isApproved ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs space-y-1 text-emerald-950 font-medium">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Izin Telah Disetujui (Menunggu Jadwal Keluar)</span>
            </div>
            <p className="text-[11px] text-emerald-800 pl-5.5">
              Santri saat ini masih berada di asrama. Santri dihitung keluar sesuai rencana: {formatDateTime(permission.plannedDeparture)}.
            </p>
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
              <strong>Catatan:</strong> {permission.rejectionReason}
            </div>
          )}
        </div>
      </div>

      {/* ROLE ACTION SECTION */}
      {/* 1. Approval Actions (Wali Kelas / Kepala Asrama / Super Admin) */}
      {(role === 'WALI_KELAS' || role === 'SUPER_ADMIN' || role === 'KEPALA_ASRAMA') && isPendingWali && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-zinc-900">Keputusan Persetujuan Izin</h2>
          <p className="text-[11px] text-zinc-600">
            Setelah disetujui, santri dihitung keluar sesuai jadwal rencana keberangkatan dan surat izin resmi langsung dapat diekspor ke PDF.
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

      {/* 2. Tombol Cancel / Batal Izin untuk Semua Musrif / Guru (Requirement 2) */}
      {role !== 'ORANG_TUA' && !isCancelled && (isPendingWali || isApproved || isOutside) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-rose-600" />
                <span>Pembatalan Izin Santri</span>
              </h2>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                Jika santri batal keluar/pulang dan dijumpai di asrama/sekolah, batalkan izin di sini. Super Admin akan menerima laporan detail.
              </p>
            </div>
          </div>

          {isCancelling ? (
            <div className="space-y-2.5 pt-1">
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Tuliskan alasan pembatalan (misal: jemputan tidak datang, anak berubah pikiran)..."
                className="w-full rounded-xl border border-rose-300 bg-white p-3 text-xs focus:ring-2 focus:ring-rose-200"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsCancelling(false)}
                  className="rounded-xl border border-zinc-300 bg-white py-2.5 text-xs font-semibold text-zinc-700 min-h-[40px]"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCancel}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white min-h-[40px] cursor-pointer"
                >
                  Konfirmasi Batalkan
                </button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCancelling(true)}
              className="w-full h-10 rounded-xl border-rose-300 text-rose-700 hover:bg-rose-100/60 font-bold text-xs flex items-center justify-center gap-2"
            >
              <Ban className="w-4 h-4" />
              <span>Batalkan Izin Santri (Anak Batal Keluar)</span>
            </Button>
          )}
        </div>
      )}

      {/* 3. Konfirmasi Santri Kembali ke Asrama (Musrif / Guru / Satpam manapun) */}
      {role !== 'ORANG_TUA' && isOutside && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs space-y-2">
          <h2 className="text-xs font-bold text-zinc-900">Konfirmasi Santri Kembali ke Asrama</h2>
          <p className="text-[11px] text-zinc-600">
            Dapat dilakukan oleh musrif, guru, atau satpam yang menjumpai santri tiba di asrama.
          </p>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleCheckIn}
            className="w-full min-h-[46px] rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Konfirmasi Santri Telah Kembali ke Asrama</span>
          </Button>
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

      {/* Preview Modal Surat Izin */}
      <SuratIzinPreviewModal
        isOpen={isPreviewSuratOpen}
        onClose={() => setIsPreviewSuratOpen(false)}
        permission={permission}
      />
    </div>
  );
}
