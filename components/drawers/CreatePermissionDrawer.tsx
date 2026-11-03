'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Student, PermissionCategory, EscortType, UserRole, UserAccount, Permission } from '@/lib/types';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  X,
  Clock,
  Calendar,
  User,
  Check,
  AlertCircle,
  Search,
  FileText,
  ChevronDown,
  Shield,
  Phone,
  Home,
  Timer,
  Car,
  GraduationCap,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatDuration } from '@/lib/utils';
import { markLocalPermissionAction } from '@/lib/notifications';

interface CreatePermissionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  permissions?: Permission[];
  preselectedStudent?: Student | null;
  activeRole: UserRole;
  currentUser: UserAccount | null;
  onSuccess: () => void;
}

const PRESET_REASONS = [
  'Pemeriksaan Kesehatan / Berobat ke Fasilitas Medis',
  'Keperluan Keluarga Mendesak / Takziah',
  "Perpulangan Terjadwal Pondok (Libur Ma'had)",
  'Tugas Akademik / Lomba / Kegiatan Sekolah',
  'Pengurusan Dokumen Resmi (KTP / Paspor / Ijazah)',
  'Keperluan Lainnya (Tulis Sendiri)',
];

export function CreatePermissionDrawer({
  isOpen,
  onClose,
  students,
  permissions = [],
  preselectedStudent = null,
  activeRole,
  currentUser,
  onSuccess,
}: CreatePermissionDrawerProps) {
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

  // Pilihan Santri
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(
    preselectedStudent || (availableStudents.length > 0 ? availableStudents[0] : null)
  );

  useEffect(() => {
    if (preselectedStudent) {
      setSelectedStudent(preselectedStudent);
    } else if (!selectedStudent && availableStudents.length > 0) {
      setSelectedStudent(availableStudents[0]);
    }
  }, [preselectedStudent, availableStudents]);

  // Status izin santri yang dipilih (jika sedang dalam tinjauan / aktif)
  const selectedStudentPerm = useMemo(() => {
    if (!selectedStudent) return null;
    return permissions.find(
      (p) =>
        (p.studentId === selectedStudent.id || (selectedStudent.nis && p.studentNis === selectedStudent.nis)) &&
        (p.status === 'PENDING_WALI_KELAS' || p.status === 'APPROVED_WALI_KELAS' || p.status === 'SEDANG_DI_LUAR')
    );
  }, [selectedStudent, permissions]);

  // Search Dropdown state untuk santri
  const [studentSearch, setStudentSearch] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  // Kategori Izin
  const [category, setCategory] = useState<PermissionCategory>('KELUAR_SEBENTAR');

  // Alasan Izin
  const [selectedReasonOption, setSelectedReasonOption] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');

  // Tanggal & Jam (Dipisahkan)
  const getTodayDateStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getCurrentTimeStr = (offsetMinutes = 60) => {
    const d = new Date(Date.now() + offsetMinutes * 60 * 1000);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const todayStr = useMemo(() => getTodayDateStr(), []);
  const [departureDate, setDepartureDate] = useState<string>(todayStr);
  const [departureTime, setDepartureTime] = useState<string>(getCurrentTimeStr(60));

  const [returnDate, setReturnDate] = useState<string>(todayStr);
  const [returnTime, setReturnTime] = useState<string>(getCurrentTimeStr(240));

  // Penjemput
  const [escortType, setEscortType] = useState<EscortType>('ORANG_TUA');
  const [escortNote, setEscortNote] = useState('');

  // Identitas Pemohon
  const isParent = activeRole === 'ORANG_TUA';
  const [applicantName, setApplicantName] = useState(
    isParent
      ? (selectedStudent?.parentName || 'Wali Santri')
      : (currentUser?.name || 'Petugas')
  );
  const [applicantPhone, setApplicantPhone] = useState(
    isParent
      ? (selectedStudent?.parentPhone || '')
      : (currentUser?.phone || '')
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sinkronisasi pemohon saat santri berubah
  useEffect(() => {
    if (selectedStudent && isParent) {
      setApplicantName(selectedStudent.parentName || 'Wali Santri');
      setApplicantPhone(selectedStudent.parentPhone || '');
    }
  }, [selectedStudent, isParent]);

  // Update default tanggal kembali saat kategori berubah
  useEffect(() => {
    if (category === 'PULANG_MENGINAP') {
      const d = new Date();
      d.setDate(d.getDate() + 2);
      const futureDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      setReturnDate(futureDateStr);
    } else {
      setReturnDate(departureDate);
    }
  }, [category, departureDate]);

  // Click outside listener untuk search dropdown santri
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        studentDropdownRef.current &&
        !studentDropdownRef.current.contains(e.target as Node)
      ) {
        setIsStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter daftar santri
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return availableStudents;
    const q = studentSearch.toLowerCase();
    return availableStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.nis.includes(q) ||
        s.className.toLowerCase().includes(q)
    );
  }, [availableStudents, studentSearch]);

  // Hitung live duration
  const estimatedDurationMinutes = useMemo(() => {
    if (!departureDate || !departureTime || !returnDate || !returnTime) return 0;
    const start = new Date(`${departureDate}T${departureTime}:00`).getTime();
    const end = new Date(`${returnDate}T${returnTime}:00`).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.round((end - start) / (1000 * 60));
  }, [departureDate, departureTime, returnDate, returnTime]);

  // Validasi waktu
  const timeValidation = useMemo(() => {
    const now = new Date();
    const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // 1. Cek tanggal keluar tidak boleh sebelum hari ini
    if (departureDate < todayStr) {
      return { isValid: false, message: 'Tanggal keluar tidak boleh di masa lampau.' };
    }

    // 2. Jika tanggal keluar hari ini, jam keluar tidak boleh lewat jam sekarang
    if (departureDate === todayStr && departureTime < currentHourMin) {
      return {
        isValid: false,
        message: 'Jam keluar tidak boleh di waktu yang sudah lewat hari ini.',
      };
    }

    // 3. Cek tanggal kembali tidak boleh sebelum tanggal keluar
    if (returnDate < departureDate) {
      return {
        isValid: false,
        message: 'Tanggal kembali tidak boleh lebih awal dari tanggal keluar.',
      };
    }

    // 4. Jika tanggal kembali sama dengan tanggal keluar, jam kembali harus lebih dari jam keluar
    if (returnDate === departureDate && returnTime <= departureTime) {
      return {
        isValid: false,
        message: 'Jam rencana kembali harus lebih dari jam rencana keluar.',
      };
    }

    return { isValid: true, message: '' };
  }, [departureDate, departureTime, returnDate, returnTime, todayStr]);

  // Touch Swipe-to-Dismiss Handler
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    if (diff > 0) {
      setDragOffsetY(diff);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (dragOffsetY > 110) {
      onClose();
    }
    setDragOffsetY(0);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrorMessage('Silakan pilih data santri terlebih dahulu.');
      return;
    }

    if (selectedStudentPerm?.status === 'PENDING_WALI_KELAS') {
      const msg = `Santri ${selectedStudent.fullName} masih memiliki permohonan izin yang sedang dalam tinjauan. Tidak bisa menambahkan izin lagi, harus menunggu persetujuan (approve).`;
      setErrorMessage(msg);
      toast.error('Tidak Dapat Mengajukan Izin', { description: msg });
      return;
    }

    if (selectedStudentPerm?.status === 'APPROVED_WALI_KELAS' || selectedStudentPerm?.status === 'SEDANG_DI_LUAR') {
      const msg = `Santri ${selectedStudent.fullName} sudah memiliki perizinan aktif (${selectedStudentPerm.status === 'APPROVED_WALI_KELAS' ? 'telah disetujui' : 'sedang di luar/pulang'}).`;
      setErrorMessage(msg);
      toast.error('Tidak Dapat Mengajukan Izin', { description: msg });
      return;
    }

    if (!timeValidation.isValid) {
      setErrorMessage(timeValidation.message);
      return;
    }

    const finalReason =
      selectedReasonOption === 'Keperluan Lainnya (Tulis Sendiri)'
        ? customReason.trim()
        : selectedReasonOption;

    if (!finalReason) {
      setErrorMessage('Silakan tuliskan alasan izin santri.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const plannedDepIso = new Date(`${departureDate}T${departureTime}:00`).toISOString();
    const plannedRetIso = new Date(`${returnDate}T${returnTime}:00`).toISOString();

    const finalApplicantName = applicantName.trim() || selectedStudent.parentName || 'Wali Santri';
    const finalApplicantPhone = applicantPhone.trim() || selectedStudent.parentPhone || '-';

    try {
      const payload = {
        studentId: selectedStudent.id,
        studentName: selectedStudent.fullName,
        studentNis: selectedStudent.nis,
        className: selectedStudent.className,
        dormitory: selectedStudent.dormitory || '-',
        category,
        reason: finalReason,
        applicantType: activeRole === 'ORANG_TUA' ? 'ORANG_TUA' : 'USTADZ',
        applicantRole: currentUser?.role || activeRole,
        applicantId: currentUser?.id || null,
        applicantName: finalApplicantName,
        applicantPhone: finalApplicantPhone,
        targetApproverName: 'Wali Kelas & Kepala Asrama',
        escortType,
        escortNote: escortNote.trim() || null,
        plannedDeparture: plannedDepIso,
        plannedReturn: plannedRetIso,
      };

      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengajukan izin santri.');
      }

      if (data?.permission?.id) {
        markLocalPermissionAction(data.permission.id, data.permission.status);
      }

      // Success Confetti
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#047857', '#059669', '#10b981', '#34d399'],
        });
      } catch {}

      toast.success('Permohonan Izin Berhasil Diajukan', {
        description: `Izin ananda ${selectedStudent.fullName} berhasil dikirim ke antrean persetujuan.`,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Terjadi kendala saat mengirim permohonan.';
      setErrorMessage(msg);
      toast.error('Gagal Mengajukan Izin', {
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper nama wali kelas
  const getWaliKelasName = (student: Student) => {
    if (student.classroom?.waliKelasName) {
      return student.classroom.waliKelasName;
    }
    return "Wali Kelas";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop: Klik ke area luar otomatis menutup drawer */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container: Muncul dari bawah dengan swipe handle & style khas SMAIT */}
      <div
        ref={sheetRef}
        style={{
          transform: `translateY(${dragOffsetY}px)`,
          transition: dragOffsetY === 0 ? 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        }}
        className="relative z-10 w-full max-w-lg rounded-t-[28px] bg-zinc-50 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border-t border-zinc-200 animate-in slide-in-from-bottom duration-300"
      >
        {/* Top Header & Swipe Handle Bar */}
        <div
          className="pt-2.5 pb-3 px-5 flex flex-col cursor-grab active:cursor-grabbing touch-none select-none bg-white border-b border-zinc-200/80 shrink-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Centered Pill Handle */}
          <div className="w-12 h-1.5 rounded-full bg-zinc-300 mx-auto mb-2 hover:bg-zinc-400 transition-colors" />

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                  <Shield className="w-3 h-3 text-emerald-700" />
                  E-Izin SMAIT Ihsanul Fikri
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 leading-snug">
                Ajukan Permohonan Izin Santri
              </h2>
              <p className="text-[11px] text-zinc-500">
                Otomatis terkirim ke Wali Kelas & Kepala Asrama (cukup salah satu setuju)
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Tutup formulir"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body with Card Architecture */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* GRUP 1: Data Santri & Kategori */}
          <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs space-y-3.5">
            <div className="border-b border-zinc-100 pb-2.5">
              <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                  1
                </span>
                <span>Kategori & Data Santri</span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 ml-7">
                Pilih jenis perizinan dan tentukan santri yang diajukan.
              </p>
            </div>

            {/* 1.1 Kategori Izin (Dropdown) */}
            <div className="space-y-1.5">
              <Label htmlFor="category-select" className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                <span>Kategori Perizinan</span>
                <span className="text-emerald-700">*</span>
              </Label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-700">
                  {category === 'KELUAR_SEBENTAR' ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Home className="w-4 h-4" />
                  )}
                </div>
                <select
                  id="category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PermissionCategory)}
                  className="w-full h-11 pl-10 pr-9 text-xs sm:text-sm font-semibold text-zinc-900 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 cursor-pointer appearance-none shadow-2xs transition"
                >
                  <option value="KELUAR_SEBENTAR">Izin Keluar Sebentar (Tidak Menginap)</option>
                  <option value="PULANG_MENGINAP">Izin Pulang Menginap ke Rumah</option>
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 1.2 Pilihan Santri (Search Dropdown) */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                <span>Cari & Pilih Santri</span>
                <span className="text-emerald-700">*</span>
              </Label>

              {/* Search Dropdown Input */}
              <div ref={studentDropdownRef} className="relative">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Ketik nama, NIS, atau kelas santri..."
                    value={studentSearch}
                    onFocus={() => setIsStudentDropdownOpen(true)}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setIsStudentDropdownOpen(true);
                    }}
                    className="pl-10 pr-9 h-11 text-xs sm:text-sm rounded-xl border-zinc-200 bg-white focus-visible:ring-emerald-700/20 focus-visible:border-emerald-700 shadow-2xs"
                  />
                  {studentSearch && (
                    <button
                      type="button"
                      onClick={() => setStudentSearch('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Hasil Pencarian */}
                {isStudentDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-30 max-h-56 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl p-1 divide-y divide-zinc-100">
                    {filteredStudents.length === 0 ? (
                      <div className="p-3 text-center text-xs text-zinc-500">
                        Santri tidak ditemukan.
                      </div>
                    ) : (
                      filteredStudents.map((s) => {
                        const isPending = permissions.some(
                          (p) =>
                            (p.studentId === s.id || (s.nis && p.studentNis === s.nis)) &&
                            p.status === 'PENDING_WALI_KELAS'
                        );

                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudent(s);
                              setStudentSearch('');
                              setIsStudentDropdownOpen(false);
                            }}
                            className={cn(
                              'w-full text-left p-2.5 rounded-lg flex items-center justify-between text-xs transition-colors cursor-pointer',
                              selectedStudent?.id === s.id
                                ? 'bg-emerald-50 text-emerald-950 font-semibold'
                                : 'hover:bg-zinc-50 text-zinc-800'
                            )}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold truncate text-zinc-900">{s.fullName}</p>
                                {isPending && (
                                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded-md">
                                    Dalam Tinjauan
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 truncate">
                                {s.className} &bull; NIS: {s.nis}
                              </p>
                            </div>
                            {selectedStudent?.id === s.id && (
                              <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Kartu Profil Lengkap Santri Terpilih */}
              {selectedStudent && (
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {selectedStudent.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-zinc-900 text-sm truncate leading-snug">
                        {selectedStudent.fullName}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-bold text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200/70">
                          {selectedStudent.className}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-600 bg-white px-2 py-0.5 rounded-md border border-zinc-200">
                          NIS: {selectedStudent.nis}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block">Wali Santri Terdaftar:</span>
                      <strong className="text-zinc-900 font-semibold">{selectedStudent.parentName}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Nomor WhatsApp:</span>
                      <strong className="text-zinc-900 font-mono font-semibold">{selectedStudent.parentPhone}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-emerald-700" />
                        Wali Kelas:
                      </span>
                      <strong className="text-emerald-900 font-semibold">{getWaliKelasName(selectedStudent)}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500 block flex items-center gap-1">
                        <User className="w-3 h-3 text-emerald-700" />
                        Status Santri:
                      </span>
                      <strong className="text-zinc-900 font-semibold truncate block">
                        {selectedStudent.gender === 'L' ? 'Santri Ikhwan (L)' : 'Santri Akhwat (P)'}
                      </strong>
                    </div>
                  </div>

                  {/* Peringatan jika santri sedang dalam tinjauan atau sudah memiliki izin aktif */}
                  {selectedStudentPerm?.status === 'PENDING_WALI_KELAS' && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2.5 shadow-2xs mt-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-amber-950">Santri Sedang Dalam Tinjauan</p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Santri ini masih memiliki permohonan izin yang sedang dalam tinjauan (menunggu persetujuan). Tidak bisa menambahkan permohonan izin baru sebelum izin ini disetujui (approve).
                        </p>
                      </div>
                    </div>
                  )}

                  {(selectedStudentPerm?.status === 'APPROVED_WALI_KELAS' || selectedStudentPerm?.status === 'SEDANG_DI_LUAR') && (
                    <div className="rounded-xl border border-blue-300 bg-blue-50 p-3 text-xs text-blue-900 flex items-start gap-2.5 shadow-2xs mt-2">
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-blue-950">Santri Sudah Memiliki Izin Aktif</p>
                        <p className="text-[11px] text-blue-800 leading-relaxed">
                          {selectedStudentPerm.status === 'APPROVED_WALI_KELAS'
                            ? 'Izin santri telah disetujui dan siap keluar gerbang. Tidak bisa mengajukan izin baru.'
                            : 'Santri saat ini tercatat sedang berada di luar pondok / pulang. Pengajuan izin baru hanya dapat dilakukan setelah santri kembali.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* GRUP 2: Jadwal & Waktu Izin */}
          <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs space-y-3.5">
            <div className="border-b border-zinc-100 pb-2.5">
              <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                  2
                </span>
                <span>Waktu Rencana Izin</span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 ml-7">
                Tanggal dan jam rencana keluar hingga kembali ke pondok.
              </p>
            </div>

            <div className="space-y-3">
              {/* Card Rencana Keluar (Amber Theme) */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    Rencana Keluar Pondok
                  </span>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                    Gerbang Ma'had
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="dep-date" className="text-[11px] text-zinc-600 font-medium">
                      Tanggal Keluar
                    </Label>
                    <Input
                      id="dep-date"
                      type="date"
                      min={todayStr}
                      value={departureDate}
                      onChange={(e) => {
                        setDepartureDate(e.target.value);
                        if (returnDate < e.target.value) {
                          setReturnDate(e.target.value);
                        }
                      }}
                      className="h-10 text-xs rounded-lg border-zinc-200 bg-white focus-visible:ring-amber-500/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dep-time" className="text-[11px] text-zinc-600 font-medium">
                      Jam Keluar
                    </Label>
                    <Input
                      id="dep-time"
                      type="time"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      className="h-10 text-xs rounded-lg border-zinc-200 bg-white focus-visible:ring-amber-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Card Rencana Kembali (Emerald Theme) */}
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                    Rencana Kembali ke Pondok
                  </span>
                  <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                    Tiba di Pondok
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="ret-date" className="text-[11px] text-zinc-600 font-medium">
                      Tanggal Kembali
                    </Label>
                    <Input
                      id="ret-date"
                      type="date"
                      min={departureDate || todayStr}
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                      className="h-10 text-xs rounded-lg border-zinc-200 bg-white focus-visible:ring-emerald-700/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ret-time" className="text-[11px] text-zinc-600 font-medium">
                      Jam Kembali
                    </Label>
                    <Input
                      id="ret-time"
                      type="time"
                      value={returnTime}
                      onChange={(e) => setReturnTime(e.target.value)}
                      className="h-10 text-xs rounded-lg border-zinc-200 bg-white focus-visible:ring-emerald-700/20"
                    />
                  </div>
                </div>
              </div>

              {/* Live Duration Calculation Badge */}
              {estimatedDurationMinutes > 0 && timeValidation.isValid && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-2.5 flex items-center justify-between text-xs text-emerald-950 font-bold">
                  <div className="flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-emerald-700" />
                    <span>Estimasi Durasi Izin:</span>
                  </div>
                  <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-800 text-[11px]">
                    {formatDuration(estimatedDurationMinutes)}
                  </span>
                </div>
              )}

              {/* Notifikasi Validasi Waktu Real-time */}
              {!timeValidation.isValid && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-800 font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{timeValidation.message}</span>
                </div>
              )}
            </div>
          </section>

          {/* GRUP 3: Keperluan & Penjemputan */}
          <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs space-y-3.5">
            <div className="border-b border-zinc-100 pb-2.5">
              <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                  3
                </span>
                <span>Keperluan & Penjemputan</span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 ml-7">
                Alasan izin dan rincian pihak yang mendampingi santri.
              </p>
            </div>

            {/* 3.1 Alasan Izin (Dropdown Pilihan Opsi) */}
            <div className="space-y-1.5">
              <Label htmlFor="reason-select" className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>Alasan / Keperluan Izin</span>
                <span className="text-emerald-700">*</span>
              </Label>
              <div className="relative">
                <select
                  id="reason-select"
                  value={selectedReasonOption}
                  onChange={(e) => setSelectedReasonOption(e.target.value)}
                  className="w-full h-11 px-3.5 pr-9 text-xs sm:text-sm font-semibold text-zinc-900 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 cursor-pointer appearance-none shadow-2xs transition"
                >
                  {PRESET_REASONS.map((opt, idx) => (
                    <option key={idx} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Input Tambahan Jika Memilih 'Keperluan Lainnya' */}
              {selectedReasonOption === 'Keperluan Lainnya (Tulis Sendiri)' && (
                <div className="pt-1.5">
                  <Textarea
                    placeholder="Tuliskan alasan lengkap izin santri..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    className="text-xs min-h-[72px] rounded-xl border-zinc-200 bg-white focus-visible:ring-emerald-700/20 focus-visible:border-emerald-700"
                  />
                </div>
              )}
            </div>

            {/* 3.2 Penjemput (Dropdown) */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="escort-select" className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-emerald-700" />
                <span>Pihak Penjemput</span>
                <span className="text-emerald-700">*</span>
              </Label>
              <div className="relative">
                <select
                  id="escort-select"
                  value={escortType}
                  onChange={(e) => setEscortType(e.target.value as EscortType)}
                  className="w-full h-11 px-3.5 pr-9 text-xs sm:text-sm font-semibold text-zinc-900 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 cursor-pointer appearance-none shadow-2xs transition"
                >
                  <option value="ORANG_TUA">Orang Tua Kandung</option>
                  <option value="SAUDARA">Saudara / Kerabat Mahram Terdaftar</option>
                  <option value="OJEK_TRAVEL">Ojek / Travel Jemputan Resmi</option>
                  <option value="MANDIRI">Mandiri / Sendiri</option>
                  <option value="LAINNYA">Lainnya</option>
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <Input
                type="text"
                placeholder="Catatan penjemput (plat kendaraan / nama penjemput jika kerabat)..."
                value={escortNote}
                onChange={(e) => setEscortNote(e.target.value)}
                className="h-10 text-xs rounded-xl border-zinc-200 bg-white focus-visible:ring-emerald-700/20"
              />
            </div>
          </section>

          {/* GRUP 4: Kontak Pemohon (Opsional) */}
          <section className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs space-y-3.5">
            <div className="border-b border-zinc-100 pb-2.5">
              <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                  4
                </span>
                <span>Kontak Pemohon</span>
                <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
                  Opsional
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5 ml-7">
                Kontak aktif yang dapat dihubungi selama santri berizin (boleh dikosongkan).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-zinc-600 flex items-center gap-1">
                  <User className="w-3 h-3 text-zinc-500" />
                  <span>Nama Pemohon</span>
                  <span className="text-[10px] text-zinc-400 font-normal">(Opsional)</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Nama Pemohon"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="h-10 text-xs rounded-xl border-zinc-200 bg-white focus-visible:ring-emerald-700/20"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-zinc-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-700" />
                  <span>Nomor WhatsApp</span>
                  <span className="text-[10px] text-zinc-400 font-normal">(Opsional)</span>
                </Label>
                <Input
                  type="tel"
                  placeholder="08123456789"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  className="h-10 text-xs rounded-xl border-zinc-200 bg-white font-mono focus-visible:ring-emerald-700/20"
                />
              </div>
            </div>

            {/* Catatan alur persetujuan */}
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 p-2.5 flex items-start gap-2 text-[11px] text-emerald-950">
              <Shield className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                Permohonan otomatis terkirim ke <strong>Wali Kelas</strong> dan <strong>Kepala Asrama</strong>. Begitu salah satu pihak menyetujui, santri langsung dapat keluar melalui pos satpam.
              </span>
            </div>
          </section>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 flex items-center gap-2 text-xs text-rose-900 font-semibold shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sticky Bottom Footer: Tanpa Simbol + */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-3 pb-3 -mx-4 px-4 border-t border-zinc-200/80 flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl border-zinc-200 font-bold text-zinc-700 hover:bg-zinc-100 text-xs sm:text-sm cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !timeValidation.isValid || !!selectedStudentPerm}
              className="flex-2 h-12 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-900/15 cursor-pointer active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isSubmitting
                  ? 'Mengirim Permohonan...'
                  : selectedStudentPerm?.status === 'PENDING_WALI_KELAS'
                  ? 'Menunggu Persetujuan Izin Sebelumnya'
                  : selectedStudentPerm
                  ? 'Santri Sudah Memiliki Izin Aktif'
                  : 'Kirim Permohonan Izin'}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}