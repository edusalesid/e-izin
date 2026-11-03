'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  X,
  Share,
  PlusSquare,
  Smartphone,
  Bell,
  BellRing,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  requestNotificationPermission,
  sendPwaNotification,
} from '@/lib/notifications';

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => void;
  isIOS: boolean;
  isInstalled?: boolean;
}

export function InstallPwaModal({
  isOpen,
  onClose,
  onInstall,
  isIOS,
  isInstalled = false,
}: InstallPwaModalProps) {
  const [step, setStep] = useState<'install' | 'notification'>('install');
  const [isRequesting, setIsRequesting] = useState(false);

  // Tentukan langkah awal saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const hasNotification =
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted';

      // Jika aplikasi sudah diinstall tapi notifikasi belum aktif, langsung ke langkah notifikasi
      if (isInstalled && !hasNotification) {
        setStep('notification');
      } else {
        setStep('install');
      }
    }
  }, [isOpen, isInstalled]);

  if (!isOpen) return null;

  const checkNotificationAndTransition = () => {
    const hasNotification =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted';

    if (!hasNotification) {
      setStep('notification');
    } else {
      onClose();
    }
  };

  const handleInstallClick = async () => {
    try {
      await onInstall();
    } catch (e) {
      console.warn('Gagal memicu install prompt:', e);
    }
    // Ganti ke tampilan izin terima notifikasi
    checkNotificationAndTransition();
  };

  const handleStayInBrowserClick = () => {
    // Pengguna memilih tetap di login / web browser, ganti ke izinkan notifikasi
    checkNotificationAndTransition();
  };

  const handleRequestNotification = async () => {
    setIsRequesting(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission === 'granted') {
        toast.success('Notifikasi Berhasil Diaktifkan! 🔔', {
          description: 'Anda akan menerima pembaruan izin santri secara langsung.',
        });
        // Kirimkan notifikasi selamat datang
        await sendPwaNotification('Notifikasi E-Izin Aktif 🔔', {
          body: 'Alhamdulillah, Anda telah mengaktifkan pemberitahuan izin santri SMAIT Ihsanul Fikri.',
          url: '/',
        });
      } else if (permission === 'denied') {
        toast.info('Izin Notifikasi Ditolak', {
          description:
            'Anda dapat mengaktifkannya kapan saja melalui pengaturan perizinan browser.',
        });
      }
    } catch (err) {
      console.error('Error saat meminta izin notifikasi:', err);
    } finally {
      setIsRequesting(false);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-action-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-x border-zinc-200 bg-white p-5 pb-6 shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bottom Sheet Handle */}
        <div className="w-10 h-1 rounded-full bg-zinc-300 mx-auto mb-3.5" />

        {step === 'install' ? (
          /* LANGKAH 1: DOWNLOAD APLIKASI ATAU TETAP DI BROWSER / LOGIN */
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs border border-emerald-200/60">
                  <Smartphone className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3
                    id="pwa-action-modal-title"
                    className="text-base font-bold text-zinc-900 leading-tight"
                  >
                    Pasang ke Layar Utama
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    E-Izin Santri SMAIT Ihsanul Fikri
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Tutup popup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="mt-3.5 space-y-3">
              <p className="text-xs text-zinc-600 leading-relaxed">
                Akses instan seperti aplikasi perangkat Anda tanpa perlu membuka browser berulang kali. Lebih cepat, hemat kuota, dan siap pakai.
              </p>

              {isIOS ? (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2 text-xs">
                  <p className="font-semibold text-zinc-800">
                    Petunjuk pasang di iPhone / iPad (Safari):
                  </p>
                  <div className="flex items-start gap-2 text-zinc-600">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800">
                      1
                    </span>
                    <span>
                      Tekan tombol{' '}
                      <Share className="w-3.5 h-3.5 text-blue-600 inline mx-0.5" />{' '}
                      <strong>Bagikan (Share)</strong> di bagian bawah Safari.
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-zinc-600">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-800">
                      2
                    </span>
                    <span>
                      Pilih{' '}
                      <PlusSquare className="w-3.5 h-3.5 text-zinc-800 inline mx-0.5" />{' '}
                      <strong>Tambahkan ke Layar Utama</strong>.
                    </span>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-11 rounded-xl shadow-xs cursor-pointer active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh / Pasang Aplikasi</span>
                </Button>
              )}

              {/* Tombol Lanjut di Browser (Stay di login) */}
              <Button
                type="button"
                variant="outline"
                onClick={handleStayInBrowserClick}
                className="w-full border-zinc-200 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 font-semibold text-xs h-10 rounded-xl cursor-pointer"
              >
                Lanjut di Browser (Tetap di Web)
              </Button>
            </div>
          </>
        ) : (
          /* LANGKAH 2: GANTI KE IZINKAN TERIMA NOTIFIKASI */
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs border border-emerald-200/60">
                  <BellRing className="w-5 h-5 text-emerald-700 animate-pulse" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                  </span>
                </div>
                <div>
                  <h3
                    id="pwa-action-modal-title"
                    className="text-base font-bold text-zinc-900 leading-tight"
                  >
                    Izinkan Terima Notifikasi
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Pemberitahuan Status Izin Santri
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                aria-label="Tutup popup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="mt-3.5 space-y-3.5">
              <p className="text-xs text-zinc-600 leading-relaxed">
                Aktifkan pemberitahuan langsung agar Anda tidak ketinggalan saat permohonan izin santri disetujui, ditolak, atau tiba kembali di pondok.
              </p>

              {/* Benefit box */}
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-900 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Update perizinan santri langsung ke layar HP</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-900 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Pemberitahuan saat santri keluar & masuk gerbang</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  onClick={handleRequestNotification}
                  disabled={isRequesting}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-11 rounded-xl shadow-xs cursor-pointer active:scale-98 transition flex items-center justify-center gap-2"
                >
                  {isRequesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses Izin...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      <span>Izinkan Terima Notifikasi</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isRequesting}
                  className="w-full border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 font-semibold text-xs h-10 rounded-xl cursor-pointer"
                >
                  Nanti Saja
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
