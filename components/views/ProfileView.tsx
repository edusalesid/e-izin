'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AuthSession, Student, Permission, DigitalSignatureData } from '@/lib/types';
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
  FileSignature,
  PenTool,
  Trash2,
  Upload,
  Eraser,
  Image as ImageIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn, formatDateTime } from '@/lib/utils';
import { toast } from 'sonner';
import { requestNotificationPermission, registerPushSubscription } from '@/lib/notifications';

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

  // Khusus Akun Ustadz Anton / Super Admin: Manajemen TTD Digital Surat Izin
  const isAntonOrAdmin =
    session.user?.username?.toLowerCase() === 'anton' ||
    session.role === 'SUPER_ADMIN';

  const [digitalSignature, setDigitalSignature] = useState<DigitalSignatureData | null>(null);
  const [signatureMode, setSignatureMode] = useState<'UPLOAD' | 'CANVAS'>('UPLOAD');
  const [signerName, setSignerName] = useState(session.user?.name || 'Anton, M.Hum., Gr.');
  const [signerTitle, setSignerTitle] = useState('Penanggung Jawab Perizinan SMAIT Ihsanul Fikri');
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [isDeletingSignature, setIsDeletingSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isAntonOrAdmin) {
      fetch('/api/settings?key=official_digital_signature')
        .then((res) => res.json())
        .then((data) => {
          if (data?.value?.imageData) {
            setDigitalSignature(data.value);
            if (data.value.signerName) setSignerName(data.value.signerName);
            if (data.value.signerTitle) setSignerTitle(data.value.signerTitle);
            setPreviewSignature(data.value.imageData);
          }
        })
        .catch((err) => console.error('Gagal mengambil ttd digital:', err));
    }
  }, [isAntonOrAdmin]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Format berkas tidak sesuai', {
        description: 'Silakan pilih gambar dengan format PNG, JPG, atau WEBP.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxWidth = 500;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/png');
          setPreviewSignature(compressed);
          toast.success('Gambar tanda tangan berhasil dimuat!');
        } else {
          setPreviewSignature(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setPreviewSignature(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setPreviewSignature(null);
  };

  const handleSaveSignature = async () => {
    if (!previewSignature) {
      toast.error('Belum ada tanda tangan', {
        description: 'Silakan upload gambar tanda tangan atau buat coretan tanda tangan pada canvas.',
      });
      return;
    }

    setIsSavingSignature(true);
    try {
      const payload: DigitalSignatureData = {
        imageData: previewSignature,
        signerName: signerName.trim() || 'Anton, M.Hum., Gr.',
        signerTitle: signerTitle.trim() || 'Penanggung Jawab Perizinan SMAIT Ihsanul Fikri',
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'official_digital_signature',
          value: payload,
        }),
      });

      if (!res.ok) throw new Error('Gagal menyimpan tanda tangan');

      setDigitalSignature(payload);
      toast.success('Tanda Tangan Digital Berhasil Disimpan! ✍️', {
        description: 'Tanda tangan resmi otomatis disematkan pada setiap Surat Izin Santri (PDF/Cetak).',
      });
      onProfileUpdated?.();
    } catch (err: any) {
      toast.error('Gagal Menyimpan', {
        description: err.message || 'Terjadi kesalahan sistem saat menyimpan tanda tangan.',
      });
    } finally {
      setIsSavingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus tanda tangan digital resmi ini?')) return;

    setIsDeletingSignature(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'official_digital_signature',
          value: null,
        }),
      });

      if (!res.ok) throw new Error('Gagal menghapus tanda tangan');

      setDigitalSignature(null);
      setPreviewSignature(null);
      clearCanvas();
      toast.success('Tanda tangan digital berhasil dihapus.');
      onProfileUpdated?.();
    } catch (err: any) {
      toast.error('Gagal Menghapus', {
        description: err.message || 'Terjadi kendala saat menghapus tanda tangan.',
      });
    } finally {
      setIsDeletingSignature(false);
    }
  };

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
        // Daftarkan push subscription perangkat ke database server
        await registerPushSubscription({
          userId: session.user?.id || session.user?.username,
          role: session.role,
          studentNis: student?.nis,
        });

        // Trigger uji push notification dari server backend
        const testRes = await fetch('/api/push/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.user?.id || session.user?.username,
            role: session.role,
            studentNis: student?.nis,
          }),
        }).then((r) => r.json()).catch(() => ({}));

        toast.success('Uji Notifikasi Server Berhasil! 🔔', {
          description: testRes?.message || 'Pemberitahuan push dari server telah dikirim ke perangkat ini.',
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

      {/* Khusus Akun Ustadz Anton / Super Admin: Tanda Tangan Digital Resmi */}
      {isAntonOrAdmin && (
        <Card className="border-emerald-200/90 bg-gradient-to-b from-emerald-50/30 to-white shadow-xs">
          <CardHeader className="pb-3 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-emerald-700" />
                <CardTitle className="text-sm font-bold text-zinc-900">
                  Tanda Tangan Digital Resmi (Surat Izin Santri)
                </CardTitle>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  digitalSignature?.imageData
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : 'border-amber-300 bg-amber-50 text-amber-800'
                }`}
              >
                {digitalSignature?.imageData ? '✓ Terpasang di PDF' : 'Belum Terpasang'}
              </Badge>
            </div>
            <CardDescription className="text-xs text-zinc-600">
              Tanda tangan digital ini otomatis disematkan pada setiap Surat Izin Santri resmi (format PDF / Cetak).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3.5 space-y-4">
            {/* Pratinjau Tanda Tangan yang Sedang Aktif */}
            {previewSignature ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-500 pb-1 border-b border-zinc-100">
                  <span className="font-medium">Pratinjau Tanda Tangan:</span>
                  {digitalSignature?.imageData && (
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      Tersimpan di Sistem
                    </span>
                  )}
                </div>
                <div className="h-24 w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:8px_8px] rounded-lg border border-zinc-100 flex items-center justify-center overflow-hidden p-2">
                  <img
                    src={previewSignature}
                    alt="Pratinjau Tanda Tangan"
                    className="max-h-full max-w-[200px] object-contain drop-shadow-xs"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-600">
                    Oleh: <strong>{signerName}</strong>
                  </span>
                  {digitalSignature?.imageData && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteSignature}
                      disabled={isDeletingSignature}
                      className="h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      <span>{isDeletingSignature ? 'Menghapus...' : 'Hapus TTD'}</span>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 p-4 text-center space-y-1">
                <PenTool className="w-6 h-6 text-zinc-400 mx-auto" />
                <p className="text-xs font-semibold text-zinc-700">
                  Belum ada tanda tangan digital yang tersimpan
                </p>
                <p className="text-[11px] text-zinc-500">
                  Upload file gambar tanda tangan atau coret langsung di layar bawah ini.
                </p>
              </div>
            )}

            {/* Pilihan Metode: Upload Gambar atau Gambar di Layar */}
            <div className="space-y-3">
              <div className="flex rounded-lg bg-zinc-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSignatureMode('UPLOAD')}
                  className={`flex-1 py-1.5 px-3 rounded-md font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    signatureMode === 'UPLOAD'
                      ? 'bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Upload File Gambar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('CANVAS')}
                  className={`flex-1 py-1.5 px-3 rounded-md font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    signatureMode === 'CANVAS'
                      ? 'bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Coret di Layar (Touch)</span>
                </button>
              </div>

              {signatureMode === 'UPLOAD' ? (
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 p-4 text-center cursor-pointer transition"
                  >
                    <Upload className="w-6 h-6 text-emerald-700 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-emerald-950">
                      Klik untuk Memilih File Tanda Tangan
                    </p>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5">
                      Disarankan file PNG berlatar transparan / putih (Maks. 2 MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative rounded-lg border border-zinc-300 bg-white overflow-hidden shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={160}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-40 touch-none cursor-crosshair bg-white"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={clearCanvas}
                        className="h-7 px-2 text-[11px] bg-white/90 hover:bg-white text-zinc-700 shadow-xs cursor-pointer border border-zinc-200"
                      >
                        <Eraser className="w-3 h-3 mr-1" />
                        <span>Hapus Coretan</span>
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-zinc-500 italic">
                    Gunakan jari atau stylus pada smartphone/tablet untuk tanda tangan langsung.
                  </p>
                </div>
              )}

              {/* Data Identitas Penandatangan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="signer-name-input" className="text-xs">
                    Nama Penandatangan
                  </Label>
                  <Input
                    id="signer-name-input"
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Contoh: Anton, M.Hum., Gr."
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signer-title-input" className="text-xs">
                    Jabatan Kedinasan
                  </Label>
                  <Input
                    id="signer-title-input"
                    type="text"
                    value={signerTitle}
                    onChange={(e) => setSignerTitle(e.target.value)}
                    placeholder="Contoh: Penanggung Jawab Perizinan"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Tombol Simpan */}
              <Button
                type="button"
                onClick={handleSaveSignature}
                disabled={isSavingSignature || !previewSignature}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-10 rounded-xl shadow-xs cursor-pointer"
              >
                {isSavingSignature ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Menyimpan Tanda Tangan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    <span>Simpan & Terapkan ke PDF Surat Izin</span>
                  </>
                )}
              </Button>
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
