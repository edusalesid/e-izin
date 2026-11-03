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
}: PermissionCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isConfirmingReturn, setIsConfirmingReturn] = useState(false);

  const isPendingWali = permission.status === 'PENDING_WALI_KELAS';
  const isApproved = permission.status === 'APPROVED_WALI_KELAS';
  const isOutside = permission.status === 'SEDANG_DI_LUAR';
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

  const waUrl = getWhatsAppUrl(
    permission.applicantPhone,
    permission.studentName,
    permission.reason
  );

  return (
    <Card className="border border-zinc-200/90 hover:border-zinc-300 bg-white p-3.5 sm:p-4 rounded-xl shadow-xs transition-colors space-y-2.5">
      {/* Top Header: Identitas Santri & Status */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
            {permission.studentName.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 truncate leading-tight">
              {permission.studentName}
            </h3>
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
              {permission.className} &bull; NIS: {permission.studentNis}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <StatusBadge status={permission.status} />
          <div className="flex items-center justify-end gap-1 mt-1">
            <span
              className={cn(
                'inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border',
                permission.category === 'PESIAR'
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : permission.category === 'KELUAR_SEBENTAR'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
              )}
            >
              {categoryLabel}
            </span>
            <span className="text-[10px] text-zinc-500 tabular-nums font-medium">
              {durationLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Row: Keperluan & Jadwal Ringkas */}
      <div className="space-y-1">
        <p className="text-xs text-zinc-800 line-clamp-2 leading-relaxed">
          <span className="font-semibold text-zinc-500">Keperluan: </span>
          {permission.reason}
        </p>

        <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 font-medium">
          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="tabular-nums">{scheduleRange}</span>
        </div>
      </div>

      {/* Info Check-out Gerbang Real-time */}
      {permission.actualDeparture && (
        <div className="rounded-lg bg-zinc-50 border border-zinc-200/70 p-2 flex items-center justify-between text-xs text-zinc-600">
          <span>
            Keluar Gerbang: <strong className="text-zinc-900">{formatDateTime(permission.actualDeparture)}</strong>
          </span>
          {permission.actualReturn ? (
            <span>
              Kembali: <strong className="text-zinc-900">{formatDateTime(permission.actualReturn)}</strong>
            </span>
          ) : (
            <Badge variant="active" className="text-[10px]">Di Luar</Badge>
          )}
        </div>
      )}

      {/* Alert Keterlambatan Real-time saat Masih di Luar */}
      {isLateNow && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-900 font-semibold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Melewati batas waktu ({formatDuration(lateMinutesNow)})</span>
          </div>
          <span className="font-bold text-amber-900 bg-white border border-amber-200 px-2 py-0.5 rounded-md tabular-nums text-[11px]">
            Denda: Rp20.000
          </span>
        </div>
      )}

      {/* Alert Keterlambatan & Status Denda */}
      {permission.lateDurationMinutes && permission.lateDurationMinutes > 0 ? (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-rose-900 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Terlambat {formatDuration(permission.lateDurationMinutes)} dari rencana kepulangan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-rose-800">Denda:</span>
              <span className="font-bold text-rose-950 font-mono text-xs bg-white px-2 py-0.5 rounded border border-rose-200">
                Rp20.000
              </span>
              {permission.lateFineStatus === 'PAID' ? (
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Lunas
                </span>
              ) : (
                <span className="bg-rose-200/80 text-rose-950 border border-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Belum Dibayar
                </span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Bagian Rincian (Expandable) */}
      {showDetails && (
        <div className="mt-2.5 pt-2.5 border-t border-zinc-100 space-y-2 text-xs animate-in fade-in-50 duration-150">
          <div className="rounded-lg bg-zinc-50 p-2.5 space-y-1.5 border border-zinc-200/60">
            <p className="text-zinc-600">
              <span className="text-zinc-500">Penjemput:</span>{' '}
              <strong className="text-zinc-900 font-medium">{escortLabel}</strong>
              {permission.escortNote && (
                <span className="text-zinc-500 italic ml-1">({permission.escortNote})</span>
              )}
            </p>
            <p className="text-zinc-600">
              <span className="text-zinc-500">Pemohon:</span>{' '}
              <strong className="text-zinc-900 font-medium">{permission.applicantName}</strong>{' '}
              <span className="text-zinc-500 font-mono text-[11px]">({permission.applicantPhone})</span>
            </p>
            {permission.approvedByName && (
              <p className="text-zinc-600">
                <span className="text-zinc-500">Disetujui oleh:</span>{' '}
                <strong className="text-emerald-800 font-semibold">{permission.approvedByName}</strong>{' '}
                <span className="text-zinc-500 text-[11px]">({formatDateTime(permission.approvedAt)})</span>
              </p>
            )}
            {permission.rejectionReason && (
              <p className="text-rose-700 font-semibold">
                Alasan Penolakan: {permission.rejectionReason}
              </p>
            )}

            <div className="pt-1">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold text-xs py-0.5"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hubungi Wali Santri via WA</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Panel Formulir Penolakan Wali Kelas */}
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
      {!rejecting && !isConfirmingReturn && (
        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
          {/* Toggle Rincian */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer"
          >
            <span>{showDetails ? 'Tutup Rincian' : 'Rincian'}</span>
            {showDetails ? (
              <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>

          {/* Aksi Khusus Berdasarkan Role */}
          <div className="flex items-center gap-1.5">
            {/* 1. Wali Kelas & Fallback Kepala Asrama / Super Admin Approval Actions */}
            {(activeRole === 'WALI_KELAS' || activeRole === 'KEPALA_ASRAMA' || activeRole === 'SUPER_ADMIN') && isPendingWali && onApprove && onReject && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejecting(true)}
                  className="h-8.5 px-3 rounded-lg border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Tolak
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onApprove(permission.id)}
                  className="h-8.5 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs cursor-pointer active:scale-95 transition-all"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Setujui
                </Button>
              </>
            )}

            {/* 2. Satpam Gerbang Check-out Action */}
            {activeRole === 'SATPAM' && isApproved && onCheckOut && (
              <Button
                type="button"
                onClick={() => onCheckOut(permission.id)}
                className="h-9 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-200" />
                <span>Konfirmasi Keluar Gerbang</span>
              </Button>
            )}

            {/* 3. Konfirmasi Kembali ke Pondok oleh Musyrif/Ustadz Manapun (Bukan Satpam) */}
            {activeRole !== 'SATPAM' && activeRole !== 'ORANG_TUA' && isOutside && onCheckIn && (
              <Button
                type="button"
                onClick={() => {
                  if (isLateNow) {
                    setIsConfirmingReturn(true);
                  } else {
                    onCheckIn(permission.id, 'UNPAID');
                  }
                }}
                className="h-9 px-3.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Konfirmasi Santri Kembali</span>
              </Button>
            )}

            {/* 4. Indikator Satpam bahwa kepulangan dicatat oleh Ustadz Asrama */}
            {activeRole === 'SATPAM' && isOutside && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Lapor kepulangan ke Musyrif Asrama</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
