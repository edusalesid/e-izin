'use client';

import React, { useState, useMemo } from 'react';
import { Student, Permission, UserAccount, Classroom } from '@/lib/types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  MessageCircle,
  Search,
  Check,
  X,
  Shield,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserCheck,
  ChevronRight,
  Home,
  AlertCircle,
  PhoneCall,
  Sparkles,
  CheckSquare,
} from 'lucide-react';
import { TabKey } from '../BottomNav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { HistoryView } from './HistoryView';
import { PesiarView } from './PesiarView';

interface WaliKelasViewProps {
  activeTab: TabKey;
  currentUser: UserAccount;
  students: Student[];
  permissions: Permission[];
  users?: UserAccount[];
  classrooms?: Classroom[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onCheckIn?: (id: string, lateFineStatus?: 'UNPAID' | 'PAID') => void;
  onOpenReturnDrawer?: () => void;
  onRefresh: () => void;
  onTabChange?: (tab: TabKey) => void;
}

// Preset alasan penolakan santun khas pondok pesantren / ma'had
const QUICK_REJECTION_REASONS = [
  "Waktu izin berbenturan dengan agenda KBM / ujian pondok",
  "Penjemput belum tercatat sebagai mahram atau wali resmi santri",
  "Jadwal perpulangan belum memasuki waktu libur ma'had yang ditentukan",
  "Mohon konfirmasi langsung ke wali kelas via telepon atau WhatsApp",
];

// Helper kalkulasi estimasi durasi izin
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

// Helper format rentang jadwal ringkas satu baris
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

// Helper URL WhatsApp ke wali santri
function getParentWhatsAppUrl(phone: string, studentName: string, reason?: string): string {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  if (!cleanPhone) return '#';
  const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone;
  const message = reason
    ? encodeURIComponent(
        `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
        `Saya Wali Kelas dari ananda *${studentName}* di SMAIT Ihsanul Fikri Pabelan.\n` +
        `Terkait permohonan izin:\n"${reason}"\n\n` +
        `Ada hal yang ingin kami konfirmasikan terlebih dahulu. Terima kasih.`
      )
    : encodeURIComponent(
        `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
        `Saya Wali Kelas dari ananda *${studentName}* di SMAIT Ihsanul Fikri Pabelan.\n` +
        `Semoga Bapak/Ibu senantiasa dalam lindungan Allah SWT.\n\n` +
        `Ada hal terkait ananda yang ingin kami komunikasikan. Terima kasih.`
      );
  return `https://wa.me/${formattedPhone}?text=${message}`;
}

export function WaliKelasView({
  activeTab,
  currentUser,
  students,
  permissions,
  users,
  classrooms,
  onApprove,
  onReject,
  onCheckIn,
  onOpenReturnDrawer,
  onRefresh,
  onTabChange,
}: WaliKelasViewProps) {
  // 1. Tentukan classroomId efektif dengan multi-layer fallback cerdas
  const effectiveClassroomId = useMemo(() => {
    // A. Cari dari daftar live user terbaru dari database
    const freshUser = users?.find(
      (u) => u.id === currentUser.id || u.username === currentUser.username
    );
    if (freshUser?.classroomId) return freshUser.classroomId;

    // B. Cari dari classrooms di mana guru ini terdaftar sebagai wali kelas
    const assignedClass = classrooms?.find(
      (c) =>
        c.waliKelasId === currentUser.id ||
        (freshUser && c.waliKelasId === freshUser.id) ||
        (currentUser.name &&
          c.waliKelasName &&
          c.waliKelasName.toLowerCase().includes(currentUser.name.toLowerCase()))
    );
    if (assignedClass?.id) return assignedClass.id;

    // C. Fallback ke session currentUser.classroomId
    return currentUser.classroomId || null;
  }, [currentUser, users, classrooms]);

  // 2. Filter santri kelas binaan yang diampu wali kelas
  const myClassroomStudents = useMemo(() => {
    // A. Filter via effectiveClassroomId
    if (effectiveClassroomId) {
      const match = students.filter((s) => s.classroomId === effectiveClassroomId);
      if (match.length > 0) return match;
    }

    // B. Fallback: Cocokkan via nama kelas dari classrooms
    const targetClass = classrooms?.find(
      (c) =>
        c.id === effectiveClassroomId ||
        c.waliKelasId === currentUser.id ||
        (currentUser.name &&
          c.waliKelasName &&
          c.waliKelasName.toLowerCase().includes(currentUser.name.toLowerCase()))
    );
    if (targetClass?.name) {
      const matchByName = students.filter(
        (s) => s.className.trim().toLowerCase() === targetClass.name.trim().toLowerCase()
      );
      if (matchByName.length > 0) return matchByName;
    }

    // C. Jika belum ada kelas yang cocok, tampilkan seluruh students
    return students;
  }, [students, effectiveClassroomId, classrooms, currentUser]);

  const assignedClassName = useMemo(() => {
    if (myClassroomStudents.length > 0 && myClassroomStudents[0].className) {
      return `Kelas ${myClassroomStudents[0].className}`;
    }
    const targetClass = classrooms?.find((c) => c.id === effectiveClassroomId);
    if (targetClass?.name) {
      return `Kelas ${targetClass.name}`;
    }
    return 'Kelas Binaan';
  }, [myClassroomStudents, classrooms, effectiveClassroomId]);

  // Perizinan khusus santri di kelas binaan
  const classPermissions = useMemo(() => {
    const studentIds = new Set(myClassroomStudents.map((s) => s.id));
    const studentNis = new Set(myClassroomStudents.map((s) => s.nis));
    return permissions.filter(
      (p) =>
        studentIds.has(p.studentId) ||
        studentNis.has(p.studentNis) ||
        p.targetApproverId === currentUser.id
    );
  }, [permissions, myClassroomStudents, currentUser.id]);

  // Antrean persetujuan yang menunggu wali kelas
  const pendingList = useMemo(
    () => classPermissions.filter((p) => p.status === 'PENDING_WALI_KELAS'),
    [classPermissions]
  );

  // Santri yang sedang berada di luar ma'had
  const outsideList = useMemo(
    () => permissions.filter((p) => p.status === 'SEDANG_DI_LUAR'),
    [permissions]
  );

  // Riwayat seluruh izin santri (semua aktivitas perizinan pondok)
  const allHistoryList = useMemo(
    () => permissions.filter((p) => p.status !== 'PENDING_WALI_KELAS'),
    [permissions]
  );

  // State: Filter & Search di Tab Persetujuan (APPROVAL)
  const [approvalSearchQuery, setApprovalSearchQuery] = useState('');
  const [approvalCategoryFilter, setApprovalCategoryFilter] = useState<'ALL' | 'KELUAR_SEBENTAR' | 'PULANG_MENGINAP'>('ALL');
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // State: Filter & Search di Tab Santri Kelas (KELAS)
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'ALL' | 'IN_DORM' | 'OUTSIDE'>('ALL');

  const toggleDetails = (id: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Handler setujui izin
  const handleApproveClick = async (id: string) => {
    setProcessingId(id);
    try {
      await onApprove(id);
    } finally {
      setProcessingId(null);
    }
  };

  // Handler tolak izin
  const handleRejectSubmit = async (id: string) => {
    if (!rejectReason.trim()) return;
    setProcessingId(id);
    try {
      await onReject(id, rejectReason.trim());
      setRejectingId(null);
      setRejectReason('');
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered antrean persetujuan
  const filteredPendingList = useMemo(() => {
    return pendingList.filter((p) => {
      const matchCategory =
        approvalCategoryFilter === 'ALL' ? true : p.category === approvalCategoryFilter;
      const q = approvalSearchQuery.trim().toLowerCase();
      const matchSearch =
        q === ''
          ? true
          : p.studentName.toLowerCase().includes(q) ||
            p.studentNis.includes(q) ||
            p.reason.toLowerCase().includes(q) ||
            p.applicantName.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [pendingList, approvalCategoryFilter, approvalSearchQuery]);

  const countSebentar = pendingList.filter((p) => p.category === 'KELUAR_SEBENTAR').length;
  const countMenginap = pendingList.filter((p) => p.category === 'PULANG_MENGINAP').length;

  // Active permissions per student map (untuk pengecekan status di Tab KELAS)
  const activePermissionsMap = useMemo(() => {
    const map = new Map<string, Permission>();
    for (const p of permissions) {
      if (p.status === 'SEDANG_DI_LUAR' || p.status === 'APPROVED_WALI_KELAS') {
        map.set(p.studentId, p);
      }
    }
    return map;
  }, [permissions]);

  // Metrik kehadiran santri di kelas binaan
  const { totalStudentsCount, inDormCount, outsideCount } = useMemo(() => {
    let outside = 0;
    for (const s of myClassroomStudents) {
      const perm = activePermissionsMap.get(s.id);
      if (perm && perm.status === 'SEDANG_DI_LUAR') {
        outside++;
      }
    }
    const total = myClassroomStudents.length;
    return {
      totalStudentsCount: total,
      inDormCount: Math.max(0, total - outside),
      outsideCount: outside,
    };
  }, [myClassroomStudents, activePermissionsMap]);

  // Filtered santri kelas binaan
  const filteredClassroomStudents = useMemo(() => {
    return myClassroomStudents.filter((student) => {
      const activePerm = activePermissionsMap.get(student.id);
      const isOutside = activePerm?.status === 'SEDANG_DI_LUAR';

      if (studentStatusFilter === 'IN_DORM' && isOutside) return false;
      if (studentStatusFilter === 'OUTSIDE' && !isOutside) return false;

      const q = studentSearchQuery.trim().toLowerCase();
      if (!q) return true;

      return (
        student.fullName.toLowerCase().includes(q) ||
        student.nis.toLowerCase().includes(q) ||
        (student.dormitory && student.dormitory.toLowerCase().includes(q)) ||
        (student.parentName && student.parentName.toLowerCase().includes(q))
      );
    });
  }, [myClassroomStudents, activePermissionsMap, studentStatusFilter, studentSearchQuery]);

  return (
    <div className="space-y-4 pb-12">
      {/* ========================================================= */}
      {/* TAB: APPROVAL (Antrean Persetujuan Izin) */}
      {/* ========================================================= */}
      {activeTab === 'APPROVAL' && (
        <div className="space-y-3.5">
          {/* Quick Action: Cek-in Santri Kembali (Hanya tampil jika ada santri yang sedang di luar) */}
          {outsideList.length > 0 && onOpenReturnDrawer && (
            <button
              type="button"
              onClick={onOpenReturnDrawer}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 transition active:scale-[0.99] cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-900">
                      Cek-in Santri Kembali
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full tabular-nums">
                      {outsideList.length} di luar
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600">
                    Bantu verifikasi kepulangan santri yang telah tiba di pondok
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                Buka <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          )}

          {/* Filter Pills & Search Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Cari santri, NIS, atau keperluan izin..."
                value={approvalSearchQuery}
                onChange={(e) => setApprovalSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 bg-white border-zinc-200 text-xs rounded-xl focus-visible:ring-emerald-600/30"
              />
              {approvalSearchQuery && (
                <button
                  type="button"
                  onClick={() => setApprovalSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
              <button
                type="button"
                onClick={() => setApprovalCategoryFilter('ALL')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
                  approvalCategoryFilter === 'ALL'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
                )}
              >
                Semua Antrean ({pendingList.length})
              </button>
              <button
                type="button"
                onClick={() => setApprovalCategoryFilter('KELUAR_SEBENTAR')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
                  approvalCategoryFilter === 'KELUAR_SEBENTAR'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100/70'
                )}
              >
                Keluar Sebentar ({countSebentar})
              </button>
              <button
                type="button"
                onClick={() => setApprovalCategoryFilter('PULANG_MENGINAP')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
                  approvalCategoryFilter === 'PULANG_MENGINAP'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'bg-sky-50 text-sky-800 border border-sky-200/60 hover:bg-sky-100/70'
                )}
              >
                Pulang Menginap ({countMenginap})
              </button>
            </div>
          </div>

          {/* List Kartu Persetujuan */}
          {pendingList.length === 0 ? (
            /* Empty State: Antrean Bersih */
            <Card className="border border-zinc-200/80 bg-white p-8 text-center rounded-2xl shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3.5 text-emerald-700">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">
                Alhamdulillah, Antrean Bersih
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Tidak ada permohonan santri {assignedClassName} yang menunggu keputusan saat ini. Semua pengajuan telah ditinjau.
              </p>
              {onTabChange && (
                <div className="mt-5">
                  <Button
                    type="button"
                    onClick={() => onTabChange('KELAS')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-xs"
                  >
                    <Users className="w-3.5 h-3.5 mr-1.5" />
                    Pantau Santri Kelas
                  </Button>
                </div>
              )}
            </Card>
          ) : filteredPendingList.length === 0 ? (
            /* Empty State Filter */
            <Card className="border-dashed p-6 text-center rounded-xl bg-zinc-50/50">
              <Search className="w-5 h-5 text-zinc-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-zinc-800">Tidak Ditemukan</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Tidak ada pengajuan yang cocok dengan filter atau kata kunci Anda.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setApprovalSearchQuery('');
                  setApprovalCategoryFilter('ALL');
                }}
                className="mt-3 text-xs h-7 px-3 rounded-lg"
              >
                Reset Filter
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPendingList.map((perm) => {
                const isKeluarSebentar = perm.category === 'KELUAR_SEBENTAR';
                const isCurrentlyRejecting = rejectingId === perm.id;
                const isProcessingThis = processingId === perm.id;
                const isExpanded = !!expandedCardIds[perm.id];
                const durationLabel = getEstimatedDuration(
                  perm.plannedDeparture,
                  perm.plannedReturn
                );
                const scheduleRange = formatScheduleRange(
                  perm.plannedDeparture,
                  perm.plannedReturn
                );
                const waUrl = getParentWhatsAppUrl(
                  perm.applicantPhone,
                  perm.studentName,
                  perm.reason
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
                    className="border border-zinc-200/90 hover:border-zinc-300 bg-white p-4 rounded-2xl shadow-xs transition-all"
                  >
                    {/* Baris Atas: Identitas Santri & Badge Kategori */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
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
                        <Badge
                          variant={isKeluarSebentar ? 'pending' : 'active'}
                          className="font-semibold text-[10px] px-2.5 py-0.5 rounded-full"
                        >
                          {isKeluarSebentar ? 'Keluar Sebentar' : 'Pulang Menginap'}
                        </Badge>
                        <span className="block text-[10px] font-semibold text-zinc-500 mt-1 tabular-nums">
                          {durationLabel}
                        </span>
                      </div>
                    </div>

                    {/* Baris Keperluan: Jelas, Nyaman Dibaca */}
                    <div className="mt-3 p-2.5 rounded-xl bg-zinc-50/80 border border-zinc-100">
                      <p className="text-xs text-zinc-800 leading-relaxed">
                        <span className="font-semibold text-zinc-600">Keperluan: </span>
                        {perm.reason}
                      </p>
                    </div>

                    {/* Rentang Jadwal Keberangkatan & Kepulangan */}
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-600 font-medium">
                      <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="tabular-nums">{scheduleRange}</span>
                    </div>

                    {/* Bagian Rincian Tambahan (Toggleable) */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2 text-xs animate-in fade-in-50 duration-150">
                        <div className="rounded-xl bg-zinc-50 p-3 space-y-2 border border-zinc-200/60">
                          <div className="flex items-start justify-between gap-2 text-zinc-700">
                            <span className="text-zinc-500 shrink-0">Penjemput:</span>
                            <span className="font-medium text-right text-zinc-900">
                              {escortLabel}
                              {perm.escortNote && (
                                <span className="text-zinc-500 font-normal italic ml-1">
                                  ({perm.escortNote})
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-start justify-between gap-2 text-zinc-700">
                            <span className="text-zinc-500 shrink-0">Pemohon (Wali):</span>
                            <span className="font-medium text-right text-zinc-900">
                              {perm.applicantName}{' '}
                              <span className="text-zinc-500 font-mono text-[11px]">
                                ({perm.applicantPhone})
                              </span>
                            </span>
                          </div>
                          {perm.applicantPhone && (
                            <div className="pt-1.5 border-t border-zinc-200/60 flex justify-end">
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-semibold text-xs py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Konfirmasi Wali via WhatsApp</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Panel Form Penolakan */}
                    {isCurrentlyRejecting && (
                      <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-900 flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Alasan Penolakan
                          </span>
                          <span className="text-[10px] text-zinc-500">Wajib diisi</span>
                        </div>

                        {/* Pilihan Alasan Cepat Khas Pondok */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {QUICK_REJECTION_REASONS.map((reasonText, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setRejectReason(reasonText)}
                              className={cn(
                                'text-left text-[11px] p-2 rounded-lg border transition-all cursor-pointer leading-tight',
                                rejectReason === reasonText
                                    ? 'bg-rose-100/90 border-rose-400 text-rose-950 font-semibold'
                                    : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                              )}
                            >
                              {reasonText}
                            </button>
                          ))}
                        </div>

                        <Textarea
                          placeholder="Tuliskan catatan penolakan untuk wali santri..."
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="text-xs min-h-[60px] bg-white border-rose-200 focus-visible:ring-rose-500/20 rounded-xl"
                        />

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isProcessingThis}
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason('');
                            }}
                            className="text-xs h-8 px-3.5 rounded-xl border-zinc-200"
                          >
                            Batal
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={!rejectReason.trim() || isProcessingThis}
                            onClick={() => handleRejectSubmit(perm.id)}
                            className="text-xs h-8 px-4 rounded-xl font-bold cursor-pointer"
                          >
                            {isProcessingThis ? 'Memproses...' : 'Kirim Penolakan'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Baris Tombol Aksi Bawah */}
                    {!isCurrentlyRejecting && (
                      <div className="mt-3.5 pt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                        {/* Tombol Toggle Rincian */}
                        <button
                          type="button"
                          onClick={() => toggleDetails(perm.id)}
                          className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Tutup Rincian' : 'Rincian Lengkap'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                        </button>

                        <div className="flex items-center gap-2">
                          {/* Tombol Tolak */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isProcessingThis}
                            onClick={() => {
                              setRejectingId(perm.id);
                              setRejectReason('');
                            }}
                            className="h-9 px-3.5 rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Tolak
                          </Button>

                          {/* Tombol Setujui */}
                          <Button
                            type="button"
                            size="sm"
                            disabled={isProcessingThis}
                            onClick={() => handleApproveClick(perm.id)}
                            className="h-9 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                          >
                            {isProcessingThis ? (
                              <span className="flex items-center gap-1.5">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Menyetujui...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5" />
                                Setujui Izin
                              </span>
                            )}
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

      {/* ========================================================= */}
      {/* TAB: PESIAR (Monitoring & Check-In Pesiar) */}
      {/* ========================================================= */}
      {activeTab === 'PESIAR' && (
        <PesiarView
          currentUser={currentUser}
          students={students}
          permissions={permissions}
          onRefresh={onRefresh}
          activeRole="WALI_KELAS"
        />
      )}

      {/* ========================================================= */}
      {/* TAB: KELAS (Beranda / Daftar Santri Kelas Binaan) */}
      {/* ========================================================= */}
      {activeTab === 'KELAS' && (
        <div className="space-y-3.5">
          {/* Quick Alert: Ada Permohonan Izin Menunggu Persetujuan */}
          {pendingList.length > 0 && onTabChange && (
            <button
              type="button"
              onClick={() => onTabChange('APPROVAL')}
              className="w-full flex items-center justify-between p-3 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-amber-950 transition active:scale-[0.99] cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-amber-950 truncate">
                      {pendingList.length} Izin Menunggu Keputusan
                    </span>
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  </div>
                  <p className="text-[11px] text-amber-800 truncate">
                    Buka menu Persetujuan untuk meninjau permohonan santri
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1 shrink-0 group-hover:translate-x-0.5 transition-transform ml-2">
                Tinjau <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          )}

          {/* Header Santri Kelas Binaan (Anti-Slop: Ramping & Fungsional) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5 pt-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                {assignedClassName}
              </span>
            </div>

            {/* Quick Metrics Inline */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-medium">
                Total: <strong className="font-bold text-zinc-900">{totalStudentsCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium">
                Di Asrama: <strong className="font-bold text-emerald-900">{inDormCount}</strong>
              </span>
              {outsideCount > 0 ? (
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/80 font-bold">
                  Di Luar: <strong>{outsideCount}</strong>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-zinc-50 text-zinc-500 font-medium border border-zinc-200/60">
                  Di Luar: 0
                </span>
              )}
            </div>
          </div>

          {/* Search & Filter Status Keberadaan */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Cari santri, NIS, asrama/kamar, atau orang tua..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 bg-white border-zinc-200 text-xs rounded-xl focus-visible:ring-emerald-600/30"
              />
              {studentSearchQuery && (
                <button
                  type="button"
                  onClick={() => setStudentSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs scrollbar-none">
              <button
                type="button"
                onClick={() => setStudentStatusFilter('ALL')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
                  studentStatusFilter === 'ALL'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-900'
                )}
              >
                Semua Santri ({myClassroomStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setStudentStatusFilter('IN_DORM')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
                  studentStatusFilter === 'IN_DORM'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100/70'
                )}
              >
                Di Pondok ({inDormCount})
              </button>
              <button
                type="button"
                onClick={() => setStudentStatusFilter('OUTSIDE')}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer text-xs',
                  studentStatusFilter === 'OUTSIDE'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100/70'
                )}
              >
                Sedang di Luar ({outsideCount})
              </button>
            </div>
          </div>

          {/* List Santri Kelas Binaan */}
          {filteredClassroomStudents.length === 0 ? (
            <Card className="border-dashed p-7 text-center rounded-2xl bg-zinc-50/50">
              <Users className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-800">Santri Tidak Ditemukan</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                Tidak ada santri {assignedClassName} yang sesuai dengan pencarian atau filter yang dipilih.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setStudentSearchQuery('');
                  setStudentStatusFilter('ALL');
                }}
                className="mt-3.5 text-xs h-8 px-3.5 rounded-xl cursor-pointer"
              >
                Tampilkan Semua Santri
              </Button>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {filteredClassroomStudents.map((student) => {
                const activePerm = activePermissionsMap.get(student.id);
                const isOutside = activePerm?.status === 'SEDANG_DI_LUAR';
                const isApprovedReady = activePerm?.status === 'APPROVED_WALI_KELAS';
                const parentWaUrl = getParentWhatsAppUrl(student.parentPhone, student.fullName);

                return (
                  <Card
                    key={student.id}
                    className="p-3.5 sm:p-4 border-zinc-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-300 transition-colors bg-white shadow-xs"
                  >
                    {/* Profil Santri */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-zinc-100 border border-zinc-200/80 text-zinc-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {student.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-zinc-900 truncate">
                            {student.fullName}
                          </p>
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate">
                          NIS: <span className="font-mono text-zinc-700">{student.nis}</span> &bull; {student.dormitory.split('(')[0].trim()}
                        </p>

                        {/* Info Wali & Tombol WhatsApp */}
                        <div className="flex items-center gap-2 pt-1 text-xs">
                          <span className="text-[11px] text-zinc-500 truncate">
                            Wali: <strong className="text-zinc-700 font-medium">{student.parentName || 'Orang Tua'}</strong>
                          </span>
                          {student.parentPhone && (
                            <a
                              href={parentWaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/70 px-2 py-0.5 rounded-md transition-colors"
                              title={`Chat WhatsApp ke ${student.parentName}`}
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Keberadaan Santri */}
                    <div className="sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 flex sm:flex-col items-center sm:items-end justify-between gap-1.5">
                      {isOutside ? (
                        <div className="text-right">
                          <Badge
                            variant="active"
                            className="bg-amber-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full"
                          >
                            Sedang di Luar
                          </Badge>
                          {activePerm?.plannedReturn && (
                            <span className="block text-[10px] text-zinc-500 font-medium mt-1">
                              Rencana kembali: {new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date(activePerm.plannedReturn)).replace(/\./g, ':')} WIB
                            </span>
                          )}
                        </div>
                      ) : isApprovedReady ? (
                        <div className="text-right">
                          <Badge
                            variant="approved"
                            className="bg-sky-600 text-white font-bold text-xs px-2.5 py-0.5 rounded-full"
                          >
                            Izin Siap Keluar
                          </Badge>
                          <span className="block text-[10px] text-zinc-500 font-medium mt-1">
                            Menunggu gerbang satpam
                          </span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className="text-emerald-800 border-emerald-200 bg-emerald-50/80 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          >
                            <Home className="w-3 h-3 mr-1 text-emerald-600" />
                            Di Pondok
                          </Badge>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB: RIWAYAT (Riwayat Seluruh Perizinan Santri) */}
      {/* ========================================================= */}
      {activeTab === 'RIWAYAT' && (
        <HistoryView
          permissions={allHistoryList}
          title="Semua Riwayat Perizinan"
          description="Log dan rekapitulasi aktivitas seluruh perizinan santri ma'had."
          activeRole="WALI_KELAS"
          emptyTitle="Belum Ada Arsip Perizinan"
          emptySubtitle="Seluruh catatan perizinan santri yang telah disetujui, ditolak, atau selesai akan tersimpan rapi di sini."
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
