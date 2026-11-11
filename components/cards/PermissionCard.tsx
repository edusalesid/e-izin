'use client';

import React, { useState, useMemo } from 'react';
import { Permission, UserRole } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { formatDateTime, formatDateOnly, formatDuration, formatRupiah, calculateLateFine } from '@/lib/utils';
import {
  Clock,
  Check,
  X,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Ban,
  FileText,
  Printer,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PermissionCardProps {
  permission: Permission;
  activeRole: UserRole;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onCheckOut?: (id: string) => void;
  onCheckIn?: (id: string, lateFineStatus?: 'UNPAID' | 'PAID') => void;
  onPayFine?: (id: string) => void;
  onCancel?: (id: string, reason: string) => void;
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
    return remHours === 0 ? `${days} Hari` : `${days} Hari ${remHours} Jam`;
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
    `Ada informasi yang ingin kami koordinasikan langsung dengan Bapak/Ibu wali santri. Terima kasih.`
  );
  return `https://wa.me/${formattedPhone}?text=${message}`;
}

export function PermissionCard({
  permission,
  activeRole,
  onApprove,
  onReject,
  onCheckOut,
  onCheckIn,
  onCancel,
  onPreviewSurat,
}: PermissionCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isConfirmingReturn, setIsConfirmingReturn] = useState(false);

  const isPendingWali = permission.status === 'PENDING_WALI_KELAS';
  const isApproved = permission.status === 'APPROVED_WALI_KELAS';
  const isOutside = permission.status === 'SEDANG_DI_LUAR';
  const isCancelled = permission.status === 'CANCELLED';
  const isKeluarSebentar = permission.category === 'KELUAR_SEBENTAR';

  const isLateNow = isOutside && new Date() > new Date(permission.plannedReturn);
  const lateMinutesNow = isLateNow
    ? Math.round((new Date().getTime() - new Date(permission.plannedReturn).getTime()) / (1000 * 60))
    : 0;

  const estimatedFineAmount = useMemo(() => {
    return calculateLateFine(lateMinutesNow);
  }, [lateMinutesNow]);

  const categoryLabel =
    permission.category === 'PESIAR'
      ? 'Pesiar'
      : permission.category === 'KELUAR_SEBENTAR'
      ? 'Keluar Sebentar'
      : 'Pulang Menginap';

  const scheduleRange = formatScheduleRange(
    permission.plannedDeparture,
    permission.plannedReturn
  );
  const durationLabel = getEstimatedDuration(
    permission.plannedDeparture,
    permission.plannedReturn
  );

  const escortLabel =
    permission.escortType === 'ORANG_TUA'
      ? 'Orang Tua Kandung'
      : permission.escortType === 'SAUDARA'
      ? 'Saudara / Kerabat Mahram'
      : permission.escortType === 'OJEK_TRAVEL'
      ? 'Ojek / Travel Jemputan'
      : permission.escortType === 'MANDIRI'
      ? 'Mandiri (Sendiri)'
      : 'Lainnya';

  return (
    <Card className={cn(
      "p-3.5 space-y-2.5 transition-all shadow-xs border",
      isCancelled ? "bg-zinc-50/70 border-zinc-200 opacity-80" : "bg-white border-zinc-200"
    )}>
      {/* Header Baris Pertama: Nama Santri, Kategori, Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
              {permission.studentName}
            </h3>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 font-semibold border',
                isKeluarSebentar
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
              )}
            >
              {categoryLabel}
            </Badge>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Kelas: <strong className="text-zinc-700">{permission.className}</strong> &bull; NIS: <span className="font-mono">{permission.studentNis}</span>
          </p>
        </div>

        <StatusBadge status={permission.status} />
      </div>

      {/* Baris Kedua: Keperluan / Alasan */}
      <div className="rounded-lg bg-zinc-50/80 border border-zinc-100 p-2 text-xs text-zinc-800 leading-relaxed font-medium">
        <p className="line-clamp-2">{permission.reason}</p>
      </div>

      {/* Baris Ketiga: Rencana Jadwal Waktu */}
      <div className="flex items-center justify-between text-xs text-zinc-600 pt-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
          <span className="truncate font-medium">{scheduleRange}</span>
        </div>
        <span className="text-[10px] font-mono font-bold bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded border border-zinc-200 shrink-0">
          {durationLabel}
        </span>
      </div>

      {/* Bagian Peringatan Keterlambatan Realtime (Jika sedang di luar dan melewati batas) */}
      {isLateNow && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 flex items-center justify-between text-xs text-rose-800 font-semibold">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Terlambat: {formatDuration(lateMinutesNow)}</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-rose-950">
            Denda: {formatRupiah(estimatedFineAmount)}
          </span>
        </div>
      )}

      {/* Bagian Rincian Tambahan (Expandable) */}
      {showDetails && (
        <div className="pt-2 border-t border-zinc-100 space-y-2 text-xs text-zinc-600 animate-in fade-in-50 duration-150">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-100">
              <span className="text-zinc-400 block text-[10px]">Penjemput</span>
              <strong className="text-zinc-800">{escortLabel}</strong>
              {permission.escortNote && (
                <p className="text-zinc-500 text-[10px] mt-0.5 italic">{permission.escortNote}</p>
              )}
            </div>
            <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-100">
              <span className="text-zinc-400 block text-[10px]">Pemohon</span>
              <strong className="text-zinc-800">{permission.applicantName}</strong>
              <p className="text-zinc-500 text-[10px] mt-0.5 font-mono">{permission.applicantPhone}</p>
            </div>
          </div>

          {/* WhatsApp Action ke Wali Santri */}
          {permission.applicantPhone && permission.applicantPhone !== '-' && (
            <div className="pt-1">
              <a
                href={getWhatsAppUrl(permission.applicantPhone, permission.studentName, permission.reason)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                <span>Hubungi Wali Santri via WhatsApp</span>
              </a>
            </div>
          )}

          {/* Audit Log / Approver Info */}
          <div className="text-[10px] text-zinc-400 space-y-0.5 pt-1">
            {permission.approvedByName && (
              <p>Disetujui oleh: <strong className="text-zinc-700">{permission.approvedByName}</strong> ({formatDateTime(permission.approvedAt || permission.createdAt)})</p>
            )}
            {permission.rejectionReason && (
              <p className="text-rose-700 font-medium">Catatan / Alasan: {permission.rejectionReason}</p>
            )}
          </div>
        </div>
      )}

      {/* Panel Formulir Penolakan Wali Kelas / Approver */}
      {rejecting && (
        <div className="mt-2.5 pt-2.5 border-t border-zinc-100 space-y-2">
          <Input
            type="text"
            placeholder="Tuliskan alasan penolakan izin..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="text-xs h-9 border-rose-300 focus-visible:ring-rose-500/20"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRejecting(false)}
              className="text-xs h-8 px-3 rounded-lg"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (onReject) {
                  onReject(permission.id, rejectReason || 'Tidak memenuhi kriteria izin');
                  setRejecting(false);
                }
              }}
              className="text-xs h-8 px-3 rounded-lg font-bold"
            >
              Konfirmasi Tolak
            </Button>
          </div>
        </div>
      )}

      {/* Panel Formulir Pembatalan Izin (Cancel / Remove oleh Musrif/Guru manapun - Requirement 2) */}
      {cancelling && (
        <div className="mt-2.5 pt-2.5 border-t border-rose-200 bg-rose-50/50 p-2.5 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
            <Ban className="w-3.5 h-3.5 text-rose-600" />
            <span>Batalkan Izin (Anak Batal Keluar/Pulang)</span>
          </div>
          <Input
            type="text"
            placeholder="Alasan pembatalan (misal: jemputan tidak datang, batal izin)..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="text-xs h-9 border-rose-300 bg-white focus-visible:ring-rose-500/20"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelling(false)}
              className="text-xs h-8 px-3 rounded-lg border-zinc-300"
            >
              Kembali
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (onCancel) {
                  onCancel(permission.id, cancelReason || 'Santri membatalkan izin keluar asrama.');
                  setCancelling(false);
                }
              }}
              className="text-xs h-8 px-3 rounded-lg font-bold bg-rose-600 hover:bg-rose-700"
            >
              Konfirmasi Batalkan Izin
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Keterlambatan */}
      {isConfirmingReturn && (
        <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 space-y-2.5 animate-in fade-in-50 duration-150">
          <div className="flex items-start gap-2 text-xs text-amber-950 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Santri Terlambat Kembali</p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Santri kembali terlambat {formatDuration(lateMinutesNow)}. Sesuai ketentuan pondok, dikenakan denda keterlambatan sebesar <strong>{formatRupiah(estimatedFineAmount)}</strong>.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmingReturn(false)}
              className="h-8 text-xs rounded-lg border-amber-300 text-amber-900"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (onCheckIn) onCheckIn(permission.id, 'UNPAID');
                setIsConfirmingReturn(false);
              }}
              className="h-8 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white font-semibold cursor-pointer"
            >
              Denda Belum Dibayar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (onCheckIn) onCheckIn(permission.id, 'PAID');
                setIsConfirmingReturn(false);
              }}
              className="h-8 text-xs rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold cursor-pointer"
            >
              Denda Lunas (Tunai {formatRupiah(estimatedFineAmount)})
            </Button>
          </div>
        </div>
      )}

      {/* Baris Tombol Aksi Bawah */}
      {!rejecting && !cancelling && !isConfirmingReturn && (
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-1.5 flex-wrap">
          {/* Sisi Kiri: Toggle Rincian & Export PDF */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer"
            >
              <span>{showDetails ? 'Tutup' : 'Rincian'}</span>
              {showDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>

            {/* Tombol Preview & Export PDF Surat Izin (Requirement 4) */}
            {(isApproved || isOutside || permission.status === 'KEMBALI_TEPAT_WAKTU' || permission.status === 'KEMBALI_TERLAMBAT') && onPreviewSurat && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPreviewSurat(permission)}
                className="h-7 px-2 rounded-lg border-emerald-200 text-emerald-800 hover:bg-emerald-50 text-[11px] font-bold flex items-center gap-1"
                title="Lihat Pratinjau & Cetak Surat Izin (PDF)"
              >
                <FileText className="w-3 h-3 text-emerald-700" />
                <span>Surat PDF</span>
              </Button>
            )}
          </div>

          {/* Sisi Kanan: Aksi Khusus Berdasarkan Role */}
          <div className="flex items-center gap-1.5">
            {/* Tombol Batal Izin / Remove (Requirement 2: bisa dilakukan oleh semua musrif/guru) */}
            {activeRole !== 'ORANG_TUA' && !isCancelled && (isPendingWali || isApproved || isOutside) && onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCancelling(true)}
                className="h-8 px-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg flex items-center gap-1"
                title="Batalkan Izin (Anak batal keluar)"
              >
                <Ban className="w-3 h-3 text-rose-600" />
                <span>Batal Izin</span>
              </Button>
            )}

            {/* 1. Approval Actions (Wali Kelas / Kepala Asrama / Super Admin) */}
            {(activeRole === 'WALI_KELAS' || activeRole === 'KEPALA_ASRAMA' || activeRole === 'SUPER_ADMIN') && isPendingWali && onApprove && onReject && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejecting(true)}
                  className="h-8 px-2.5 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Tolak
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onApprove(permission.id)}
                  className="h-8 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs cursor-pointer active:scale-95 transition-all"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Setujui
                </Button>
              </>
            )}

            {/* 2. Konfirmasi Kembali ke Asrama oleh Musrif/Ustadz/Satpam manapun */}
            {activeRole !== 'ORANG_TUA' && isOutside && onCheckIn && (
              <Button
                type="button"
                onClick={() => {
                  if (isLateNow) {
                    setIsConfirmingReturn(true);
                  } else {
                    onCheckIn(permission.id, 'UNPAID');
                  }
                }}
                className="h-8.5 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>Santri Kembali</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
