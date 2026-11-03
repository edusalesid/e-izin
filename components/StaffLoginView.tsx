'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Shield, Lock, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { AuthSession, UserAccount } from '@/lib/types';
import { toast } from 'sonner';

interface StaffLoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
  availableUsers: UserAccount[];
  onOpenInstall?: () => void;
  isInstalled?: boolean;
}

export function StaffLoginView({
  onLoginSuccess,
  availableUsers,
  onOpenInstall,
  isInstalled,
}: StaffLoginViewProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !pin.trim()) {
      setErrorMessage('Username dan PIN pengamanan wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginType: 'PETUGAS',
          username: username.trim(),
          pin: pin.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal masuk ke portal petugas.');
      }

      onLoginSuccess(data.session);
    } catch (err: any) {
      const msg = err.message || 'Terjadi kesalahan sistem.';
      setErrorMessage(msg);
      toast.error('Gagal Masuk', {
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between px-4 py-6">
      <div className="space-y-4">
        {/* Header Branding */}
        <header className="text-center pt-2 pb-1">
          <div className="relative mx-auto h-12 w-32 mb-2">
            <Image
              src="https://infosmait.ihsanulfikri.sch.id/wp-content/uploads/2026/10/Untitled-design-768x431.png"
              alt="Logo SMAIT Ihsanul Fikri"
              fill
              sizes="128px"
              className="object-contain"
              priority
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="inline-block rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-bold tracking-tight mb-1">
            Portal Khusus Petugas
          </span>
          <h1 className="text-lg font-black tracking-tight text-zinc-900">
            Akses Ustadz & Staf Pondok
          </h1>
          <p className="text-xs font-medium text-zinc-500 mt-0.5">
            Wali Kelas &bull; Pengasuhan &bull; Satpam Gerbang
          </p>
        </header>

        {/* Main Staff Form */}
        <main className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-zinc-100">
            <div className="h-7 w-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Shield className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-zinc-900">Login Autentikasi Staf</h2>
              <p className="text-[10px] text-zinc-500">Gunakan akun tugas dan PIN resmi</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label htmlFor="staff-select" className="block text-xs font-bold text-zinc-800 mb-1">
                Pilih Akun Petugas / Ustadz *
              </label>
              <select
                id="staff-select"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base sm:text-xs font-medium text-zinc-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 min-h-[48px]"
              >
                <option value="">-- Pilih Akun Dinas --</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.username}>
                    {u.name} ({
                      u.role === 'SUPER_ADMIN'
                        ? 'Super Admin'
                        : u.role === 'WALI_KELAS'
                        ? 'Wali Kelas'
                        : u.role === 'KEPALA_ASRAMA'
                        ? 'Kepala Asrama'
                        : u.role === 'SATPAM'
                        ? 'Pos Satpam'
                        : 'Ustadz Piket'
                    })
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="staff-pin-input" className="block text-xs font-bold text-zinc-800 mb-1">
                Password / PIN Pengamanan *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="staff-pin-input"
                  type="password"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Masukkan password atau PIN"
                  className="w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3.5 py-2.5 text-base sm:text-xs font-medium text-zinc-900 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20 min-h-[48px]"
                />
              </div>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-2 text-xs text-rose-800 font-medium"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-md shadow-emerald-800/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <span>Masuk Sebagai Petugas</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </main>
      </div>

      {/* Footer Info */}
      <footer className="pt-4 text-center text-[11px] text-zinc-500">
        <p>&copy; 2026 SMAIT Ihsanul Fikri Mungkid</p>
        <p className="text-[10px] text-zinc-400 mt-0.5">Sistem Internal Pengasuhan & Keamanan</p>
      </footer>
    </div>
  );
}
