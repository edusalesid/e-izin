'use client';

import React, { useState, useEffect } from 'react';
import { Permission, PermissionCategory, PermissionStatus, EscortType, UserRole } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/cards/StatusBadge';
import { toInputDateTime, fromInputDateTime, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Edit3,
  Save,
  X,
  Calendar,
  Clock,
  User,
  Car,
  AlertCircle,
  FileText,
  ShieldCheck,
  Banknote,
} from 'lucide-react';

interface EditPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission: Permission | null;
  onSuccess?: () => void;
  actorName?: string;
  actorRole?: UserRole;
}

export function EditPermissionModal({
  isOpen,
  onClose,
  permission,
  onSuccess,
  actorName = 'Admin Asrama',
  actorRole = 'KEPALA_ASRAMA',
}: EditPermissionModalProps) {
  const [category, setCategory] = useState<PermissionCategory>('KELUAR_SEBENTAR');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<PermissionStatus>('KEMBALI_TEPAT_WAKTU');
  const [plannedDeparture, setPlannedDeparture] = useState('');
  const [plannedReturn, setPlannedReturn] = useState('');
  const [actualDeparture, setActualDeparture] = useState('');
  const [actualReturn, setActualReturn] = useState('');
  const [escortType, setEscortType] = useState<EscortType>('ORANG_TUA');
  const [escortNote, setEscortNote] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [lateDurationMinutes, setLateDurationMinutes] = useState(0);
  const [lateFineAmount, setLateFineAmount] = useState(0);
  const [lateFineStatus, setLateFineStatus] = useState<'UNPAID' | 'PAID'>('UNPAID');
  const [approvedByName, setApprovedByName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (permission) {
      setCategory(permission.category);
      setReason(permission.reason || '');
      setStatus(permission.status);
      setPlannedDeparture(toInputDateTime(permission.plannedDeparture));
      setPlannedReturn(toInputDateTime(permission.plannedReturn));
      setActualDeparture(toInputDateTime(permission.actualDeparture));
      setActualReturn(toInputDateTime(permission.actualReturn));
      setEscortType(permission.escortType || 'ORANG_TUA');
      setEscortNote(permission.escortNote || '');
      setApplicantName(permission.applicantName || '');
      setApplicantPhone(permission.applicantPhone || '');
      setRejectionReason(permission.rejectionReason || '');
      setLateDurationMinutes(permission.lateDurationMinutes || 0);
      setLateFineAmount(permission.lateFineAmount || 0);
      setLateFineStatus(permission.lateFineStatus === 'PAID' ? 'PAID' : 'UNPAID');
      setApprovedByName(permission.approvedByName || '');
    }
  }, [permission]);

  if (!permission) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Alasan/Keperluan Wajib Diisi');
      return;
    }
    if (!plannedDeparture || !plannedReturn) {
      toast.error('Jadwal Rencana Keberangkatan & Kepulangan Wajib Diisi');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        id: permission.id,
        action: 'EDIT_DETAILS',
        isEdit: true,
        category,
        reason: reason.trim(),
        status,
        plannedDeparture: fromInputDateTime(plannedDeparture),
        plannedReturn: fromInputDateTime(plannedReturn),
        actualDeparture: actualDeparture ? fromInputDateTime(actualDeparture) : null,
        actualReturn: actualReturn ? fromInputDateTime(actualReturn) : null,
        escortType,
        escortNote: escortNote.trim() || null,
        applicantName: applicantName.trim() || permission.applicantName,
        applicantPhone: applicantPhone.trim() || permission.applicantPhone,
        rejectionReason: rejectionReason.trim() || null,
        lateDurationMinutes: Number(lateDurationMinutes) || 0,
        lateFineAmount: Number(lateFineAmount) || 0,
        lateFineStatus: status === 'KEMBALI_TERLAMBAT' || lateDurationMinutes > 0 ? lateFineStatus : null,
        approvedByName: approvedByName.trim() || null,
        actorName,
        actorRole,
        note: `Data perizinan diperbarui oleh ${actorName} (${actorRole}) melalui panel Arsip Perizinan.`,
      };

      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal menyimpan perubahan perizinan.');
      }

      toast.success('Data Perizinan Berhasil Diperbarui', {
        description: `Perubahan data izin santri ${permission.studentName} tersimpan dengan aman.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Save permission edit failed:', err);
      toast.error('Gagal Memperbarui Izin', {
        description: err.message || 'Terjadi kesalahan sistem saat memperbarui izin.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white">
        <DialogHeader className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Edit3 className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-zinc-900">
                Edit Data Perizinan Santri
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Ubah rincian, status, jadwal, atau catatan perizinan santri secara fleksibel.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Info Banner Santri (Read-only Header) */}
        <div className="px-5 py-3 bg-zinc-100/70 border-b border-zinc-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase tracking-wider font-semibold">
              Santri Terkait
            </span>
            <div className="font-bold text-zinc-900 text-sm">{permission.studentName}</div>
            <div className="text-zinc-600 text-[11px]">
              Kelas {permission.className} &bull; NIS: <span className="font-mono">{permission.studentNis}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-zinc-500 font-semibold">Status Saat Ini:</span>
            <StatusBadge status={permission.status} />
          </div>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Baris 1: Kategori & Status Perizinan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                Kategori Perizinan <span className="text-rose-500">*</span>
              </Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PermissionCategory)}
                className="w-full h-9 rounded-xl border border-zinc-300 bg-white px-3 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="KELUAR_SEBENTAR">Keluar Sebentar (Tidak Menginap)</option>
                <option value="PULANG_MENGINAP">Pulang Menginap ke Rumah</option>
                <option value="PESIAR">Pesiar Terjadwal</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                Status Perizinan <span className="text-rose-500">*</span>
              </Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PermissionStatus)}
                className="w-full h-9 rounded-xl border border-zinc-300 bg-white px-3 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="PENDING_WALI_KELAS">Menunggu Persetujuan (Pending)</option>
                <option value="APPROVED_WALI_KELAS">Disetujui Wali Kelas / Pimpinan</option>
                <option value="SEDANG_DI_LUAR">Sedang di Luar / Pulang (Aktif)</option>
                <option value="KEMBALI_TEPAT_WAKTU">Kembali Tepat Waktu (Selesai)</option>
                <option value="KEMBALI_TERLAMBAT">Kembali Terlambat (Kena Denda)</option>
                <option value="REJECTED">Ditolak</option>
                <option value="CANCELLED">Dibatalkan</option>
              </select>
            </div>
          </div>

          {/* Baris 2: Keperluan / Alasan Izin */}
          <div>
            <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
              Keperluan / Alasan Izin <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tuliskan alasan atau keperluan izin santri..."
              className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-xs focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Baris 3: Jadwal Rencana (Berangkat & Kembali) */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-3">
            <h4 className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>Jadwal Rencana Perizinan</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-zinc-600 mb-1 block">
                  Rencana Berangkat <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={plannedDeparture}
                  onChange={(e) => setPlannedDeparture(e.target.value)}
                  className="h-9 bg-white text-xs"
                />
              </div>

              <div>
                <Label className="text-[11px] font-medium text-zinc-600 mb-1 block">
                  Rencana Kembali <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  value={plannedReturn}
                  onChange={(e) => setPlannedReturn(e.target.value)}
                  className="h-9 bg-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Baris 4: Realisasi Gerbang (Check-out & Check-in Riil) */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 space-y-3">
            <h4 className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-700" />
              <span>Realisasi Waktu Gerbang (Satpam)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] font-medium text-zinc-600 mb-1 block">
                  Realisasi Keluar Gerbang (Check-out)
                </Label>
                <Input
                  type="datetime-local"
                  value={actualDeparture}
                  onChange={(e) => setActualDeparture(e.target.value)}
                  className="h-9 bg-white text-xs"
                />
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  Kosongkan jika santri belum keluar gerbang.
                </span>
              </div>

              <div>
                <Label className="text-[11px] font-medium text-zinc-600 mb-1 block">
                  Realisasi Kembali Asrama (Check-in)
                </Label>
                <Input
                  type="datetime-local"
                  value={actualReturn}
                  onChange={(e) => setActualReturn(e.target.value)}
                  className="h-9 bg-white text-xs"
                />
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  Kosongkan jika santri masih berada di luar asrama.
                </span>
              </div>
            </div>
          </div>

          {/* Baris 5: Data Penjemput & Pemohon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                Pihak Penjemput
              </Label>
              <select
                value={escortType}
                onChange={(e) => setEscortType(e.target.value as EscortType)}
                className="w-full h-9 rounded-xl border border-zinc-300 bg-white px-3 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none mb-2"
              >
                <option value="ORANG_TUA">Orang Tua / Wali Sendiri</option>
                <option value="MANDIRI">Mandiri (Tanpa Penjemput)</option>
                <option value="OJEK_TRAVEL">Ojek Online / Travel Resmi</option>
                <option value="SAUDARA">Keluarga / Saudara Dekat</option>
                <option value="LAINNYA">Pihak Lainnya</option>
              </select>
              <Input
                type="text"
                value={escortNote}
                onChange={(e) => setEscortNote(e.target.value)}
                placeholder="Catatan penjemput (misal: nama paman, plat mobil)..."
                className="h-9 bg-white text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                Nama & No. WhatsApp Pemohon
              </Label>
              <Input
                type="text"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Nama pemohon..."
                className="h-9 bg-white text-xs mb-2"
              />
              <Input
                type="text"
                value={applicantPhone}
                onChange={(e) => setApplicantPhone(e.target.value)}
                placeholder="No. WhatsApp (08xxxxxx)..."
                className="h-9 bg-white text-xs font-mono"
              />
            </div>
          </div>

          {/* Baris 6: Pengaturan Keterlambatan & Denda (Jika Terlambat) */}
          {(status === 'KEMBALI_TERLAMBAT' || lateDurationMinutes > 0) && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-rose-700" />
                <span>Pengaturan Denda Keterlambatan</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px] font-medium text-rose-900 mb-1 block">
                    Menit Terlambat
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={lateDurationMinutes}
                    onChange={(e) => setLateDurationMinutes(Number(e.target.value))}
                    className="h-9 bg-white text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-medium text-rose-900 mb-1 block">
                    Nominal Denda (Rp)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    value={lateFineAmount}
                    onChange={(e) => setLateFineAmount(Number(e.target.value))}
                    className="h-9 bg-white text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-[11px] font-medium text-rose-900 mb-1 block">
                    Status Denda
                  </Label>
                  <select
                    value={lateFineStatus}
                    onChange={(e) => setLateFineStatus(e.target.value as 'UNPAID' | 'PAID')}
                    className="w-full h-9 rounded-xl border border-rose-300 bg-white px-3 text-xs font-bold focus:ring-2 focus:ring-rose-400 focus:outline-none"
                  >
                    <option value="UNPAID">Belum Dibayar</option>
                    <option value="PAID">Lunas (Terkonfirmasi)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Baris 7: Pejabat Penyetuju & Catatan / Alasan Penolakan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                Nama Pejabat Penyetuju
              </Label>
              <Input
                type="text"
                value={approvedByName}
                onChange={(e) => setApprovedByName(e.target.value)}
                placeholder="Contoh: Ustadz Ahmad Fauzi (Wali Kelas)..."
                className="h-9 bg-white text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-zinc-700 mb-1.5 block">
                Catatan / Alasan Penolakan
              </Label>
              <Input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Alasan penolakan / pembatalan jika ada..."
                className="h-9 bg-white text-xs"
              />
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="pt-3 border-t border-zinc-200 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
              className="h-9 px-4 rounded-xl border-zinc-300 text-zinc-700 font-semibold text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
