'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, Permission, UserAccount, UserRole, PesiarSchedule } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  CalendarClock,
  Clock,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  LogIn,
  RotateCw,
  Plus,
  Trash2,
  Calendar,
  Save,
  Check,
  ChevronRight,
  ShieldAlert,
  Car,
  UserCheck,
  Bike,
  Sparkles,
  Info,
} from 'lucide-react';
import { cn, formatDateTime, formatTimeOnly, formatDuration } from '@/lib/utils';
import { toast } from 'sonner';
import { PesiarScheduleSkeleton } from '@/components/skeletons/AppSkeletons';

interface PesiarViewProps {
  currentUser: UserAccount;
  students: Student[];
  permissions: Permission[];
  onRefresh: () => void;
  activeRole: UserRole;
}

export function PesiarView({
  currentUser,
  students,
  permissions,
  onRefresh,
  activeRole,
}: PesiarViewProps) {
  // Today's date in local YYYY-MM-DD
  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayDateStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [schedules, setSchedules] = useState<PesiarSchedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  // Form states for selected schedule
  const [startTime, setStartTime] = useState<string>('08:00');
  const [returnTime, setReturnTime] = useState<string>('17:00');
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isUpdatingReturn, setIsUpdatingReturn] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [dormFilter, setDormFilter] = useState('ALL');
  const [viewTab, setViewTab] = useState<'PENGELUARAN' | 'SEDANG_KELUAR' | 'RIWAYAT_SELESAI'>('PENGELUARAN');

  // Helper formatting date ID safely without timezone shift
  const formatSafeIndonesianDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (!y || !m || !d) return dateStr;
      const dateObj = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(dateObj);
    } catch {
      return dateStr;
    }
  };

  // Escort per student: { [studentId]: 'ORANG_TUA' | 'MANDIRI' | 'OJEK_TRAVEL' | 'SAUDARA' }
  const [escortSelections, setEscortSelections] = useState<
    Record<string, 'ORANG_TUA' | 'MANDIRI' | 'OJEK_TRAVEL' | 'SAUDARA'>
  >({});

  // Action status
  const [processingStudentId, setProcessingStudentId] = useState<string | null>(null);
  const [processingReturnId, setProcessingReturnId] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Modal toggle for managing all dates
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newScheduleDate, setNewScheduleDate] = useState(todayDateStr);
  const [newScheduleStart, setNewScheduleStart] = useState('08:00');
  const [newScheduleReturn, setNewScheduleReturn] = useState('17:00');

  // Load Pesiar schedules from server
  const fetchSchedules = useCallback(async () => {
    setIsLoadingSchedules(true);
    try {
      const res = await fetch('/api/pesiar');
      const data = await res.json();
      if (data.schedules) {
        setSchedules(data.schedules);
      }
    } catch (e) {
      console.error('Failed to load pesiar schedules', e);
    } finally {
      setIsLoadingSchedules(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Cek apakah hari ini ada jadwal pesiar yang aktif
  const todaySchedule = useMemo(() => {
    return schedules.find((s) => s.date === todayDateStr && s.isActive !== false) || null;
  }, [schedules, todayDateStr]);

  const isTodayPesiar = Boolean(todaySchedule);

  // Jadwal pesiar terdekat mendatang
  const nextUpcomingSchedule = useMemo(() => {
    return schedules
      .filter((s) => s.date > todayDateStr && s.isActive !== false)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  }, [schedules, todayDateStr]);

  // Active schedule for the currently selected date
  const currentSchedule = useMemo(() => {
    return schedules.find((s) => s.date === selectedDate) || null;
  }, [schedules, selectedDate]);

  // Sync inputs when todaySchedule or currentSchedule changes
  useEffect(() => {
    if (todaySchedule) {
      setSelectedDate(todayDateStr);
      setStartTime(todaySchedule.startTime || '08:00');
      setReturnTime(todaySchedule.returnTime || '17:00');
    } else if (currentSchedule) {
      setStartTime(currentSchedule.startTime || '08:00');
      setReturnTime(currentSchedule.returnTime || '17:00');
    } else {
      setStartTime('08:00');
      setReturnTime('17:00');
    }
  }, [todaySchedule, currentSchedule, todayDateStr]);

  // Permissions of category PESIAR on selectedDate
  const pesiarPermissionsOnDate = useMemo(() => {
    return permissions.filter((p) => {
      if (p.category !== 'PESIAR') return false;
      const matchDeparture = p.plannedDeparture?.startsWith(selectedDate);
      const matchCreated = p.createdAt?.startsWith(selectedDate);
      return matchDeparture || matchCreated;
    });
  }, [permissions, selectedDate]);

  // Active students outside
  const activeOutsidePesiar = useMemo(() => {
    return pesiarPermissionsOnDate.filter((p) => p.status === 'SEDANG_DI_LUAR');
  }, [pesiarPermissionsOnDate]);

  // Completed pesiar (returned)
  const completedPesiar = useMemo(() => {
    return pesiarPermissionsOnDate.filter(
      (p) => p.status === 'KEMBALI_TEPAT_WAKTU' || p.status === 'KEMBALI_TERLAMBAT'
    );
  }, [pesiarPermissionsOnDate]);

  // Map of studentId -> active permission
  const studentActiveMap = useMemo(() => {
    const map: Record<string, Permission> = {};
    for (const p of permissions) {
      if (p.status === 'SEDANG_DI_LUAR') {
        map[p.studentId] = p;
      }
    }
    return map;
  }, [permissions]);

  // Classes & Dorms for dropdown
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => s.className && set.add(s.className));
    return Array.from(set).sort();
  }, [students]);

  const uniqueDorms = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.dormitory) {
        set.add(s.dormitory.split('(')[0].trim());
      }
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered students for quick table
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nis.includes(searchQuery) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.dormitory.toLowerCase().includes(searchQuery.toLowerCase());

      const matchClass = classFilter === 'ALL' || s.className === classFilter;
      const matchDorm =
        dormFilter === 'ALL' || s.dormitory.toLowerCase().includes(dormFilter.toLowerCase());

      return matchSearch && matchClass && matchDorm;
    });
  }, [students, searchQuery, classFilter, dormFilter]);

  // Filtered santri yang sedang di luar pesiar
  const filteredActiveOutside = useMemo(() => {
    return activeOutsidePesiar.filter((p) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.studentNis.includes(searchQuery) ||
        p.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.dormitory.toLowerCase().includes(searchQuery.toLowerCase());

      const matchClass = classFilter === 'ALL' || p.className === classFilter;
      const matchDorm =
        dormFilter === 'ALL' || p.dormitory.toLowerCase().includes(dormFilter.toLowerCase());

      return matchSearch && matchClass && matchDorm;
    });
  }, [activeOutsidePesiar, searchQuery, classFilter, dormFilter]);

  // Filtered santri yang sudah selesai dan kembali
  const filteredCompletedPesiar = useMemo(() => {
    return completedPesiar.filter((p) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.studentNis.includes(searchQuery) ||
        p.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.dormitory.toLowerCase().includes(searchQuery.toLowerCase());

      const matchClass = classFilter === 'ALL' || p.className === classFilter;
      const matchDorm =
        dormFilter === 'ALL' || p.dormitory.toLowerCase().includes(dormFilter.toLowerCase());

      return matchSearch && matchClass && matchDorm;
    });
  }, [completedPesiar, searchQuery, classFilter, dormFilter]);

  // Handle Tambah Jadwal Baru (Khusus Kepala Asrama / Super Admin)
  const handleAddNewSchedule = async () => {
    if (!newScheduleDate) return;
    setIsSavingSchedule(true);
    setActionAlert(null);
    try {
      const res = await fetch('/api/pesiar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newScheduleDate,
          startTime: newScheduleStart,
          returnTime: newScheduleReturn,
          actorId: currentUser.id,
          actorName: currentUser.name,
          description: `Pesiar Santri ${newScheduleDate}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan jadwal pesiar');

      const msg = `Jadwal pesiar tanggal ${newScheduleDate} berhasil disimpan.`;
      setActionAlert({ type: 'success', text: msg });
      toast.success('Jadwal Pesiar Ditambahkan', { description: msg });
      await fetchSchedules();
      setShowScheduleModal(false);
    } catch (err: any) {
      const errMsg = err.message || 'Gagal menyimpan jadwal pesiar';
      setActionAlert({ type: 'error', text: errMsg });
      toast.error('Gagal Menyimpan Jadwal', { description: errMsg });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Handle Save or Update Schedule for Selected Date
  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    setActionAlert(null);
    try {
      const res = await fetch('/api/pesiar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          startTime,
          returnTime,
          actorId: currentUser.id,
          actorName: currentUser.name,
          description: `Pesiar Santri ${selectedDate}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan jadwal');

      const msg = `Jadwal pesiar tanggal ${selectedDate} (Batas pulang ${returnTime} WIB) berhasil diaktifkan!`;
      setActionAlert({
        type: 'success',
        text: msg,
      });
      toast.success('Jadwal Pesiar Disimpan', {
        description: msg,
      });
      await fetchSchedules();
    } catch (err: any) {
      const errMsg = err.message || 'Gagal menyimpan jadwal';
      setActionAlert({ type: 'error', text: errMsg });
      toast.error('Gagal Menyimpan Jadwal Pesiar', { description: errMsg });
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Handle Extend / Update Return Time on the Fly with Cascade Sync
  const handleSyncReturnTime = async () => {
    if (!returnTime) return;
    setIsUpdatingReturn(true);
    setActionAlert(null);
    try {
      const res = await fetch('/api/pesiar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          returnTime,
          startTime,
          actorId: currentUser.id,
          actorName: currentUser.name,
          syncActive: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui jam kepulangan');

      const msg = `Batas kepulangan berhasil diubah menjadi ${returnTime} WIB. ${
        data.updatedActiveStudentsCount || 0
      } santri yang sedang di luar otomatis disinkronkan.`;
      setActionAlert({
        type: 'success',
        text: msg,
      });
      toast.success('Jam Kepulangan Disinkronkan', {
        description: msg,
      });
      await fetchSchedules();
      onRefresh();
    } catch (err: any) {
      const errMsg = err.message || 'Gagal mengupdate jam pulang';
      setActionAlert({ type: 'error', text: errMsg });
      toast.error('Gagal Mengupdate Jam Pulang', { description: errMsg });
    } finally {
      setIsUpdatingReturn(false);
    }
  };

  // Quick Approval Checkout Action
  const handleQuickCheckout = async (student: Student) => {
    setProcessingStudentId(student.id);
    setActionAlert(null);

    const escort = escortSelections[student.id] || 'ORANG_TUA';
    try {
      const res = await fetch('/api/pesiar/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          escortType: escort,
          pesiarDate: selectedDate,
          returnTime: returnTime || '17:00',
          actorId: currentUser.id,
          actorName: currentUser.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses santri');
      }

      const msg = `Alhamdulillah, ${student.fullName} berhasil dikeluarkan untuk pesiar (Batas: ${returnTime} WIB).`;
      setActionAlert({
        type: 'success',
        text: msg,
      });
      toast.success('Check-out Pesiar Berhasil', {
        description: msg,
      });
      onRefresh();
    } catch (err: any) {
      const errMsg = err.message || 'Gagal memproses santri';
      setActionAlert({ type: 'error', text: errMsg });
      toast.error('Gagal Memproses Pesiar', { description: errMsg });
    } finally {
      setProcessingStudentId(null);
    }
  };

  // Quick Return Check-In Action (Musrif Piket & Kepala Asrama)
  const handleCheckInReturn = async (permissionId: string, studentName: string) => {
    setProcessingReturnId(permissionId);
    setActionAlert(null);

    try {
      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: permissionId,
          status: 'KEMBALI_TEPAT_WAKTU', // Backend evaluates calculateLateMinutes automatically
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: activeRole,
          note: `Santri melapor kepulangan pesiar ke ${currentUser.name} (${
            activeRole === 'KEPALA_ASRAMA' || activeRole === 'SUPER_ADMIN' ? 'Kepala Asrama / Super Admin' : 'Musrif Piket'
          }).`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mencatat kepulangan');
      }

      const updatedPerm = data.permission;
      const isLate = updatedPerm?.status === 'KEMBALI_TERLAMBAT';

      const alertMsg = isLate
        ? `Santri ${studentName} tercatat KEMBALI TERLAMBAT (${updatedPerm.lateDurationMinutes || 0} menit). Catatan telah disimpan.`
        : `Santri ${studentName} berhasil dicek kembali TEPAT WAKTU. Status selesai.`;

      setActionAlert({
        type: isLate ? 'error' : 'success',
        text: alertMsg,
      });

      if (isLate) {
        toast.warning('Santri Kembali Terlambat', {
          description: `Santri ${studentName} terlambat ${updatedPerm.lateDurationMinutes || 0} menit.`,
        });
      } else {
        toast.success('Santri Kembali Tepat Waktu', {
          description: `Santri ${studentName} berhasil dicek kembali ke asrama.`,
        });
      }

      onRefresh();
    } catch (err: any) {
      const errMsg = err.message || 'Gagal mencatat kepulangan';
      setActionAlert({ type: 'error', text: errMsg });
      toast.error('Gagal Verifikasi Kepulangan', { description: errMsg });
    } finally {
      setProcessingReturnId(null);
    }
  };

  // Handle Delete Schedule
  const handleDeleteSchedule = async (date: string) => {
    if (!confirm(`Yakin ingin menghapus jadwal pesiar tanggal ${date}?`)) return;
    try {
      const res = await fetch(`/api/pesiar?date=${date}`, { method: 'DELETE' });
      if (res.ok) {
        fetchSchedules();
        const msg = `Jadwal pesiar tanggal ${date} telah dihapus.`;
        setActionAlert({ type: 'success', text: msg });
        toast.info('Jadwal Pesiar Dihapus', { description: msg });
      } else {
        throw new Error('Gagal menghapus jadwal pesiar');
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Gagal Menghapus Jadwal', { description: e?.message || 'Terjadi kesalahan sistem.' });
    }
  };

  const isScheduleActiveForSelectedDate = Boolean(currentSchedule?.isActive);

  return (
    <div className="space-y-4 pb-12">
      {/* Alert Notification Toast */}
      {actionAlert && (
        <div
          className={cn(
            'rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 border',
            actionAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          )}
        >
          <div className="flex items-center gap-2">
            {actionAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
            )}
            <p className="font-medium leading-relaxed">{actionAlert.text}</p>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="text-zinc-400 hover:text-zinc-700 font-bold px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Modal Kelola Daftar Tanggal Pesiar (Khusus Kepala Asrama / Super Admin) */}
      {showScheduleModal && (
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 space-y-4 text-xs animate-in fade-in-50 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Kelola Jadwal Pesiar Santri</h3>
              <p className="text-[11px] text-zinc-500">Atur tanggal dan batas kepulangan resmi pesiar</p>
            </div>
            <button
              onClick={() => setShowScheduleModal(false)}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 px-2 py-1 rounded-md hover:bg-zinc-200/60 cursor-pointer"
            >
              Tutup
            </button>
          </div>

          {/* Form Tambah / Tetapkan Tanggal Baru */}
          <div className="bg-white p-3.5 rounded-lg border border-zinc-200 space-y-3">
            <h4 className="font-semibold text-zinc-900">Tetapkan Jadwal Pesiar Baru</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 mb-1">Tanggal Pesiar</label>
                <Input
                  type="date"
                  value={newScheduleDate}
                  onChange={(e) => setNewScheduleDate(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 mb-1">Jam Mulai Keluar</label>
                <Input
                  type="time"
                  value={newScheduleStart}
                  onChange={(e) => setNewScheduleStart(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-zinc-600 mb-1">Batas Jam Kepulangan (WIB)</label>
                <Input
                  type="time"
                  value={newScheduleReturn}
                  onChange={(e) => setNewScheduleReturn(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                onClick={handleAddNewSchedule}
                disabled={isSavingSchedule}
                className="h-8 text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {isSavingSchedule ? 'Menyimpan...' : 'Simpan Jadwal Pesiar'}
              </Button>
            </div>
          </div>

          {/* Daftar Jadwal yang Ada */}
          <div className="space-y-1.5">
            <h4 className="font-semibold text-zinc-700">Daftar Jadwal Pesiar Tersimpan ({schedules.length})</h4>
            {isLoadingSchedules ? (
              <PesiarScheduleSkeleton />
            ) : schedules.length === 0 ? (
              <p className="text-zinc-500 text-center py-4 bg-white rounded-lg border border-zinc-200">
                Belum ada tanggal pesiar tersimpan.
              </p>
            ) : (
              <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-lg bg-white overflow-hidden max-h-60 overflow-y-auto">
                {schedules.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 flex items-center justify-between hover:bg-zinc-50/80 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-zinc-900 font-semibold">{formatSafeIndonesianDate(item.date)}</strong>
                        {item.date === todayDateStr && (
                          <Badge variant="approved" className="text-[10px]">
                            Hari Ini
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">
                        Keluar: {item.startTime} WIB &bull; Batas Kembali: {item.returnTime} WIB
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSchedule(item.date)}
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAMPILAN JIKA TIDAK ADA JADWAL PESIAR HARI INI */}
      {!isTodayPesiar && (
        <Card className="rounded-2xl border border-zinc-200/90 bg-white p-6 sm:p-8 text-center space-y-3.5 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto text-zinc-500">
            <CalendarClock className="w-6 h-6 text-zinc-600" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900">
              Tidak Ada Jadwal Pesiar Hari Ini
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              {nextUpcomingSchedule ? (
                <>
                  Jadwal pesiar terdekat pada hari{' '}
                  <strong className="text-zinc-900 font-semibold">{formatSafeIndonesianDate(nextUpcomingSchedule.date)}</strong>
                  , mulai pukul{' '}
                  <strong className="text-zinc-900 font-semibold">{nextUpcomingSchedule.startTime}</strong>{' '}
                  s.d.{' '}
                  <strong className="text-zinc-900 font-semibold">{nextUpcomingSchedule.returnTime} WIB</strong>.
                </>
              ) : (
                'Belum ada jadwal pesiar mendatang yang ditetapkan oleh Kepala Asrama.'
              )}
            </p>
          </div>

          {(activeRole === 'KEPALA_ASRAMA' || activeRole === 'SUPER_ADMIN') && (
            <div className="pt-2">
              <Button
                size="sm"
                onClick={() => setShowScheduleModal(true)}
                className="text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-semibold cursor-pointer"
              >
                <CalendarClock className="w-3.5 h-3.5 mr-1.5" />
                Kelola & Jadwalkan Pesiar
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* TAMPILAN JIKA HARI INI JADWAL PESIAR AKTIF (HARI H) */}
      {isTodayPesiar && (
        <div className="space-y-4">
          {/* Header Ringkas Hari H Pesiar Aktif */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:px-4 rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-950">
                    Jadwal Pesiar Hari Ini Aktif
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                    Hari H
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Mulai pukul <strong>{todaySchedule?.startTime || '08:00'}</strong> WIB &bull; Batas kembali:{' '}
                  <strong>{todaySchedule?.returnTime || returnTime}</strong> WIB
                </p>
              </div>
            </div>

            {(activeRole === 'KEPALA_ASRAMA' || activeRole === 'SUPER_ADMIN') && (
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScheduleModal(true)}
                  className="text-xs h-8 border-emerald-300 text-emerald-900 hover:bg-emerald-100/70 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                  Kelola Jadwal
                </Button>
              </div>
            )}
          </div>

          {/* Navigasi Tab Tampilan Pesiar Hari H: Mode Cepat Pengeluaran vs Sedang Pesiar vs Riwayat Selesai */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl">
            <button
              onClick={() => setViewTab('PENGELUARAN')}
              className={cn(
                'flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                viewTab === 'PENGELUARAN'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              <LogOut className="w-3.5 h-3.5 text-emerald-700" />
              <span>Keluarkan Santri</span>
            </button>

            <button
              onClick={() => setViewTab('SEDANG_KELUAR')}
              className={cn(
                'flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                viewTab === 'SEDANG_KELUAR'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Sedang Pesiar ({activeOutsidePesiar.length})</span>
            </button>

            <button
              onClick={() => setViewTab('RIWAYAT_SELESAI')}
              className={cn(
                'flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                viewTab === 'RIWAYAT_SELESAI'
                  ? 'bg-white text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>Selesai Kembali ({completedPesiar.length})</span>
            </button>
          </div>

          {/* Toolbar Universal: Pencarian & Filter Kelas */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="Cari nama santri, NIS, kamar, atau kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 bg-white border-zinc-200 text-xs rounded-xl focus-visible:ring-emerald-600/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-xs"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="h-9 px-2.5 bg-white border border-zinc-200 text-xs rounded-xl text-zinc-700 font-medium focus:outline-emerald-600"
              >
                <option value="ALL">Semua Kelas ({uniqueClasses.length})</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={dormFilter}
                onChange={(e) => setDormFilter(e.target.value)}
                className="h-9 px-2.5 bg-white border border-zinc-200 text-xs rounded-xl text-zinc-700 font-medium focus:outline-emerald-600 max-w-[150px] truncate"
              >
                <option value="ALL">Semua Asrama</option>
                {uniqueDorms.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

      {/* TAB 1: MODE CEPAT PENGELUARAN SANTRI (TABLE QUICK-ROW) */}
      {viewTab === 'PENGELUARAN' && (
        <div className="space-y-3">
          {/* Table Quick-Row Daftar Santri */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs divide-y divide-zinc-100">
            {filteredStudents.length === 0 ? (
              <div className="py-10 text-center text-xs text-zinc-500">
                Santri tidak ditemukan dengan filter yang dipilih.
              </div>
            ) : (
              filteredStudents.map((student) => {
                const activePerm = studentActiveMap[student.id];
                const isOutside = Boolean(activePerm);
                const isProcessing = processingStudentId === student.id;
                const currentEscort = escortSelections[student.id] || 'ORANG_TUA';

                return (
                  <div
                    key={student.id}
                    className={cn(
                      'p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                      isOutside ? 'bg-amber-50/40' : 'hover:bg-zinc-50/80'
                    )}
                  >
                    {/* Info Santri */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border',
                          isOutside
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        )}
                      >
                        {student.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
                            {student.fullName}
                          </h4>
                          {isOutside ? (
                            <Badge variant="active" className="text-[10px] py-0 px-1.5">
                              Sedang di Luar
                            </Badge>
                          ) : (
                            <Badge variant="approved" className="text-[10px] py-0 px-1.5">
                              Di Asrama
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {student.className} &bull; NIS: {student.nis} &bull;{' '}
                          {student.dormitory.split('(')[0].trim()}
                        </p>
                      </div>
                    </div>

                    {/* Quick Selection Dropdown Pengantar + Tombol Aksi */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
                      {isOutside ? (
                        <div className="text-right">
                          <span className="text-[11px] text-zinc-500 block">
                            Batas Kembali: {formatTimeOnly(activePerm.plannedReturn)}
                          </span>
                          <span className="text-[10px] text-amber-700 font-semibold block">
                            Pengantar: {activePerm.escortNote || activePerm.escortType}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {/* Dropdown Pengantar */}
                          <select
                            value={currentEscort}
                            onChange={(e) =>
                              setEscortSelections((prev) => ({
                                ...prev,
                                [student.id]: e.target.value as any,
                              }))
                            }
                            className="h-8 px-2 bg-zinc-50 border border-zinc-200 text-xs rounded-lg text-zinc-800 focus:outline-emerald-700 font-medium shrink-0 cursor-pointer"
                          >
                            <option value="ORANG_TUA">
                              Orang Tua ({student.parentName ? student.parentName.split(' ')[0] : 'Wali'})
                            </option>
                            <option value="MANDIRI">Mandiri (Sendiri)</option>
                            <option value="OJEK_TRAVEL">Ojek / Travel</option>
                            <option value="SAUDARA">Saudara / Kerabat</option>
                          </select>

                          {/* Tombol Kilat Keluarkan */}
                          <Button
                            size="sm"
                            onClick={() => handleQuickCheckout(student)}
                            disabled={isProcessing}
                            className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 rounded-lg shadow-2xs whitespace-nowrap ml-auto sm:ml-0 cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5 mr-1" />
                            {isProcessing ? 'Memproses...' : 'Keluarkan'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SANTRI SEDANG DI LUAR PESIAR & TOMBOL CEPAT CHECK-IN */}
      {viewTab === 'SEDANG_KELUAR' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Santri Sedang Pesiar ({activeOutsidePesiar.length})
              </h2>
              <p className="text-xs text-zinc-500">
                Batas kembali resmi hari ini: <strong>{returnTime} WIB</strong>. Konfirmasi langsung
                ketika santri tiba.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-7 text-xs border-zinc-200 text-zinc-600 hover:bg-zinc-50 cursor-pointer"
            >
              <RotateCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>

          {filteredActiveOutside.length === 0 ? (
            <Card className="p-8 text-center rounded-xl border border-zinc-200 bg-white">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-2.5 text-emerald-700">
                <Check className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900">
                {activeOutsidePesiar.length > 0 ? 'Santri Tidak Ditemukan' : 'Tidak Ada Santri di Luar'}
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                {activeOutsidePesiar.length > 0
                  ? 'Tidak ada santri sedang pesiar yang sesuai dengan pencarian atau filter kelas ini.'
                  : 'Semua santri saat ini berada di dalam asrama, atau belum ada yang dikeluarkan untuk pesiar hari ini.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2.5">
              {filteredActiveOutside.map((perm) => {
                const isBusy = processingReturnId === perm.id;
                const isLate = new Date() > new Date(perm.plannedReturn);
                const lateMins = isLate
                  ? Math.round(
                      (new Date().getTime() - new Date(perm.plannedReturn).getTime()) / (1000 * 60)
                    )
                  : 0;

                return (
                  <Card
                    key={perm.id}
                    className={cn(
                      'p-3.5 sm:p-4 rounded-xl border transition-all space-y-2.5 shadow-2xs',
                      isLate
                        ? 'bg-rose-50/30 border-rose-200'
                        : 'bg-white border-zinc-200/90 hover:border-zinc-300'
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Santri identity */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border',
                            isLate
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          )}
                        >
                          {perm.studentName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-zinc-900 truncate">
                            {perm.studentName}
                          </h4>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                            {perm.className} &bull; NIS: {perm.studentNis} &bull;{' '}
                            {perm.dormitory.split('(')[0].trim()}
                          </p>
                        </div>
                      </div>

                      {/* Status Keterlambatan / Sisa Waktu */}
                      <div className="text-right shrink-0">
                        {isLate ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Telat {formatDuration(lateMins)}</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Batas: {formatTimeOnly(perm.plannedReturn)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rincian Pengantar & Jam Keluar */}
                    <div className="rounded-lg bg-zinc-50 p-2 border border-zinc-200/70 flex flex-wrap items-center justify-between text-xs text-zinc-600 gap-1.5">
                      <div>
                        Keluar: <strong>{formatDateTime(perm.actualDeparture)}</strong>
                      </div>
                      <div>
                        Pengantar: <strong>{perm.escortNote || perm.escortType}</strong>
                      </div>
                    </div>

                    {/* Tombol Konfirmasi Kembali (Check-In) */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100">
                      <span className="text-[11px] text-zinc-500 italic">
                        Petugas pencatat: <strong>{currentUser.name}</strong>
                      </span>

                      <Button
                        size="sm"
                        onClick={() => handleCheckInReturn(perm.id, perm.studentName)}
                        disabled={isBusy}
                        className={cn(
                          'h-8 text-xs font-bold px-3.5 rounded-lg text-white shadow-2xs cursor-pointer',
                          isLate
                            ? 'bg-rose-700 hover:bg-rose-800'
                            : 'bg-emerald-700 hover:bg-emerald-800'
                        )}
                      >
                        <LogIn className="w-3.5 h-3.5 mr-1" />
                        {isBusy ? 'Memproses...' : 'Konfirmasi Kembali (Check-In)'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RIWAYAT PESIAR HARI INI (SELESAI KEMBALI) */}
      {viewTab === 'RIWAYAT_SELESAI' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Riwayat Selesai Pesiar ({completedPesiar.length})
              </h2>
              <p className="text-xs text-zinc-500">Santri yang telah kembali dan melapor ke petugas</p>
            </div>
          </div>

          {filteredCompletedPesiar.length === 0 ? (
            <Card className="p-8 text-center rounded-xl border border-zinc-200 bg-white">
              <p className="text-xs text-zinc-500">
                {completedPesiar.length > 0
                  ? 'Tidak ada riwayat santri kembali yang sesuai dengan filter ini.'
                  : 'Belum ada santri yang tercatat kembali dari pesiar hari ini.'}
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredCompletedPesiar.map((perm) => {
                const isLate = perm.status === 'KEMBALI_TERLAMBAT';

                return (
                  <div
                    key={perm.id}
                    className="p-3 bg-white border border-zinc-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <h4 className="font-bold text-zinc-900 truncate">{perm.studentName}</h4>
                      <p className="text-[11px] text-zinc-500">
                        {perm.className} &bull; Keluar: {formatTimeOnly(perm.actualDeparture)} &bull; Kembali: {formatTimeOnly(perm.actualReturn)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {isLate ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Terlambat ({perm.lateDurationMinutes || 0}m)
                        </Badge>
                      ) : (
                        <Badge variant="approved" className="text-[10px]">
                          Tepat Waktu
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
