'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStaff } from '@/hooks/useStaff';
import { StudentCombobox } from '@/components/forms/StudentCombobox';
import { ApproverSelect } from '@/components/forms/ApproverSelect';
import { Student, PermissionCategory, EscortType } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { AjukanFormSkeleton } from '@/components/skeletons/AppSkeletons';
import {
  Clock,
  Home,
  Calendar,
  User,
  GraduationCap,
  FileText,
  Car,
  Check,
  RefreshCw,
  AlertCircle,
  Timer,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UstadzAjukanPage() {
  const router = useRouter();
  const { session, students, permissions, users, refreshData, isLoading } = useStaff();

  // Santri yang pulang / sudah di approve (APPROVED_WALI_KELAS atau SEDANG_DI_LUAR) tidak muncul di daftar pengajuan
  const availableStudents = useMemo(() => {
    return students.filter((s) => {
      const activePerm = permissions.find(
        (p) =>
          (p.studentId === s.id || (s.nis && p.studentNis === s.nis)) &&
          (p.status === 'APPROVED_WALI_KELAS' || p.status === 'SEDANG_DI_LUAR')
      );
      return !activePerm;
    });
  }, [students, permissions]);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
    availableStudents.length > 0 ? availableStudents[0] : null
  );

  // Status izin santri yang sedang dipilih (jika sedang dalam tinjauan / aktif)
  const selectedStudentPerm = useMemo(() => {
    if (!selectedStudent) return null;
    return permissions.find(
      (p) =>
        (p.studentId === selectedStudent.id || (selectedStudent.nis && p.studentNis === selectedStudent.nis)) &&
        (p.status === 'PENDING_WALI_KELAS' || p.status === 'APPROVED_WALI_KELAS' || p.status === 'SEDANG_DI_LUAR')
    );
  }, [selectedStudent, permissions]);

  // Filter possible target approvers (Ustadz & Wali Kelas)
  const potentialApprovers = useMemo(
    () =>
      users.filter(
        (u) => u.role === 'WALI_KELAS' || u.role === 'KEPALA_ASRAMA' || u.role === 'USTADZ_UMUM'
      ),
    [users]
  );

  // Automatically find target approver for selected student's class
  const getInitialTargetApprover = (student: Student | null) => {
    if (!student) return potentialApprovers[0]?.id || '';
    if (student.className.includes('X MIPA 1') || student.className.includes('X IPA 1')) {
      const u = potentialApprovers.find((u) => u.username.includes('fauzi'));
      if (u) return u.id;
    }
    if (student.className.includes('XI MIPA 1') || student.className.includes('XI IPA 1')) {
      const u = potentialApprovers.find((u) => u.username.includes('ridwan'));
      if (u) return u.id;
    }
    return potentialApprovers[0]?.id || '';
  };

  const [targetApproverId, setTargetApproverId] = useState<string>(() =>
    getInitialTargetApprover(selectedStudent)
  );

  const [category, setCategory] = useState<PermissionCategory>('KELUAR_SEBENTAR');
  const [reason, setReason] = useState('');

  // Default dates
  const now = new Date();
  const formatForInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const defaultOut = new Date(now.getTime() + 30 * 60 * 1000);
  const defaultIn = new Date(now.getTime() + 4 * 60 * 60 * 1000);

  const [plannedDeparture, setPlannedDeparture] = useState(formatForInput(defaultOut));
  const [plannedReturn, setPlannedReturn] = useState(formatForInput(defaultIn));

  const [escortType, setEscortType] = useState<EscortType>('MANDIRI');
  const [escortNote, setEscortNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate live duration
  const estimatedDurationMinutes = useMemo(() => {
    const start = new Date(plannedDeparture).getTime();
    const end = new Date(plannedReturn).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.round((end - start) / (1000 * 60));
  }, [plannedDeparture, plannedReturn]);

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    const target = getInitialTargetApprover(student);
    setTargetApproverId(target);
  };

  const handleCategoryChange = (cat: PermissionCategory) => {
    setCategory(cat);
    const base = new Date();
    if (cat === 'KELUAR_SEBENTAR') {
      setPlannedDeparture(formatForInput(new Date(base.getTime() + 30 * 60 * 1000)));
      setPlannedReturn(formatForInput(new Date(base.getTime() + 4 * 60 * 60 * 1000)));
    } else {
      setPlannedDeparture(formatForInput(new Date(base.getTime() + 2 * 60 * 60 * 1000)));
      setPlannedReturn(formatForInput(new Date(base.getTime() + 48 * 60 * 60 * 1000)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMessage('Mohon pilih santri yang akan mengajukan izin.');
      return;
    }

    if (selectedStudentPerm?.status === 'PENDING_WALI_KELAS') {
      const msg = `Santri ${selectedStudent.fullName} masih memiliki izin yang sedang dalam tinjauan. Tidak bisa menambahkan izin lagi, harus menunggu persetujuan (approve).`;
      setErrorMessage(msg);
      toast.error('Tidak Dapat Mengajukan Izin', { description: msg });
      return;
    }

    if (selectedStudentPerm?.status === 'APPROVED_WALI_KELAS' || selectedStudentPerm?.status === 'SEDANG_DI_LUAR') {
      const msg = `Santri ${selectedStudent.fullName} sudah memiliki izin aktif (${selectedStudentPerm.status === 'APPROVED_WALI_KELAS' ? 'telah disetujui' : 'sedang di luar/pulang'}).`;
      setErrorMessage(msg);
      toast.error('Tidak Dapat Mengajukan Izin', { description: msg });
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Mohon cantumkan alasan atau keperluan izin santri.');
      return;
    }
    if (new Date(plannedReturn) <= new Date(plannedDeparture)) {
      setErrorMessage('Waktu rencana kembali harus setelah waktu rencana keluar.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const targetUser = potentialApprovers.find((u) => u.id === targetApproverId);

    try {
      const payload = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        studentNis: selectedStudent.nis,
        className: selectedStudent.className,
        dormitory: selectedStudent.dormitory || '-',
        category,
        reason: reason.trim(),
        applicantType: 'USTADZ',
        applicantId: session?.user?.id,
        applicantName: session?.user?.name || 'Ustadz Piket',
        applicantPhone: session?.user?.phone || '082155566677',
        targetApproverId: targetUser?.id,
        targetApproverName: targetUser?.name ? `${targetUser.name} & Kepala Asrama` : 'Wali Kelas & Kepala Asrama',
        escortType,
        escortNote: escortNote.trim(),
        plannedDeparture: new Date(plannedDeparture).toISOString(),
        plannedReturn: new Date(plannedReturn).toISOString(),
      };

      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan pengajuan.');
      }

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#047857', '#059669', '#10b981', '#34d399'],
        });
      } catch {}

      toast.success('Permohonan Izin Berhasil Dikirim', {
        description: `Permohonan izin untuk ${selectedStudent.fullName} berhasil dikirim ke ${selectedTargetUser?.name || 'Wali Kelas'}.`,
      });

      await refreshData();
      router.push('/');
    } catch (err: any) {
      const msg = err.message || 'Terjadi kesalahan sistem.';
      setErrorMessage(msg);
      toast.error('Gagal Mengajukan Izin', {
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTargetUser = potentialApprovers.find((u) => u.id === targetApproverId);

  useEffect(() => {
    if (!selectedStudent && availableStudents.length > 0) {
      setSelectedStudent(availableStudents[0]);
      setTargetApproverId(getInitialTargetApprover(availableStudents[0]));
    }
  }, [availableStudents, selectedStudent]);

  if (isLoading) {
    return <AjukanFormSkeleton />;
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Page Heading & Header Sub-Context */}
      <div>
        <h1 className="text-base font-black text-zinc-900 tracking-tight">
          Ajukan Izin Santri
        </h1>
        <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
          Pencatatan izin santri langsung di pondok untuk diteruskan ke Wali Kelas terkait.
        </p>
      </div>

      {/* Caller Info Banner */}
      <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold text-xs shadow-xs"
          >
            <User className="w-5 h-5 text-emerald-100" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
              Pemohon Izin (Ustadz Piket)
            </span>
            <p className="text-xs font-bold text-zinc-900 truncate">
              {session?.user?.name || 'Ust. Zaki Mubarok'}
            </p>
            <p className="text-[11px] text-zinc-600">
              Peran: <span className="font-semibold">{session?.role || 'Ustadz Umum'}</span>
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* GROUP 1: Santri & Penugasan Persetujuan */}
        <section aria-labelledby="section-santri" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3.5">
          <div className="border-b border-zinc-100 pb-2.5">
            <h2 id="section-santri" className="text-xs font-bold text-zinc-900 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-black">
                1
              </span>
              <span>Data Santri & Wali Kelas Penerima</span>
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5 ml-7">
              Tentukan santri yang meminta izin serta tujuan pengiriman permohonan.
            </p>
          </div>

          {/* Student Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="student-combobox-input"
                className="text-xs font-bold text-zinc-900 flex items-center gap-1.5"
              >
                <span>Pilih Santri yang Izin</span>
                <span className="text-emerald-700" aria-label="Wajib diisi">*</span>
              </label>
              {selectedStudent && (
                <span className="text-[10px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  {selectedStudent.className}
                </span>
              )}
            </div>

            <StudentCombobox
              id="student-combobox-input"
              students={availableStudents}
              permissions={permissions}
              selectedStudent={selectedStudent}
              onSelect={handleStudentSelect}
            />

            {selectedStudentPerm?.status === 'PENDING_WALI_KELAS' && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-950">Santri Sedang Dalam Tinjauan</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Santri ini masih memiliki permohonan izin yang sedang dalam tinjauan (menunggu persetujuan). Tidak bisa menambahkan pengajuan izin baru sampai izin disetujui (approve).
                  </p>
                </div>
              </div>
            )}

            {selectedStudent && (
              <div className="rounded-xl bg-zinc-50 border border-zinc-200/70 p-2.5 flex items-center justify-between text-[11px] text-zinc-700">
                <div>
                  <span className="text-zinc-500">Kelas:</span>{' '}
                  <strong className="text-zinc-900">{selectedStudent.className}</strong>
                </div>
                <div>
                  <span className="text-zinc-500">NIS:</span>{' '}
                  <span className="font-mono font-semibold text-zinc-900">{selectedStudent.nis}</span>
                </div>
              </div>
            )}
          </div>

          {/* Target Approver */}
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="target-approver-select"
              className="text-xs font-bold text-zinc-900 flex items-center gap-1.5"
            >
              <GraduationCap className="w-4 h-4 text-emerald-700" />
              <span>Diteruskan ke Wali Kelas / Ustadz Tujuan</span>
              <span className="text-emerald-700" aria-label="Wajib diisi">*</span>
            </label>

            <ApproverSelect
              id="target-approver-select"
              approvers={potentialApprovers}
              selectedId={targetApproverId}
              onSelect={(id) => setTargetApproverId(id)}
            />

            <p className="text-[11px] text-zinc-500 flex items-center gap-1 leading-normal">
              <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>
                Otomatis disesuaikan ke Wali Kelas santri ({selectedTargetUser?.name || 'Ust. Fauzi'}), namun dapat dialihkan jika ada koordinasi khusus.
              </span>
            </p>
          </div>
        </section>

        {/* GROUP 2: Kategori & Jadwal Izin */}
        <section aria-labelledby="section-jadwal" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3.5">
          <div className="border-b border-zinc-100 pb-2.5">
            <h2 id="section-jadwal" className="text-xs font-bold text-zinc-900 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-black">
                2
              </span>
              <span>Kategori & Jadwal Waktu Izin</span>
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5 ml-7">
              Tentukan jenis izin dan estimasi waktu keluar hingga kembali ke pondok.
            </p>
          </div>

          {/* Kategori Toggle */}
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-bold text-zinc-900">
              Kategori Perizinan <span className="text-emerald-700">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-zinc-100 p-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={category === 'KELUAR_SEBENTAR'}
                onClick={() => handleCategoryChange('KELUAR_SEBENTAR')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition select-none min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700',
                  category === 'KELUAR_SEBENTAR'
                    ? 'bg-white text-emerald-950 shadow-xs border border-zinc-200/60'
                    : 'text-zinc-600 hover:text-zinc-900 font-semibold'
                )}
              >
                <Clock className="w-4 h-4 text-emerald-700" />
                <span>Keluar Sebentar</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={category === 'PULANG_MENGINAP'}
                onClick={() => handleCategoryChange('PULANG_MENGINAP')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition select-none min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700',
                  category === 'PULANG_MENGINAP'
                    ? 'bg-white text-emerald-950 shadow-xs border border-zinc-200/60'
                    : 'text-zinc-600 hover:text-zinc-900 font-semibold'
                )}
              >
                <Home className="w-4 h-4 text-emerald-700" />
                <span>Pulang Menginap</span>
              </button>
            </div>
          </fieldset>

          {/* Datetime Pickers */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="planned-departure-input"
                  className="text-xs font-semibold text-zinc-700 block"
                >
                  Rencana Keluar Dari Gerbang <span className="text-emerald-700">*</span>
                </label>
                <input
                  id="planned-departure-input"
                  type="datetime-local"
                  required
                  value={plannedDeparture}
                  onChange={(e) => setPlannedDeparture(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base sm:text-xs font-medium text-zinc-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 min-h-[44px]"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="planned-return-input"
                  className="text-xs font-semibold text-zinc-700 block"
                >
                  Rencana Kembali Ke Pondok <span className="text-emerald-700">*</span>
                </label>
                <input
                  id="planned-return-input"
                  type="datetime-local"
                  required
                  value={plannedReturn}
                  onChange={(e) => setPlannedReturn(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base sm:text-xs font-medium text-zinc-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 min-h-[44px]"
                />
              </div>
            </div>

            {/* Live Duration Calculation Badge */}
            {estimatedDurationMinutes > 0 ? (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-2.5 flex items-center justify-between text-xs text-emerald-950 font-bold">
                <div className="flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-emerald-700" />
                  <span>Estimasi Durasi Izin:</span>
                </div>
                <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-800 text-[11px]">
                  {formatDuration(estimatedDurationMinutes)}
                </span>
              </div>
            ) : null}
          </div>
        </section>

        {/* GROUP 3: Keperluan & Pendamping / Penjemput */}
        <section aria-labelledby="section-keperluan" className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3.5">
          <div className="border-b border-zinc-100 pb-2.5">
            <h2 id="section-keperluan" className="text-xs font-bold text-zinc-900 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-black">
                3
              </span>
              <span>Keperluan & Penjemputan Santri</span>
            </h2>
            <p className="text-[11px] text-zinc-500 mt-0.5 ml-7">
              Cantumkan alasan izin dan rincian siapa yang mendampingi santri.
            </p>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="reason-textarea"
              className="text-xs font-bold text-zinc-900 flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-700" />
              <span>Alasan / Keperluan Izin</span>
              <span className="text-emerald-700" aria-label="Wajib diisi">*</span>
            </label>
            <textarea
              id="reason-textarea"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: Periksa kesehatan ke dokter, acara keluarga mendesak, atau mewakili lomba sekolah..."
              className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-base sm:text-xs font-medium text-zinc-900 placeholder-zinc-500 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 resize-none min-h-[88px]"
            />
          </div>

          {/* Escort Selection */}
          <fieldset className="space-y-2 pt-1">
            <legend className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-emerald-700" />
              <span>Pihak Penjemput / Pendamping Santri</span>
              <span className="text-emerald-700">*</span>
            </legend>

            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Pilihan Penjemput">
              {(
                [
                  { type: 'MANDIRI', label: 'Mandiri (Sendiri)' },
                  { type: 'ORANG_TUA', label: 'Orang Tua / Wali' },
                  { type: 'OJEK_TRAVEL', label: 'Ojek / Travel' },
                  { type: 'SAUDARA', label: 'Ustadz / Saudara' },
                ] as const
              ).map(({ type, label }) => {
                const isSelected = escortType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setEscortType(type)}
                    className={cn(
                      'py-2.5 px-3 rounded-xl border text-xs text-center transition cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700',
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-bold shadow-2xs'
                        : 'border-zinc-200 bg-zinc-50/70 text-zinc-700 hover:bg-zinc-100 font-medium'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <label
                htmlFor="escort-note-input"
                className="text-[11px] font-semibold text-zinc-600 block mb-1"
              >
                Catatan Penjemput (Opsional)
              </label>
              <input
                id="escort-note-input"
                type="text"
                value={escortNote}
                onChange={(e) => setEscortNote(e.target.value)}
                placeholder="Contoh: Dijemput Kakak kandung dengan mobil plat AB 1234 XY"
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base sm:text-xs font-medium text-zinc-900 placeholder-zinc-500 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 min-h-[44px]"
              />
            </div>
          </fieldset>
        </section>

        {/* Accessible Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 flex items-start gap-2.5 text-xs text-rose-900 font-semibold shadow-xs"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Action */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !!selectedStudentPerm}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 py-3.5 px-4 text-xs font-bold text-white shadow-md shadow-emerald-800/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                <span aria-live="polite">
                  Mengirim Permohonan ke {selectedTargetUser?.name || 'Wali Kelas'}...
                </span>
              </>
            ) : selectedStudentPerm?.status === 'PENDING_WALI_KELAS' ? (
              <span>Menunggu Persetujuan Izin Sebelumnya</span>
            ) : selectedStudentPerm ? (
              <span>Santri Sudah Memiliki Izin Aktif</span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>
                  Kirim Permohonan ke {selectedTargetUser?.name?.split(',')[0] || 'Wali Kelas'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
