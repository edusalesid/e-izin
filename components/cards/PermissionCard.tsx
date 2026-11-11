'use client';

import React, { useState, useMemo } from 'react';
import { Permission, UserRole } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { formatDateTime, formatDuration, formatRupiah, calculateLateFine } from '@/lib/utils';
import {
  Clock,
  Check,
  X,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Ban,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
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

function formatName(name: string): string {
  if (!name) return '';
  if (name === name.toUpperCase()) {
    return name
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return name;
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
      "p-3.5 sm:p-4 rounded-2xl space-y-3 transition-all border shadow-2xs",
      isCancelled ? "bg-zinc-50/70 border-zinc-200 opacity-80" : "bg-white border-zinc-200/90"
    )}>
      {/* Header Baris Pertama: Nama Santri, Metadata, Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-zinc-900 truncate tracking-tight">
            {formatName(permission.studentName)}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Kelas <strong className="font-semibold text-zinc-700">{permission.className}</strong></span>
            <span className="text-zinc-300">•</span>
            <span>NIS <span className="font-mono text-zinc-600">{permission.studentNis}</span></span>
            <span className="text-zinc-300">•</span>
            <span className={cn(
              "font-medium",
              isKeluarSebentar ? "text-amber-800" : "text-emerald-800"
            )}>
              {categoryLabel}
            </span>
          </p>
        </div>

        <StatusBadge status={permission.status} className="shrink-0" />
      </div>

      {/* Baris Kedua: Keperluan / Alasan (Tanpa Kotak Berlebih / Clean Prose) */}
      <p className="text-xs text-zinc-700 leading-relaxed font-normal">
        {permission.reason}
      </p>

      {/* Baris Ketiga: Rencana Jadwal Waktu & Durasi Menyatu */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500 pt-0.5">
        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        <span className="font-medium text-zinc-700 truncate">{scheduleRange}</span>
        <span className="text-zinc-300 shrink-0">•</span>
        <span className="text-zinc-500 font-medium shrink-0">({durationLabel})</span>
      </div>

      {/* Bagian Peringatan Keterlambatan Realtime */}
      {isLateNow && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 flex items-center justify-between text-xs text-rose-900 font-semibold">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Terlambat: {formatDuration(lateMinutesNow)}</span>
          </div>
          <span className="font-mono text-xs font-bold text-rose-950">
            Denda: {formatRupiah(estimatedFineAmount)}
          </span>
        </div>
      )}

      {/* Bagian Rincian Tambahan (Expandable) */}
      {showDetails && (
        <div className="pt-2.5 border-t border-zinc-100 space-y-2.5 text-xs text-zinc-600 animate-in fade-in-50 duration-150">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="text-zinc-400 block text-[11px]">Penjemput</span>
              <strong className="text-zinc-800 font-semibold">{escortLabel}</strong>
              {permission.escortNote && (
                <p className="text-zinc-500 text-[11px] mt-0.5 italic">{permission.escortNote}</p>
              )}
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
              <span className="text-zinc-400 block text-[11px]">Pemohon</span>
              <strong className="text-zinc-800 font-semibold">{permission.applicantName}</strong>
              <p className="text-zinc-500 text-[11px] mt-0.5 font-mono">{permission.applicantPhone}</p>
            </div>
          </div>

          {/* WhatsApp Action ke Wali Santri */}
          {permission.applicantPhone && permission.applicantPhone !== '-' && (
            <div className="pt-0.5">
              <a
                href={getWhatsAppUrl(permission.applicantPhone, permission.studentName, permission.reason)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-semibold text-xs transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>Hubungi Wali Santri via WhatsApp</span>
              </a>
            </div>
          )}

          {/* Audit Log / Approver Info */}
          <div className="text-[11px] text-zinc-400 space-y-0.5 pt-0.5">
            {permission.approvedByName && (
              <p>Disetujui oleh: <strong className="text-zinc-700 font-medium">{permission.approvedByName}</strong> ({formatDateTime(permission.approvedAt || permission.createdAt)})</p>
            )}
            {permission.rejectionReason && (
              <p className="text-rose-700 font-medium">Catatan / Alasan: {permission.rejectionReason}</p>
            )}
          </div>

          {/* Aksi Pembatalan Aman di dalam Rincian (Mencegah salah tekan tombol destruktif di kartu utama) */}
          {activeRole !== 'ORANG_TUA' && !isCancelled && (isPendingWali || isApproved || isOutside) && onCancel && (
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Izin batal digunakan?</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCancelling(true)}
                className="h-8 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5 text-rose-600" />
                <span>Batalkan Izin Santri</span>
              </Button>
            </div>
          )}
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
            className="text-xs h-9 border-rose-300 focus-visible:ring-rose-500/20 rounded-lg"
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

      {/* Panel Formulir Pembatalan Izin */}
      {cancelling && (
        <div className="mt-2.5 pt-2.5 border-t border-rose-200 bg-rose-50/50 p-3 rounded-xl space-y-2.5 animate-in fade-in-50 duration-150">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
            <Ban className="w-4 h-4 text-rose-600" />
            <span>Batalkan Izin (Anak Batal Keluar/Pulang)</span>
          </div>
          <Input
            type="text"
            placeholder="Alasan pembatalan (misal: jemputan tidak datang)..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="text-xs h-9 border-rose-300 bg-white focus-visible:ring-rose-500/20 rounded-lg"
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

      {/* Baris Tombol Aksi Bawah: 2 Zona Seimbang, Tidak Patah di Mobile */}
      {!rejecting && !cancelling && !isConfirmingReturn && (
        <div className="pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2">
          {/* Sisi Kiri: Toggle Rincian & Export PDF */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 flex items-center gap-1 h-9 px-2.5 rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <span>{showDetails ? 'Tutup' : 'Rincian'}</span>
              {showDetails ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>

            {/* Tombol Preview & Export PDF Surat Izin (Netral, tidak berebut warna primer) */}
            {(isApproved || isOutside || permission.status === 'KEMBALI_TEPAT_WAKTU' || permission.status === 'KEMBALI_TERLAMBAT') && onPreviewSurat && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onPreviewSurat(permission)}
                className="h-9 px-3 rounded-xl border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Lihat Pratinjau & Cetak Surat Izin (PDF)"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                <span>Surat PDF</span>
              </Button>
            )}
          </div>

          {/* Sisi Kanan: Aksi Operasional Utama */}
          <div className="flex items-center gap-2">
            {/* Tombol Batal Cepat (hanya ditampilkan jika tidak ada aksi utama lain di kanan) */}
            {activeRole !== 'ORANG_TUA' && !isCancelled && (isPendingWali || isApproved || isOutside) && onCancel && !isOutside && !(isPendingWali && onApprove) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCancelling(true)}
                className="h-9 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5 text-rose-600" />
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
                  className="h-9 px-3 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Tolak
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onApprove(permission.id)}
                  className="h-9 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs cursor-pointer active:scale-95 transition-all"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Setujui
                </Button>
              </>
            )}

            {/* 2. Konfirmasi Kembali ke Asrama (Satu CTA Utama yang Jelas dan Kuat) */}
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
                className="h-9 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Santri Kembali</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
