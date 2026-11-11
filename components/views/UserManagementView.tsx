'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { UserAccount, UserRole, Classroom, Permission, AccessControlSettings } from '@/lib/types';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Phone,
  GraduationCap,
  Save,
  Sliders,
  FileSpreadsheet,
  Ban,
  X,
  ChevronDown,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';

interface UserManagementViewProps {
  currentUser: UserAccount;
  users: UserAccount[];
  classrooms: Classroom[];
  permissions: Permission[];
  onRefresh: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  KEPALA_ASRAMA: 'Kepala Asrama',
  WALI_KELAS: 'Wali Kelas',
  USTADZ_UMUM: 'Musrif / Ustadz',
  SATPAM: 'Satpam Gerbang',
  ORANG_TUA: 'Wali Santri',
};

const ROLE_BADGE_STYLES: Record<UserRole, { badge: string; avatar: string }> = {
  SUPER_ADMIN: {
    badge: 'bg-zinc-100 text-zinc-800 border-zinc-200',
    avatar: 'bg-zinc-800 text-white border-zinc-700',
  },
  KEPALA_ASRAMA: {
    badge: 'bg-blue-50 text-blue-800 border-blue-200',
    avatar: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  WALI_KELAS: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    avatar: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  USTADZ_UMUM: {
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    avatar: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  SATPAM: {
    badge: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    avatar: 'bg-zinc-100 text-zinc-700 border-zinc-300',
  },
  ORANG_TUA: {
    badge: 'bg-teal-50 text-teal-800 border-teal-200',
    avatar: 'bg-teal-100 text-teal-800 border-teal-200',
  },
};

function getInitials(name: string): string {
  if (!name) return 'U';
  const clean = name
    .replace(/^(ustadz|ustadzah|bpk|ibu|pak|dr\.|dra\.|ir\.|h\.|hj\.)\s*/gi, '')
    .trim();
  const parts = (clean || name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  labelId,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  labelId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-emerald-600' : 'bg-zinc-200'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}

export function UserManagementView({
  currentUser,
  users,
  classrooms,
  permissions,
  onRefresh,
}: UserManagementViewProps) {
  const [subTab, setSubTab] = useState<'USERS' | 'ACCESS' | 'CANCEL_LOGS'>('USERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Form State Tambah / Edit Pengguna
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    role: 'USTADZ_UMUM' as UserRole,
    phone: '',
    pin: '',
    classroomId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog States
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [userToResetPin, setUserToResetPin] = useState<UserAccount | null>(null);
  const [isResettingPin, setIsResettingPin] = useState(false);

  // Access Control Settings State
  const [accessSettings, setAccessSettings] = useState<AccessControlSettings>({
    superAdminOnlyApproval: false,
    allowWaliKelasApprove: true,
    allowWaliKelasCreate: true,
    allowUstadzCreate: true,
    allowOrangTuaCreate: true,
  });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Ambil pengaturan hak akses dari database
  useEffect(() => {
    fetch('/api/settings?key=access_control_settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.value) {
          setAccessSettings((prev) => ({ ...prev, ...data.value }));
        }
      })
      .catch((err) => console.error('Gagal memuat pengaturan:', err))
      .finally(() => setIsLoadingSettings(false));
  }, []);

  // Simpan pengaturan hak akses
  const handleSaveAccessSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'access_control_settings',
          value: accessSettings,
        }),
      });

      if (!res.ok) throw new Error('Gagal menyimpan pengaturan');

      toast.success('Pengaturan Wewenang Disimpan', {
        description: 'Hak akses dan persetujuan akun berhasil diperbarui.',
      });
      onRefresh();
    } catch (err: any) {
      toast.error('Gagal Menyimpan', { description: err.message });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Daftar akun petugas yang dikelola Super Admin (kecualikan role SATPAM dari daftar kelola pengguna)
  const manageableUsers = useMemo(() => {
    return users.filter((u) => u.role !== 'SATPAM');
  }, [users]);

  // Filter Pengguna
  const filteredUsers = useMemo(() => {
    return manageableUsers.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone && u.phone.includes(searchQuery));
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [manageableUsers, searchQuery, roleFilter]);

  // Laporan Pembatalan Izin (Cancelled)
  const cancelledPermissions = useMemo(() => {
    return permissions.filter((p) => p.status === 'CANCELLED');
  }, [permissions]);

  // Buka Modal Tambah User
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      role: 'USTADZ_UMUM',
      phone: '',
      pin: '123456',
      classroomId: classrooms.length > 0 ? classrooms[0].id : '',
    });
    setIsModalOpen(true);
  };

  // Buka Modal Edit User
  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      role: user.role,
      phone: user.phone || '',
      pin: user.pin || '',
      classroomId: user.classroomId || (classrooms.length > 0 ? classrooms[0].id : ''),
    });
    setIsModalOpen(true);
  };

  // Submit User (Tambah / Edit)
  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      toast.error('Data Belum Lengkap', { description: 'Nama dan username wajib diisi.' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingUser) {
        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: editingUser.id,
            name: formData.name.trim(),
            username: formData.username.trim(),
            role: formData.role,
            phone: formData.phone.trim(),
            pin: formData.pin.trim(),
            classroomId: formData.role === 'WALI_KELAS' ? formData.classroomId : null,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Gagal memperbarui akun.');
        }

        toast.success('Akun Berhasil Diperbarui', {
          description: `Perubahan data untuk ${formData.name} telah disimpan.`,
        });
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name.trim(),
            username: formData.username.trim(),
            role: formData.role,
            phone: formData.phone.trim(),
            pin: formData.pin.trim() || '123456',
            classroomId: formData.role === 'WALI_KELAS' ? formData.classroomId : null,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Gagal membuat akun.');
        }

        toast.success('Akun Berhasil Dibuat', {
          description: `Akun ${formData.name} (${formData.username}) siap digunakan.`,
        });
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error('Gagal Menyimpan Akun', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eksekusi Reset PIN
  const handleConfirmResetPin = async () => {
    if (!userToResetPin) return;
    setIsResettingPin(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userToResetPin.id,
          pin: '123456',
        }),
      });

      if (!res.ok) throw new Error('Gagal mereset PIN');

      toast.success('PIN Berhasil Direset', {
        description: `PIN akun ${userToResetPin.name} dikembalikan ke "123456".`,
      });
      setUserToResetPin(null);
      onRefresh();
    } catch (err: any) {
      toast.error('Gagal Reset PIN', { description: err.message });
    } finally {
      setIsResettingPin(false);
    }
  };

  // Hapus User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      const res = await fetch(`/api/users?id=${userToDelete.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Gagal menghapus akun');
      }

      toast.success('Akun Dihapus', {
        description: `Akun ${userToDelete.name} telah dihapus dari sistem.`,
      });
      setUserToDelete(null);
      onRefresh();
    } catch (err: any) {
      toast.error('Gagal Menghapus Akun', { description: err.message });
    }
  };

  // Ekspor CSV Laporan Pembatalan
  const handleExportCancelReport = () => {
    if (cancelledPermissions.length === 0) {
      toast.info('Tidak ada data pembatalan izin untuk diekspor.');
      return;
    }

    const headers = [
      'ID Izin',
      'Nama Santri',
      'NIS',
      'Kelas',
      'Waktu Pembatalan',
      'Dibatalkan Oleh',
      'Alasan Pembatalan',
      'Rencana Keluar',
      'Rencana Kembali',
    ];
    const rows = cancelledPermissions.map((p) => {
      const cancelLog = p.logs?.find((l: any) => l.action === 'CANCELLED');
      return [
        p.id,
        `"${p.studentName}"`,
        p.studentNis,
        p.className,
        `"${cancelLog ? formatDateTime(cancelLog.timestamp) : formatDateTime(p.updatedAt)}"`,
        `"${cancelLog ? `${cancelLog.actorName} (${cancelLog.actorRole})` : 'Petugas'}"`,
        `"${(p.rejectionReason || cancelLog?.note || '-').replace(/"/g, '""')}"`,
        `"${formatDateTime(p.plannedDeparture)}"`,
        `"${formatDateTime(p.plannedReturn)}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `laporan_pembatalan_izin_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Laporan Pembatalan Diekspor');
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Super Admin</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900">
              Manajemen Pengguna & Hak Akses
            </h1>
            <p className="text-xs text-zinc-600 mt-0.5">
              Kelola data akun petugas, atur wewenang persetujuan izin, dan pantau log pembatalan.
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Sub Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 rounded-xl border border-zinc-200/70">
        <button
          type="button"
          onClick={() => setSubTab('USERS')}
          className={cn(
            'py-2 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]',
            subTab === 'USERS'
              ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
              : 'text-zinc-600 hover:text-zinc-900'
          )}
        >
          <Users className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
          <span className="truncate">Kelola Akun</span>
          <span
            className={cn(
              'text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums',
              subTab === 'USERS'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-zinc-200/80 text-zinc-600'
            )}
          >
            {manageableUsers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('ACCESS')}
          className={cn(
            'py-2 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]',
            subTab === 'ACCESS'
              ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
              : 'text-zinc-600 hover:text-zinc-900'
          )}
        >
          <Sliders className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
          <span className="truncate">Hak Akses</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('CANCEL_LOGS')}
          className={cn(
            'py-2 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]',
            subTab === 'CANCEL_LOGS'
              ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
              : 'text-zinc-600 hover:text-zinc-900'
          )}
        >
          <Ban className="w-3.5 h-3.5 text-zinc-700 shrink-0" />
          <span className="truncate">Batal Izin</span>
          <span
            className={cn(
              'text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums',
              subTab === 'CANCEL_LOGS'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-zinc-200/80 text-zinc-600'
            )}
          >
            {cancelledPermissions.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: KELOLA AKUN PETUGAS                               */}
      {/* ======================================================== */}
      {subTab === 'USERS' && (
        <div className="space-y-3">
          {/* Action Row: Search & Button Tambah */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Cari nama atau username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 text-xs rounded-xl border-zinc-200 bg-white shadow-2xs focus-visible:ring-emerald-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Hapus kata kunci pencarian"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              type="button"
              onClick={handleOpenAdd}
              className="h-10 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">Tambah Petugas</span>
              <span className="inline xs:hidden sm:hidden">Tambah</span>
            </Button>
          </div>

          {/* Role Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-none">
            {[
              { id: 'ALL', label: 'Semua Role' },
              { id: 'SUPER_ADMIN', label: 'Super Admin' },
              { id: 'WALI_KELAS', label: 'Wali Kelas' },
              { id: 'USTADZ_UMUM', label: 'Musrif / Ustadz' },
              { id: 'KEPALA_ASRAMA', label: 'Kepala Asrama' },
            ].map((chip) => {
              const isActive = roleFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setRoleFilter(chip.id)}
                  className={cn(
                    'text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 transition-all cursor-pointer border select-none',
                    isActive
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* List Kartu Petugas */}
          <div className="space-y-2.5">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200/90 shadow-2xs">
                <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-700">Tidak ada akun petugas yang cocok.</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Coba periksa ejaan atau gunakan kata kunci pencarian lain.
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const assignedClass = classrooms.find(
                  (c) => c.id === user.classroomId || c.waliKelasId === user.id
                );
                const isSelf = user.id === currentUser.id;
                const roleStyle =
                  ROLE_BADGE_STYLES[user.role as UserRole] || ROLE_BADGE_STYLES.USTADZ_UMUM;

                return (
                  <Card
                    key={user.id}
                    className="p-3.5 sm:p-4 border border-zinc-200/80 bg-white rounded-2xl shadow-2xs hover:border-zinc-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar Monogram */}
                      <div
                        className={cn(
                          'w-10 h-10 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border select-none',
                          roleStyle.avatar
                        )}
                      >
                        {getInitials(user.name)}
                      </div>

                      {/* Konten Akun */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-bold text-zinc-900 leading-snug">
                            {user.name}
                          </h3>
                          {isSelf && (
                            <span className="text-[10px] font-bold bg-zinc-100 text-zinc-700 px-1.5 py-0.2 rounded border border-zinc-200">
                              Anda
                            </span>
                          )}
                          <span
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
                              roleStyle.badge
                            )}
                          >
                            {ROLE_LABELS[user.role as UserRole] || user.role}
                          </span>
                        </div>

                        {/* Detail Akun */}
                        <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-zinc-600">
                          <p className="flex items-center gap-1.5">
                            <span className="text-[11px] text-zinc-400">Username:</span>
                            <span className="font-semibold text-zinc-800">@{user.username}</span>
                          </p>
                          {user.phone ? (
                            <a
                              href={`tel:${user.phone}`}
                              className="flex items-center gap-1.5 text-zinc-600 hover:text-emerald-700 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="tabular-nums">{user.phone}</span>
                            </a>
                          ) : null}
                          {user.role === 'WALI_KELAS' && (
                            <p className="flex items-center gap-1.5 text-emerald-800 font-semibold sm:col-span-2">
                              <GraduationCap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span>Wali Kelas: {assignedClass?.name || 'Belum ditautkan'}</span>
                            </p>
                          )}
                        </div>

                        {/* Tombol Aksi Akun */}
                        <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setUserToResetPin(user)}
                              title="Reset PIN ke 123456"
                              className="h-8 px-2.5 text-xs font-semibold rounded-lg border-zinc-200 text-zinc-700 hover:bg-zinc-50 active:scale-95"
                            >
                              <KeyRound className="w-3.5 h-3.5 mr-1 text-amber-600" />
                              <span>Reset PIN</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(user)}
                              title="Ubah informasi akun"
                              className="h-8 px-2.5 text-xs font-semibold rounded-lg border-zinc-200 text-zinc-700 hover:bg-zinc-50 active:scale-95"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                              <span>Edit</span>
                            </Button>
                          </div>

                          {!isSelf && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToDelete(user)}
                              title="Hapus akun dari sistem"
                              className="h-8 px-2.5 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 active:scale-95 ml-auto"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
                              <span>Hapus</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: KONTROL HAK AKSES & WEWENANG SISTEM               */}
      {/* ======================================================== */}
      {subTab === 'ACCESS' && (
        <div className="space-y-3">
          <Card className="p-4 sm:p-5 border border-zinc-200/80 bg-white rounded-2xl shadow-2xs space-y-4">
            <div className="border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">
                    Kendali Hak Persetujuan & Pembuatan Izin
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Atur wewenang persetujuan izin dan akses pembuatan perizinan santri.
                  </p>
                </div>
              </div>
            </div>

            {/* Switch 1: Super Admin Only Approval */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/70 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      id="label-super-admin-approval"
                      className="text-xs font-bold text-zinc-900"
                    >
                      Hanya Super Admin yang Menyetujui Izin
                    </span>
                    {accessSettings.superAdminOnlyApproval && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Bila diaktifkan, seluruh izin santri wajib disetujui langsung oleh Super Admin.
                    Persetujuan mandiri oleh Wali Kelas dinonaktifkan sementara.
                  </p>
                </div>
                <ToggleSwitch
                  labelId="label-super-admin-approval"
                  checked={accessSettings.superAdminOnlyApproval}
                  onChange={(checked) =>
                    setAccessSettings({ ...accessSettings, superAdminOnlyApproval: checked })
                  }
                />
              </div>
            </div>

            {/* Switch 2: Wali Kelas Boleh Menyetujui */}
            <div className="p-3.5 rounded-xl border border-zinc-200 bg-white space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span id="label-wali-approve" className="text-xs font-bold text-zinc-900">
                      Wali Kelas Berwenang Menyetujui Santri Kelasnya
                    </span>
                    {accessSettings.allowWaliKelasApprove &&
                      !accessSettings.superAdminOnlyApproval && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                          Diizinkan
                        </span>
                      )}
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Izinkan guru wali kelas untuk menyetujui izin santri di kelas ampuannya secara
                    langsung.
                  </p>
                </div>
                <ToggleSwitch
                  labelId="label-wali-approve"
                  disabled={accessSettings.superAdminOnlyApproval}
                  checked={
                    accessSettings.allowWaliKelasApprove && !accessSettings.superAdminOnlyApproval
                  }
                  onChange={(checked) =>
                    setAccessSettings({ ...accessSettings, allowWaliKelasApprove: checked })
                  }
                />
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-3">
              <h3 className="text-xs font-bold text-zinc-800 uppercase tracking-wider mb-2.5">
                Kontrol Fitur Pembuatan Izin Santri
              </h3>
              <div className="space-y-2">
                {/* Switch 3: Wali Kelas Boleh Buat Izin */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50">
                  <span id="label-wali-create" className="text-xs font-medium text-zinc-800">
                    Wali Kelas diizinkan membuat izin santri
                  </span>
                  <ToggleSwitch
                    labelId="label-wali-create"
                    checked={accessSettings.allowWaliKelasCreate}
                    onChange={(checked) =>
                      setAccessSettings({ ...accessSettings, allowWaliKelasCreate: checked })
                    }
                  />
                </div>

                {/* Switch 4: Musrif/Ustadz Boleh Buat Izin */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50">
                  <span id="label-ustadz-create" className="text-xs font-medium text-zinc-800">
                    Musrif / Ustadz Asrama diizinkan membuat izin santri
                  </span>
                  <ToggleSwitch
                    labelId="label-ustadz-create"
                    checked={accessSettings.allowUstadzCreate}
                    onChange={(checked) =>
                      setAccessSettings({ ...accessSettings, allowUstadzCreate: checked })
                    }
                  />
                </div>

                {/* Switch 5: Orang Tua Boleh Mengajukan */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50">
                  <span id="label-ortu-create" className="text-xs font-medium text-zinc-800">
                    Orang Tua / Wali Santri diizinkan mengajukan izin via portal
                  </span>
                  <ToggleSwitch
                    labelId="label-ortu-create"
                    checked={accessSettings.allowOrangTuaCreate}
                    onChange={(checked) =>
                      setAccessSettings({ ...accessSettings, allowOrangTuaCreate: checked })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Tombol Simpan Konfigurasi */}
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                disabled={isSavingSettings}
                onClick={handleSaveAccessSettings}
                className="h-10 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-2 active:scale-95 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSavingSettings ? 'Menyimpan Pengaturan...' : 'Simpan Pengaturan Hak Akses'}
                </span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: LAPORAN DETAIL PEMBATALAN IZIN                   */}
      {/* ======================================================== */}
      {subTab === 'CANCEL_LOGS' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900">
                Laporan Izin yang Dibatalkan
              </h2>
              <p className="text-[11px] text-zinc-500">
                Dicatat saat santri batal keluar dan melapor ke petugas asrama.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCancelReport}
              className="h-9 px-3 rounded-xl border-zinc-200 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-zinc-50 active:scale-95"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ekspor CSV</span>
            </Button>
          </div>

          <div className="space-y-2.5">
            {cancelledPermissions.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200/90 shadow-2xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-800">
                  Tidak ada perizinan yang dibatalkan.
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Semua izin santri terlaksana atau sedang aktif berjalan.
                </p>
              </div>
            ) : (
              cancelledPermissions.map((perm) => {
                const cancelLog = perm.logs?.find((l: any) => l.action === 'CANCELLED');

                return (
                  <Card
                    key={perm.id}
                    className="p-3.5 sm:p-4 border-l-4 border-l-rose-500 border-zinc-200/80 bg-white rounded-2xl shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-bold text-zinc-900">
                            {perm.studentName}
                          </span>
                          <span className="text-[10px] text-zinc-500 tabular-nums">
                            ({perm.studentNis})
                          </span>
                          <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                            Batal Izin
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Kelas: <strong className="text-zinc-700">{perm.className}</strong>
                          <span className="text-zinc-300 mx-1">·</span>
                          <span>
                            Kategori:{' '}
                            {perm.category === 'KELUAR_SEBENTAR'
                              ? 'Keluar Sebentar'
                              : 'Pulang Menginap'}
                          </span>
                        </p>
                      </div>

                      <span className="text-[10px] text-zinc-400 tabular-nums shrink-0">
                        {formatDateTime(cancelLog ? cancelLog.timestamp : perm.updatedAt)}
                      </span>
                    </div>

                    {/* Informasi Petugas yang Membatalkan */}
                    <div className="rounded-xl bg-zinc-50 p-3 border border-zinc-200/70 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-zinc-600">
                        <span className="text-[11px] text-zinc-500">Dibatalkan Oleh:</span>
                        <strong className="text-zinc-900">
                          {cancelLog
                            ? `${cancelLog.actorName} (${ROLE_LABELS[cancelLog.actorRole as UserRole] || cancelLog.actorRole})`
                            : 'Petugas Asrama'}
                        </strong>
                      </div>
                      <div className="pt-1.5 border-t border-zinc-200/60 text-zinc-800 text-[11px]">
                        <strong className="text-rose-700">Alasan:</strong>{' '}
                        <span>
                          {perm.rejectionReason || cancelLog?.note || 'Anak menyatakan batal izin.'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-100">
                      <span>Rencana Awal: {formatDateTime(perm.plannedDeparture)}</span>
                      <span>Alasan Asal: {perm.reason}</span>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG FORM TAMBAH / EDIT PENGGUNA                       */}
      {/* ======================================================== */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-5 sm:p-6 border border-zinc-200 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-900">
              {editingUser ? 'Edit Akun Petugas' : 'Tambah Petugas Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              {editingUser
                ? 'Ubah informasi hak akses dan data akun petugas.'
                : 'Daftarkan akun petugas perizinan sekolah / asrama.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitUser} className="space-y-3.5 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-zinc-800">
                Nama Lengkap & Gelar <span className="text-rose-600">*</span>
              </Label>
              <Input
                type="text"
                required
                placeholder="Contoh: Ustadz Anton Prasetyo, S.Pd."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 text-xs rounded-xl border-zinc-200 focus-visible:ring-emerald-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-800">
                  Username <span className="text-rose-600">*</span>
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="anton"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      username: e.target.value.toLowerCase().replace(/\s+/g, ''),
                    })
                  }
                  className="h-10 text-xs rounded-xl border-zinc-200 focus-visible:ring-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-zinc-800">PIN Pengamanan</Label>
                <Input
                  type="text"
                  placeholder="123456"
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  className="h-10 text-xs rounded-xl border-zinc-200 focus-visible:ring-emerald-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-zinc-800">
                Peran / Role Petugas <span className="text-rose-600">*</span>
              </Label>
              <div className="relative">
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full h-10 px-3 pr-8 text-xs font-semibold text-zinc-900 bg-white border border-zinc-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 cursor-pointer"
                >
                  <option value="USTADZ_UMUM">Musrif / Ustadz Asrama</option>
                  <option value="WALI_KELAS">Wali Kelas</option>
                  <option value="KEPALA_ASRAMA">Kepala Asrama</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Pilihan Kelas Jika Role Wali Kelas */}
            {formData.role === 'WALI_KELAS' && (
              <div className="space-y-1 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <Label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Kelas yang Diampu</span>
                </Label>
                <div className="relative">
                  <select
                    value={formData.classroomId}
                    onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
                    className="w-full h-9 px-3 pr-8 text-xs font-semibold text-zinc-900 bg-white border border-emerald-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  >
                    <option value="">-- Pilih Kelas --</option>
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Saat ini: {c.waliKelasName || 'Kosong'})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold text-zinc-800">Nomor WhatsApp (Opsional)</Label>
              <Input
                type="tel"
                placeholder="081234567890"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-10 text-xs rounded-xl border-zinc-200 focus-visible:ring-emerald-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                {isSubmitting
                  ? 'Menyimpan...'
                  : editingUser
                    ? 'Simpan Perubahan'
                    : 'Buat Akun'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG KONFIRMASI RESET PIN */}
      <Dialog
        open={!!userToResetPin}
        onOpenChange={(open) => !open && setUserToResetPin(null)}
      >
        <DialogContent className="max-w-sm bg-white rounded-2xl p-5 border border-zinc-200 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              <span>Reset PIN Petugas</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-600 mt-1 leading-relaxed">
              Reset PIN akun <strong>{userToResetPin?.name}</strong> ke PIN default{' '}
              <strong className="text-zinc-900 font-mono">123456</strong>? Petugas dapat mengubah
              kembali PIN di profil setelah masuk.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUserToResetPin(null)}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={isResettingPin}
              onClick={handleConfirmResetPin}
              className="h-9 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs active:scale-95"
            >
              {isResettingPin ? 'Mereset...' : 'Ya, Reset PIN'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOG KONFIRMASI HAPUS PENGGUNA */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="max-w-sm bg-white rounded-2xl p-5 border border-zinc-200 shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-900">
              Konfirmasi Hapus Akun
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-600 mt-1 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong>{userToDelete?.name}</strong> (@
              {userToDelete?.username})? Tindakan ini akan mencabut seluruh akses akun ke sistem.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setUserToDelete(null)}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteUser}
              className="h-9 px-4 rounded-xl font-bold text-xs shadow-xs"
            >
              Hapus Akun
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
