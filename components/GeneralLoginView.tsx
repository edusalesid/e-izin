'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Lock, RefreshCw, AlertCircle, ShieldCheck, Eye, EyeOff, LogIn } from 'lucide-react';
import { AuthSession } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface GeneralLoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
  onOpenInstall?: () => void;
  isInstalled?: boolean;
}

export function GeneralLoginView({
  onLoginSuccess,
  onOpenInstall,
  isInstalled,
}: GeneralLoginViewProps) {
  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Nomor NIS atau username wajib diisi.');
      return;
    }
    if (!secret.trim()) {
      setErrorMessage('Password atau PIN wajib diisi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginType: 'GENERAL',
          identifier: identifier.trim(),
          secret: secret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Username atau password tidak sesuai.');
      }

      onLoginSuccess(data.session);
    } catch (err: any) {
      const msg = err.message || 'Terjadi kendala saat memproses login.';
      setErrorMessage(msg);
      toast.error('Gagal Masuk', {
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-between px-4 py-6 max-w-md mx-auto">
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
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold mb-1">
            Portal Layanan Terpadu
          </Badge>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Masuk ke Akun Anda
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            SMAIT Ihsanul Fikri Mungkid, Magelang
          </p>
        </header>

        {/* Main General Form Card */}
        <Card className="border-zinc-200/90 shadow-xs">
          <CardHeader className="pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <CardTitle className="text-sm">Autentikasi Pengguna</CardTitle>
                <CardDescription className="text-xs">Silakan masukkan username dan password Anda</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="general-id-input">Username</Label>
                <Input
                  id="general-id-input"
                  type="text"
                  required
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Masukkan username atau NIS santri"
                />
                <span className="text-[11px] text-zinc-500 block">
                  Bisa menggunakan username dinas atau NIS santri
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="general-secret-input">Password</Label>
                <div className="relative">
                  <Input
                    id="general-secret-input"
                    type={showPassword ? 'text' : 'password'}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Masukkan password atau PIN"
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-800 rounded-md transition cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-start gap-2 text-xs text-rose-800 font-medium"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                size="lg"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-1.5" />
                    <span>Masuk ke Akun</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <footer className="pt-6 text-center text-xs text-zinc-500">
        <p>&copy; 2026 SMAIT Ihsanul Fikri Mungkid</p>
        <p className="text-[11px] text-zinc-400 mt-0.5">Sistem Perizinan Santri Terpadu</p>
      </footer>
    </div>
  );
}
