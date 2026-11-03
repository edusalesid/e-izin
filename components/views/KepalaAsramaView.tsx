'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Student, Permission, UserAccount, LateFineSettings } from '@/lib/types';
import { PermissionCard } from '../cards/PermissionCard';
import { MasterDataView } from './MasterDataView';
import { HistoryView } from './HistoryView';
import { PesiarView } from './PesiarView';
import {
  Activity,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Users,
  CheckSquare,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Calendar,
  AlertCircle,
  FileText,
  MessageCircle,
  Shield,
  Home,
  Settings2,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { TabKey } from '../BottomNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatRupiah, DEFAULT_FINE_SETTINGS } from '@/lib/utils';
import { toast } from 'sonner';

interface KepalaAsramaViewProps {
  activeTab: TabKey;
  currentUser: UserAccount;
  students: Student[];
  permissions: Permission[];
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
  onCheckIn?: (id: string, lateFineStatus?: 'UNPAID' | 'PAID') => void;
  onRefresh: () => void;
  onStudentsUpdated: () => void;
  onTabChange?: (tab: TabKey) => void;
  isUploadModalOpen?: boolean;
  setIsUploadModalOpen?: (open: boolean) => void;
}

const QUICK_REJECTION_REASONS = [
  "Waktu izin berbenturan dengan agenda ibadah / kegiatan wajib asrama",
  "Penjemput belum tercatat sebagai mahram atau wali resmi santri",
  "Jadwal perpulangan belum memasuki waktu libur ma'had yang ditentukan",
  "Mohon konfirmasi langsung ke pengasuhan asrama via WhatsApp atau telepon",
];

function getEstimatedDuration(startIso?: string, endIso?: string): string {
  if (!startIso || !endIso) return '-';
  try {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const diffMs = end - start;
    if (isNaN(diffMs) || diffMs <= 0) return 'Waktu tidak valid';
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (hours < 24) {
      return `${hours} Jam`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (remHours === 0) {
      return `${days} Hari`;
    }
    return `${days} Hari ${remHours} Jam`;
  } catch {
    return '-';
  }
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

function getWhatsAppUrl(phone: string, studentName: string, reason: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const message = encodeURIComponent(
    `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
    `Saya Kepala Asrama dari ananda *${studentName}* di SMAIT Ihsanul Fikri Pabelan.\n` +
    `Terkait permohonan izin:\n"${reason}"\n\n` +
    `Ada hal yang ingin kami konfirmasikan terlebih dahulu. Terima kasih.`
  );
  return `https://wa.me/${formattedPhone}?text=${message}`;
}

export function KepalaAsramaView({
  activeTab,
  currentUser,
  students,
  permissions,
  onApprove,
  onReject,
  onCheckIn,
  onRefresh,
  onStudentsUpdated,
  onTabChange,
  isUploadModalOpen,
  setIsUploadModalOpen,
}: KepalaAsramaViewProps) {
  // Fine / Denda Settings State
  const [fineSettings, setFineSettings] = useState<LateFineSettings>(DEFAULT_FINE_SETTINGS);
  const [isSavingFine, setIsSavingFine] = useState(false);
  const [fineSaveSuccess, setFineSaveSuccess] = useState(false);
  const [fineSaveError, setFineSaveError] = useState<string | null>(null);
  const [isFineSettingsOpen, setIsFineSettingsOpen] = useState(false);

  useEffect(() => {
    async function loadFineSettings() {
      try {
        const res = await fetch('/api/settings?key=late_fine_settings');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setFineSettings(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load fine settings:', err);
      }
    }
    loadFineSettings();
  }, []);

  const handleSaveFineSettings = async () => {
    setIsSavingFine(true);
    setFineSaveSuccess(false);
    setFineSaveError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'late_fine_settings',
          value: fineSettings,
        }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan aturan denda');
      setFineSaveSuccess(true);
      toast.success('Aturan Denda Berhasil Disimpan', {
        description: `Mode: ${fineSettings.mode === 'PER_JAM' ? 'Per Jam' : 'Flat'}, toleransi ${fineSettings.gracePeriodMinutes} menit.`,
      });
      setTimeout(() => setFineSaveSuccess(false), 3500);
      onRefresh();
    } catch (err: any) {
      const msg = err.message || 'Gagal menyimpan aturan denda';
      setFineSaveError(msg);
      toast.error('Gagal Menyimpan Aturan Denda', {
        description: msg,
      });
    } finally {
      setIsSavingFine(false);
    }
  };

  // Antrean Persetujuan Asrama
  const pendingList = useMemo(
    () => permissions.filter((p) => p.status === 'PENDING_WALI_KELAS'),
    [permissions]
  );

  const currentlyOutside = useMemo(
    () => permissions.filter((p) => p.status === 'SEDANG_DI_LUAR'),
    [permissions]
  );

  const latePermissions = useMemo(() => {
    const now = new Date();
    return permissions.filter(
      (p) =>
        p.status === 'KEMBALI_TERLAMBAT' ||
        (p.status === 'SEDANG_DI_LUAR' && new Date(p.plannedReturn) < now)
    );
  }, [permissions]);

  // Filter & Search State di antrean persetujuan
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'KELUAR_SEBENTAR' | 'PULANG_MENGINAP'>('ALL');
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const toggleDetails = (id: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredPendingList = useMemo(() => {
    return pendingList.filter((p) => {
      const matchCategory =
        categoryFilter === 'ALL' ? true : p.category === categoryFilter;
      const matchSearch =
        searchQuery.trim() === ''
          ? true
          : p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.studentNis.includes(searchQuery) ||
            p.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.dormitory.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.reason.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [pendingList, categoryFilter, searchQuery]);

  const handleApproveClick = async (id: string) => {
    if (!onApprove) return;
    setProcessingId(id);
    try {
      await onApprove(id);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (id: string) => {
    if (!onReject || !rejectReason.trim()) return;
    setProcessingId(id);
    try {
      await onReject(id, rejectReason.trim());
      setRejectingId(null);
      setRejectReason('');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-3.5 pb-8">
      {/* Tab: APPROVAL (Persetujuan Izin Santri oleh Kepala Asrama) */}
      {activeTab === 'APPROVAL' && (
        <div className="space-y-3">
          {/* Header Kepala Asrama Ma'had */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-950 p-3.5 sm:p-4 text-white shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 text-[10px] font-semibold">
                    <CheckSquare className="w-3 h-3 text-emerald-300" />
                    {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin Pondok' : 'Pengasuhan Asrama'}
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-snug">
                  {currentUser.role === 'SUPER_ADMIN' ? 'Pusat Kontrol Super Admin' : 'Persetujuan Izin Santri Asrama'}
                </h1>
                <p className="text-xs text-emerald-100/90 mt-0.5 truncate">
                  {pendingList.length > 0
                    ? `${pendingList.length} pengajuan izin menunggu keputusan Anda.`
                    : 'Semua permohonan santri telah ditinjau.'}
                </p>
              </div>

              {pendingList.length > 0 && (
                <div className="h-10 px-3 rounded-lg bg-black/20 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white tabular-nums">
                    {pendingList.length} Menunggu
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info Banner Alur Dual-Approval (Wali Kelas / Kepala Asrama) */}
          <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/80 p-3 flex items-start gap-2.5 text-xs text-emerald-950">
            <Shield className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Izin santri otomatis masuk ke antrean <strong>Wali Kelas</strong> dan <strong>Kepala Asrama</strong>. Cukup <strong>salah satu menyetujui</strong>, perizinan langsung terbit dan santri siap keluar melalui gerbang pos satpam.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Cari santri, kamar, atau alasan izin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 bg-white border-zinc-200 text-xs rounded-xl focus-visible:ring-emerald-600/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
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
                Semua ({pendingList.length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('KELUAR_SEBENTAR')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
                  categoryFilter === 'KELUAR_SEBENTAR'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
                )}
              >
                Keluar Sebentar ({pendingList.filter((p) => p.category === 'KELUAR_SEBENTAR').length})
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter('PULANG_MENGINAP')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
                  categoryFilter === 'PULANG_MENGINAP'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
                )}
              >
                Pulang Menginap ({pendingList.filter((p) => p.category === 'PULANG_MENGINAP').length})
              </button>
            </div>
          </div>

          {/* Daftar Kartu Antrean Persetujuan (Master-Detail) */}
          {filteredPendingList.length === 0 ? (
            <Card className="border border-zinc-200/80 bg-white p-7 text-center rounded-xl shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-700">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                Semua Permohonan Telah Ditinjau
              </h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Tidak ada pengajuan izin santri asrama yang menunggu persetujuan saat ini.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPendingList.map((perm) => {
                const isExpanded = !!expandedCardIds[perm.id];
                const isRejecting = rejectingId === perm.id;
                const isBusy = processingId === perm.id;
                const durationLabel = getEstimatedDuration(perm.plannedDeparture, perm.plannedReturn);
                const scheduleRange = formatScheduleRange(perm.plannedDeparture, perm.plannedReturn);
                const waUrl = getWhatsAppUrl(perm.applicantPhone, perm.studentName, perm.reason);

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
                    className="border border-zinc-200/90 hover:border-zinc-300 bg-white p-3.5 sm:p-4 rounded-xl shadow-xs transition-colors space-y-3"
                  >
                    {/* Header Ringkas Kartu */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {perm.studentName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-zinc-900 truncate leading-tight">
                            {perm.studentName}
                          </h3>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {perm.className} &bull; NIS: {perm.studentNis} &bull; {perm.dormitory.split('(')[0].trim()}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={cn(
                            'inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border',
                            perm.category === 'KELUAR_SEBENTAR'
                              ? 'bg-amber-50 text-amber-900 border-amber-200/80'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200/80'
                          )}
                        >
                          {perm.category === 'KELUAR_SEBENTAR' ? 'Keluar Sebentar' : 'Pulang Menginap'}
                        </span>
                        <span className="block text-[10px] text-zinc-500 mt-0.5 tabular-nums font-medium">
                          {durationLabel}
                        </span>
                      </div>
                    </div>

                    {/* Ringkasan Keperluan & Jadwal 1 Baris */}
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-800 line-clamp-2 leading-relaxed">
                        <span className="font-semibold text-zinc-500">Keperluan: </span>
                        {perm.reason}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-600 font-medium">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="tabular-nums">{scheduleRange}</span>
                      </div>
                    </div>

                    {/* Detail Panel (Accordion) */}
                    {isExpanded && (
                      <div className="pt-2.5 border-t border-zinc-100 space-y-2 text-xs animate-in fade-in-50 duration-150">
                        <div className="rounded-lg bg-zinc-50 p-2.5 space-y-1.5 border border-zinc-200/60">
                          <p className="text-zinc-600">
                            <span className="text-zinc-500">Penjemput:</span>{' '}
                            <strong className="text-zinc-900 font-medium">{escortLabel}</strong>
                            {perm.escortNote && (
                              <span className="text-zinc-500 italic ml-1">({perm.escortNote})</span>
                            )}
                          </p>
                          <p className="text-zinc-600">
                            <span className="text-zinc-500">Pemohon:</span>{' '}
                            <strong className="text-zinc-900 font-medium">{perm.applicantName}</strong>{' '}
                            <span className="text-zinc-500 font-mono text-[11px]">({perm.applicantPhone})</span>
                          </p>
                          <p className="text-zinc-600">
                            <span className="text-zinc-500">Kamar Asrama:</span>{' '}
                            <strong className="text-zinc-900 font-medium">{perm.dormitory}</strong>
                          </p>

                          {perm.applicantPhone && perm.applicantPhone !== '-' && (
                            <div className="pt-1">
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold text-xs py-0.5"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Tanya Wali Santri (WhatsApp)</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Form Tolak Izin (Hanya muncul jika tombol Tolak diklik) */}
                    {isRejecting && (
                      <div className="pt-2.5 border-t border-rose-100 space-y-2 text-xs bg-rose-50/50 -mx-3.5 sm:-mx-4 px-3.5 sm:px-4 py-3 rounded-b-xl animate-in fade-in-50 duration-150">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-rose-900 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Pilih Alasan Penolakan</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason('');
                            }}
                            className="text-[11px] text-zinc-500 hover:text-zinc-800 font-medium cursor-pointer"
                          >
                            Batal Tolak
                          </button>
                        </div>

                        {/* Preset Opsi Cepat */}
                        <div className="grid grid-cols-1 gap-1">
                          {QUICK_REJECTION_REASONS.map((reason, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setRejectReason(reason)}
                              className={cn(
                                'text-left text-[11px] p-2 rounded-lg border transition-all cursor-pointer',
                                rejectReason === reason
                                  ? 'bg-rose-100/80 border-rose-300 text-rose-950 font-semibold'
                                  : 'bg-white border-zinc-200/80 text-zinc-700 hover:bg-rose-50/40'
                              )}
                            >
                              {reason}
                            </button>
                          ))}
                        </div>

                        <Textarea
                          placeholder="Atau tulis alasan penolakan spesifik..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="h-16 text-xs bg-white border-zinc-200 rounded-lg focus-visible:ring-rose-500/20"
                        />

                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={!rejectReason.trim() || isBusy}
                            onClick={() => handleRejectSubmit(perm.id)}
                            className="h-9 px-3 text-xs font-bold cursor-pointer"
                          >
                            {isBusy ? 'Memproses...' : 'Konfirmasi Tolak Izin'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Baris Tombol Aksi */}
                    {!isRejecting && (
                      <div className="pt-2 border-t border-zinc-100 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleDetails(perm.id)}
                          className="h-10 px-2.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                              <span>Tutup</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                              <span>Rincian</span>
                            </>
                          )}
                        </Button>

                        <div className="flex-1 flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => {
                              setRejectingId(perm.id);
                              setRejectReason(QUICK_REJECTION_REASONS[0]);
                            }}
                            className="h-10 px-3.5 text-xs font-bold text-rose-700 border-rose-200 hover:bg-rose-50 rounded-xl cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5 mr-1 text-rose-600" />
                            <span>Tolak</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => handleApproveClick(perm.id)}
                            className="h-10 px-4 text-xs font-bold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs cursor-pointer active:scale-[0.99] transition-all"
                          >
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-200 stroke-[2.5]" />
                            <span>{isBusy ? 'Memproses...' : 'Setujui Izin'}</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: PESIAR (Manajemen & Quick Approval Pesiar) */}
      {activeTab === 'PESIAR' && (
        <PesiarView
          currentUser={currentUser}
          students={students}
          permissions={permissions}
          onRefresh={onRefresh}
          activeRole="KEPALA_ASRAMA"
        />
      )}

      {/* Tab: MONITOR (Live Monitor Santri di Luar) */}
      {activeTab === 'MONITOR' && (
        <div className="space-y-3">
          <div className="rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-950 p-3.5 sm:p-4 text-white shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-700/80 text-emerald-100 text-[10px] font-semibold">
                    <Activity className="w-3 h-3 text-emerald-300" />
                    Monitoring Asrama
                  </span>
                </div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-snug">
                  Live Monitoring Santri
                </h1>
                <p className="text-xs text-emerald-100/90 mt-0.5 truncate">
                  {currentlyOutside.length > 0
                    ? `${currentlyOutside.length} santri sedang berada di luar lingkungan pondok.`
                    : 'Alhamdulillah, seluruh santri berada di dalam lingkungan asrama.'}
                </p>
              </div>

              <div className="h-10 px-3 rounded-lg bg-black/20 border border-white/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-sky-200 tabular-nums">
                  {currentlyOutside.length} Di Luar
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Santri di Luar Pondok</h2>
              <p className="text-xs text-zinc-600">
                Data real-time santri yang telah melakukan check-out gerbang
              </p>
            </div>
            <Badge variant="active" className="text-xs font-semibold px-2.5 py-0.5">
              {currentlyOutside.length} Santri
            </Badge>
          </div>

          {currentlyOutside.length === 0 ? (
            <Card className="border border-zinc-200/80 bg-white p-7 text-center rounded-xl shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                Semua Santri Berada di Pondok
              </h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Tidak ada santri yang sedang berizin keluar saat ini. Keberadaan santri terpantau aman.
              </p>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {currentlyOutside.map((perm) => (
                <PermissionCard key={perm.id} permission={perm} activeRole="KEPALA_ASRAMA" onCheckIn={onCheckIn} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: TERLAMBAT */}
      {activeTab === 'TERLAMBAT' && (
        <div className="space-y-3">
          {/* Panel Konfigurasi Aturan Denda & Toleransi */}
          <Card className="border border-emerald-200/90 bg-emerald-50/50 rounded-xl overflow-hidden shadow-xs">
            <div
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-emerald-100/50 transition-colors"
              onClick={() => setIsFineSettingsOpen((prev) => !prev)}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                    Aturan Denda & Toleransi
                    <span className="text-[10px] font-medium text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                      {fineSettings.mode === 'PER_JAM' ? 'Per Jam' : 'Flat'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-600">
                    {fineSettings.mode === 'PER_JAM'
                      ? `${formatRupiah(fineSettings.ratePerUnit)}/jam`
                      : `${formatRupiah(fineSettings.ratePerUnit)} flat`}
                    {' • '}Toleransi {fineSettings.gracePeriodMinutes} menit
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-500">
                {isFineSettingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {isFineSettingsOpen && (
              <div className="p-3.5 pt-0 border-t border-emerald-100 mt-1 space-y-3 bg-white/70">
                <div className="pt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFineSettings((s) => ({ ...s, mode: 'PER_JAM' }))}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left',
                      fineSettings.mode === 'PER_JAM'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    )}
                  >
                    <div className="text-xs">Mode Per Jam</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Dihitung per jam keterlambatan</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFineSettings((s) => ({ ...s, mode: 'FLAT' }))}
                    className={cn(
                      'px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left',
                      fineSettings.mode === 'FLAT'
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                    )}
                  >
                    <div className="text-xs">Mode Tarif Flat</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Nominal tetap tanpa kelipatan</div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                      {fineSettings.mode === 'PER_JAM' ? 'Tarif per Jam (Rp)' : 'Tarif Denda Flat (Rp)'}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      value={fineSettings.ratePerUnit}
                      onChange={(e) =>
                        setFineSettings((s) => ({
                          ...s,
                          ratePerUnit: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                      Toleransi Waktu (Menit)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={fineSettings.gracePeriodMinutes}
                      onChange={(e) =>
                        setFineSettings((s) => ({
                          ...s,
                          gracePeriodMinutes: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white"
                    />
                    <p className="text-[10px] text-zinc-500 mt-0.5">Bebas denda jika kembali sebelum toleransi</p>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-700 block mb-1">
                      Maksimal Denda (Rp)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="5000"
                      value={fineSettings.maxFineAmount}
                      onChange={(e) =>
                        setFineSettings((s) => ({
                          ...s,
                          maxFineAmount: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="h-8 text-xs bg-white"
                    />
                    <p className="text-[10px] text-zinc-500 mt-0.5">Isi 0 jika tidak dibatasi maksimal</p>
                  </div>
                </div>

                {fineSaveError && (
                  <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                    {fineSaveError}
                  </p>
                )}

                {fineSaveSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Aturan denda berhasil diperbarui dan aktif!</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    onClick={handleSaveFineSettings}
                    disabled={isSavingFine}
                    className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSavingFine ? 'Menyimpan...' : 'Simpan Perubahan Aturan'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Rekap Keterlambatan Izin</h2>
              <p className="text-xs text-zinc-600">
                Santri yang melewati batas rencana jam kepulangan ke pondok
              </p>
            </div>
            <Badge
              variant={latePermissions.length > 0 ? 'destructive' : 'approved'}
              className="text-xs font-semibold px-2.5 py-0.5"
            >
              {latePermissions.length} Kasus
            </Badge>
          </div>

          {latePermissions.length === 0 ? (
            <Card className="border border-zinc-200/80 bg-white p-7 text-center rounded-xl shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-700">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900">
                Disiplin Waktu Terjaga Sangat Baik
              </h3>
              <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Belum ada catatan keterlambatan santri yang melebihi batas waktu izin kepulangan.
              </p>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {latePermissions.map((perm) => (
                <PermissionCard key={perm.id} permission={perm} activeRole="KEPALA_ASRAMA" onCheckIn={onCheckIn} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: MASTER DATA */}
      {activeTab === 'MASTER' && (
        <MasterDataView
          students={students}
          onStudentsUpdated={onStudentsUpdated}
          isUploadModalOpen={isUploadModalOpen}
          setIsUploadModalOpen={setIsUploadModalOpen}
        />
      )}

      {/* Tab: RIWAYAT (Semua Izin Pondok) */}
      {activeTab === 'RIWAYAT' && (
        <HistoryView
          permissions={permissions.filter((p) => p.status !== 'PENDING_WALI_KELAS')}
          title="Arsip Perizinan Seluruh Santri"
          description="Rekapitulasi izin keluar dan kepulangan seluruh santri asrama yang telah diproses."
          activeRole="KEPALA_ASRAMA"
          emptyTitle="Belum Ada Arsip Perizinan Santri"
          emptySubtitle="Seluruh perizinan santri yang telah selesai diverifikasi atau diputuskan akan tercatat di sini."
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}