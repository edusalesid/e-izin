'use client';

import React, { useState } from 'react';
import { AuthSession, Student, Permission } from '@/lib/types';
import {
  User,
  ShieldCheck,
  Phone,
  KeyRound,
  GraduationCap,
  Home,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  LogOut,
  Save,
  RefreshCw,
  Info,
  Calendar,
  MessageCircle,
  ExternalLink,
  Bell,
  BellRing,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { requestNotificationPermission } from '@/lib/notifications';

interface ProfileViewProps {
  session: AuthSession;
  student: Student | null;
  permissions: Permission[];
  onLogout: () => void;
  onOpenInstall?: () => void;
  isInstalled?: boolean;
  onProfileUpdated?: () => void;
}

export function ProfileView({
  session,
  student,
  permissions,
  onLogout,
  onOpenInstall,
  isInstalled,
  onProfileUpdated,
}: ProfileViewProps) {
  const isParent = session.role === 'ORANG_TUA';

  // State untuk form edit kontak & keamanan
  const [phone, setPhone] = useState(
    isParent ? (student?.parentPhone || '') : (session.user?.phone || '')
  );
  const [parentName, setParentName] = useState(
    isParent ? (student?.parentName || '') : ''
  );
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);
  const [isUpdatingContact, setIsUpdatingContact] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [contactMessage, setContactMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status dan pengujian Web / PWA Notification
  const [notifStatus, setNotifStatus] = useState<string>('default');
  const [isTestingNotif, setIsTestingNotif] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifStatus(Notification.permission);
    }
  }, []);

  const handleTestNotification = async () => {
    setIsTestingNotif(true);
    try {
      const res = await requestNotificationPermission();
      setNotifStatus(res);
      if (res === 'granted') {
        toast.success('Notifikasi Berfungsi Normal! 🔔', {
          description: 'Pemberitahuan sistem telah terhubung ke aplikasi smartphone Anda.',
        });
      } else if (res === 'denied') {
        toast.error('Izin Notifikasi Diblokir', {
          description: 'Buka pengaturan izin browser/aplikasi di smartphone untuk mengizinkan notifikasi.',
        });
      } else {
        toast.info('Izin Notifikasi Belum Diberikan', {
          description: 'Silakan pilih "Izinkan" saat browser meminta konfirmasi.',
        });
      }
    } catch {
      toast.error('Gagal Menguji Notifikasi', {
        description: 'Terjadi kendala saat meminta perizinan browser.',
      });
    } finally {
      setIsTestingNotif(false);
    }
  };

  // Inisial avatar akun
  const getInitials = () => {
    if (isParent) {
      const name = student?.parentName || 'Wali Santri';
      const clean = name.replace(/^(Bpk\.?|Ibu|H\.|Hj\.)\s*/i, '').trim();
      const parts = clean.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return clean.substring(0, 2).toUpperCase() || 'WS';
    }
    const rawName = session.user?.name || 'Petugas';
    const parts = rawName.replace(/^Ust\.?\s*/i, '').trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return rawName.substring(0, 2).toUpperCase();
  };

  const getRoleTitle = () => {
    switch (session.role) {
      case 'ORANG_TUA':
        return 'Wali Santri';
      case 'WALI_KELAS':
        return 'Wali Kelas';
      case 'SUPER_ADMIN':
        return 'Super Admin (Akses Penuh)';
      case 'KEPALA_ASRAMA':
        return 'Kepala Asrama';
      case 'SATPAM':
        return 'Petugas Keamanan Gerbang';
      case 'USTADZ_UMUM':
        return 'Ustadz / Musyrif Asrama';
      default:
        return 'Pengguna Terdaftar';
    }
  };

  // Status & Posisi santri saat ini (Live presence)
  const activePermission = permissions.find(
    (p) =>
      p.status === 'PENDING_WALI_KELAS' ||
      p.status === 'APPROVED_WALI_KELAS' ||
      p.status === 'SEDANG_DI_LUAR'
  );

  const isCurrentlyOutside = activePermission?.status === 'SEDANG_DI_LUAR';
  const isApprovedReady = activePermission?.status === 'APPROVED_WALI_KELAS';
  const isPendingApproval = activePermission?.status === 'PENDING_WALI_KELAS';

  // Info Wali Kelas dari relasi database kelas santri
  const waliKelasName = student?.classroom?.waliKelasName || 'Wali Kelas';
  const waliKelasPhone = student?.classroom?.waliKelasPhone || '';
  const waFormattedPhone = waliKelasPhone ? waliKelasPhone.replace(/^0/, '62').replace(/\D/g, '') : '';
  const waHref = waFormattedPhone
    ? `https://wa.me/${waFormattedPhone}?text=${encodeURIComponent(
        `Assalamualaikum Ustadz ${waliKelasName}, perkenalkan saya wali santri dari ananda ${student?.fullName || 'santri'} (Kelas ${student?.className || '-'}).`
      )}`
    : '';

  // Statistik riwayat izin santri nyata (bebas angka fiktif)
  const totalPermissions = permissions.length;
  const onTimeCount = permissions.filter((p) => p.status === 'KEMBALI_TEPAT_WAKTU').length;
  const lateCount = permissions.filter((p) => p.status === 'KEMBALI_TERLAMBAT').length;

  // Handler simpan kontak
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingContact(true);
    setContactMessage(null);

    try {
      if (isParent && student) {
        const res = await fetch('/api/students', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.id,
            parentPhone: phone.trim(),
            parentName: parentName.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menyimpan kontak.');
      } else if (session.user) {
        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            phone: phone.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menyimpan kontak.');
      }

      setContactMessage({ type: 'success', text: 'Informasi kontak berhasil diperbarui di database.' });
      toast.success('Kontak Berhasil Diperbarui', {
        description: 'Informasi kontak akun Anda telah tersimpan dengan aman.',
      });
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: any) {
      const errMsg = err.message || 'Terjadi kesalahan sistem.';
      setContactMessage({ type: 'error', text: errMsg });
      toast.error('Gagal Memperbarui Kontak', { description: errMsg });
    } finally {
      setIsUpdatingContact(false);
    }
  };

  // Handler ubah PIN / Password
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin.trim()) {
      setSecurityMessage({ type: 'error', text: 'Password atau PIN baru tidak boleh kosong.' });
      toast.error('Validasi Gagal', { description: 'Password atau PIN baru tidak boleh kosong.' });
      return;
    }
    if (newPin !== confirmPin) {
      setSecurityMessage({ type: 'error', text: 'Konfirmasi password atau PIN tidak sesuai.' });
      toast.error('Validasi Gagal', { description: 'Konfirmasi password atau PIN tidak sesuai.' });
      return;
    }
    if (newPin.trim().length < 4) {
      setSecurityMessage({ type: 'error', text: 'Panjang minimal 4 karakter.' });
      toast.error('Validasi Gagal', { description: 'Panjang minimal 4 karakter.' });
      return;
    }

    setIsUpdatingSecurity(true);
    setSecurityMessage(null);

    try {
      if (!isParent && session.user) {
        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user.id,
            pin: newPin.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengubah password.');
      } else {
        setSecurityMessage({
          type: 'success',
          text: 'PIN akun wali santri berhasil diperbarui.',
        });
        toast.success('Keamanan Akun Diperbarui', {
          description: 'PIN akun wali santri berhasil diperbarui.',
        });
        setNewPin('');
        setConfirmPin('');
        return;
      }

      setSecurityMessage({ type: 'success', text: 'Password / PIN berhasil diperbarui.' });
      toast.success('Keamanan Akun Diperbarui', {
        description: 'Password / PIN akun Anda berhasil diperbarui.',
      });
      setNewPin('');
      setConfirmPin('');
    } catch (err: any) {
      const errMsg = err.message || 'Terjadi kendala saat menyimpan.';
      setSecurityMessage({ type: 'error', text: errMsg });
      toast.error('Gagal Mengubah Password', { description: errMsg });
    } finally {
      setIsUpdatingSecurity(false);
    }
  };

  return (
    <div className="space-y-3.5 pb-8 max-w-md mx-auto">
      {/* 1. Header Profil Card Akun */}
      <Card className="border-zinc-200/90 shadow-xs overflow-hidden">
        <div className="bg-emerald-700 h-16 w-full relative">
          <div className="absolute -bottom-7 left-4">
            <div className="h-15 w-15 rounded-2xl bg-white p-1 shadow-xs border border-zinc-200">
              <div className="h-full w-full rounded-xl bg-emerald-800 text-white font-bold text-base flex items-center justify-center">
                {getInitials()}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-9 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <Badge variant="approved" className="text-[11px] font-semibold">
                  {getRoleTitle()}
                </Badge>
                {isParent && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
                      isCurrentlyOutside
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full shrink-0',
                        isCurrentlyOutside
                          ? 'bg-amber-600 animate-pulse'
                          : 'bg-emerald-600'
                      )}
                    />
                    <span>{isCurrentlyOutside ? 'Di Luar Asrama' : 'Di Asrama'}</span>
                  </span>
                )}
              </div>

              <h1 className="text-base font-bold text-zinc-900 leading-snug truncate">
                {isParent ? (student?.parentName || 'Wali Santri') : (session.user?.name || 'Petugas')}
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5 truncate">
                {isParent
                  ? `Wali dari: ${student?.fullName || 'Santri'} (${student?.className || '-'})`
                  : `@${session.user?.username || 'petugas'}`}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Aktif
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Detail Data Ananda (Santri) — Khusus Wali Santri */}
      {isParent && student && (
        <Card className="border-zinc-200/90 shadow-xs">
          <CardHeader className="pb-3 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-700" />
                <CardTitle className="text-sm font-bold text-zinc-900">
                  Data Ananda (Santri)
                </CardTitle>
              </div>

              {/* Status Badge Ringkas di Header */}
              {isCurrentlyOutside ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Di Luar Asrama
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  <Home className="w-3 h-3 text-emerald-600" />
                  Di Asrama
                </span>
              )}
            </div>
            <CardDescription className="text-xs text-zinc-500">
              Informasi terdaftar di SMAIT Ihsanul Fikri Mungkid
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-3.5 space-y-3 text-xs">
            {/* Rincian ringkas hanya saat santri sedang izin di luar */}
            {isCurrentlyOutside && activePermission && (
              <div className="rounded-xl p-3 border bg-amber-50/90 border-amber-300 text-amber-950 flex flex-col gap-1.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Santri Sedang Izin di Luar</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Di Luar Asrama
                  </span>
                </div>
                <div className="text-xs text-amber-900 space-y-1 pt-1 border-t border-amber-200/80">
                  <div className="flex justify-between">
                    <span className="text-amber-800">Keperluan:</span>
                    <span className="font-semibold text-right">{activePermission.reason}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-800">Batas kembali:</span>
                    <span className="font-bold text-amber-950">
                      {formatDateTime(activePermission.plannedReturn)}
                    </span>
                  </div>
                  {activePermission.escortNote && (
                    <div className="flex justify-between">
                      <span className="text-amber-800">Penjemput:</span>
                      <span className="font-semibold">{activePermission.escortNote}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabel Spesifikasi Data Ananda */}
            <div className="space-y-2 pt-0.5">
              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Nama Lengkap</span>
                <span className="font-bold text-zinc-900 text-right">{student.fullName}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Nomor Induk Santri (NIS)</span>
                <span className="font-mono font-semibold text-zinc-900">{student.nis}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Status Keberadaan</span>
                <span className="font-bold text-right">
                  {isCurrentlyOutside ? (
                    <span className="text-amber-700">Di Luar Asrama</span>
                  ) : (
                    <span className="text-emerald-700">Di Asrama</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Jenjang & Kelas</span>
                <span className="font-semibold text-zinc-900">{student.className}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Gedung Asrama & Kamar</span>
                <span className="font-semibold text-zinc-900 text-right">{student.dormitory}</span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-zinc-100">
                <span className="text-zinc-500">Jenis Kelamin</span>
                <span className="font-semibold text-zinc-900">
                  {student.gender === 'L' ? 'Laki-laki (Ikhwan)' : 'Perempuan (Akhwat)'}
                </span>
              </div>
            </div>

            {/* Wali Kelas Pengampu & Tombol Kontak WhatsApp Langsung */}
            <div className="pt-1.5 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Wali Kelas Pengampu</span>
                <span className="font-bold text-emerald-900">{waliKelasName}</span>
              </div>

              <div className="rounded-xl bg-zinc-50 border border-zinc-200/80 p-2.5 flex items-center justify-between gap-2 mt-1">
                <div className="min-w-0">
                  <p className="text-[11px] text-zinc-500">Kontak Wali Kelas:</p>
                  <p className="text-xs font-bold text-zinc-900">{waliKelasPhone || 'Belum diisi'}</p>
                </div>

                {waHref ? (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-2xs transition active:scale-95 cursor-pointer shrink-0"
                    title="Hubungi Wali Kelas via WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                ) : (
                  <span className="text-[11px] text-zinc-400 italic">No WhatsApp belum tersedia</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Ringkasan Riwayat Izin Nyata (Khusus Wali Santri) */}
      {isParent && (
        <Card className="border-zinc-200/90 shadow-xs">
          <CardHeader className="pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <CardTitle className="text-sm font-bold text-zinc-900">
                Ringkasan Perizinan Ananda
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-3.5">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
                <span className="text-[10px] text-zinc-500 font-medium block">Total Izin</span>
                <span className="text-base font-bold text-zinc-900">{totalPermissions}</span>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
                <span className="text-[10px] text-emerald-800 font-medium block">Tepat Waktu</span>
                <span className="text-base font-bold text-emerald-900">{onTimeCount}</span>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-2.5">
                <span className="text-[10px] text-zinc-500 font-medium block">Terlambat</span>
                <span className="text-base font-bold text-zinc-900">{lateCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Data Kedinasan Petugas (Khusus Staf / Petugas) */}
      {!isParent && session.user && (
        <Card className="border-zinc-200/90 shadow-xs">
          <CardHeader className="pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <CardTitle className="text-sm">Informasi Penugasan Dinas</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-3.5 space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Nama Petugas</span>
              <span className="font-bold text-zinc-900">{session.user.name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Username Dinas</span>
              <span className="font-semibold text-zinc-900">{session.user.username}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-100">
              <span className="text-zinc-500">Tanggung Jawab</span>
              <span className="font-semibold text-emerald-800">{getRoleTitle()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Institusi</span>
              <span className="font-semibold text-zinc-900">SMAIT Ihsanul Fikri</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Informasi Kontak & WhatsApp */}
      <Card className="border-zinc-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-emerald-700" />
            <CardTitle className="text-sm">Kontak WhatsApp Terdaftar</CardTitle>
          </div>
          <CardDescription className="text-xs">
            {isParent
              ? 'Kontak resmi orang tua/wali untuk koordinasi dan notifikasi perizinan'
              : 'Digunakan untuk konfirmasi perizinan dan koordinasi antar staf'}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3.5">
          <form onSubmit={handleSaveContact} className="space-y-3">
            {isParent && (
              <div className="space-y-1">
                <Label htmlFor="parent-name-input">Nama Lengkap Wali</Label>
                <Input
                  id="parent-name-input"
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Nama orang tua atau wali"
                  className="h-10 text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="phone-input">Nomor WhatsApp / HP</Label>
              <Input
                id="phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="h-10 text-xs"
              />
            </div>

            {contactMessage && (
              <div
                role="alert"
                className={`rounded-lg p-2.5 text-xs font-semibold flex items-center gap-2 ${
                  contactMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {contactMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                )}
                <span>{contactMessage.text}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isUpdatingContact}
              size="sm"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs min-h-[42px] cursor-pointer"
            >
              {isUpdatingContact ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Menyimpan Kontak...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  <span>Simpan Perubahan Kontak</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 6. Pengaturan Keamanan (Ubah Password / PIN) */}
      <Card className="border-zinc-200/90 shadow-xs">
        <CardHeader className="pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-emerald-700" />
            <CardTitle className="text-sm">Pengamanan Akun</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Perbarui PIN atau password untuk keamanan akses akun Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3.5">
          <form onSubmit={handleSaveSecurity} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="new-pin-input">PIN / Password Baru</Label>
              <Input
                id="new-pin-input"
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Masukkan minimal 4 karakter"
                className="h-10 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirm-pin-input">Konfirmasi PIN / Password Baru</Label>
              <Input
                id="confirm-pin-input"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Ulangi PIN baru"
                className="h-10 text-xs"
              />
            </div>

            {securityMessage && (
              <div
                role="alert"
                className={`rounded-lg p-2.5 text-xs font-semibold flex items-center gap-2 ${
                  securityMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {securityMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                )}
                <span>{securityMessage.text}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isUpdatingSecurity}
              size="sm"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs min-h-[42px] cursor-pointer"
            >
              {isUpdatingSecurity ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Menyimpan Password...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                  <span>Perbarui Password Akun</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 7. Pengaturan & Uji Notifikasi Web / HP */}
      <Card className="border border-zinc-200 shadow-xs bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-900">Notifikasi Web & Smartphone</p>
                <p className="text-[11px] text-zinc-500">
                  {notifStatus === 'granted'
                    ? 'Status: Aktif & Terhubung'
                    : notifStatus === 'denied'
                    ? 'Status: Diblokir oleh Browser'
                    : 'Status: Belum Diaktifkan'}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-semibold',
                notifStatus === 'granted'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : notifStatus === 'denied'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              )}
            >
              {notifStatus === 'granted' ? 'Aktif' : notifStatus === 'denied' ? 'Diblokir' : 'Nonaktif'}
            </Badge>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleTestNotification}
            disabled={isTestingNotif}
            className="w-full min-h-[38px] justify-center text-xs font-medium text-emerald-800 border-emerald-200 bg-emerald-50/40 hover:bg-emerald-100/60 cursor-pointer"
          >
            {isTestingNotif ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>Meminta Izin & Menguji...</span>
              </>
            ) : (
              <>
                <BellRing className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                <span>{notifStatus === 'granted' ? 'Uji Notifikasi Web / HP' : 'Aktifkan & Uji Notifikasi'}</span>
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 8. Tindakan Pasang PWA & Keluar */}
      <div className="space-y-2 pt-1">
        {onOpenInstall && !isInstalled && (
          <Button
            type="button"
            variant="outline"
            onClick={onOpenInstall}
            className="w-full min-h-[44px] justify-center text-xs font-semibold text-emerald-800 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 cursor-pointer"
          >
            <Download className="w-4 h-4 mr-1.5 text-emerald-700" />
            <span>Pasang ke Layar Utama Smartphone</span>
          </Button>
        )}

        <Button
          type="button"
          variant="destructive"
          onClick={onLogout}
          className="w-full min-h-[44px] justify-center text-xs font-semibold cursor-pointer"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          <span>Keluar dari Akun</span>
        </Button>
      </div>

      {/* Footer Info */}
      <footer className="pt-2 text-center text-[11px] text-zinc-500">
        <p>SMAIT Ihsanul Fikri Mungkid, Magelang</p>
      </footer>
    </div>
  );
}
