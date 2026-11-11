import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Ban,
  AlertTriangle,
  ArrowLeft,
  UserCheck,
  CalendarClock,
  FileCheck2,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PermissionStatus } from '@/lib/types';
import { StatusBadge } from '@/components/cards/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  cn,
  formatDateTimeWIB,
  formatDuration,
  formatNomorSurat,
  getEscortTypeLabel,
  getPermissionCategoryLabel,
} from '@/lib/utils';
import { RefreshVerificationButton } from './RefreshVerificationButton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verifikasi Surat Izin | E-Izin SMAIT Ihsanul Fikri',
  description:
    'Halaman verifikasi keaslian dan status surat izin santri SMAIT Ihsanul Fikri Mungkid secara real-time.',
  robots: {
    index: false,
    follow: false,
  },
};

type VerificationTone = 'emerald' | 'amber' | 'rose';

interface VerificationDisplay {
  tone: VerificationTone;
  title: string;
  subtitle: string;
  isAuthorized: boolean;
  icon: 'valid' | 'pending' | 'invalid';
}

const STATUS_DISPLAY_MAP: Record<PermissionStatus, VerificationDisplay> = {
  APPROVED_WALI_KELAS: {
    tone: 'emerald',
    title: 'DOKUMEN RESMI TERVERIFIKASI',
    subtitle: 'Izin aktif dan disetujui resmi. Santri diizinkan keluar asrama sesuai jadwal.',
    isAuthorized: true,
    icon: 'valid',
  },
  SEDANG_DI_LUAR: {
    tone: 'emerald',
    title: 'DOKUMEN RESMI TERVERIFIKASI',
    subtitle: 'Izin aktif. Santri tercatat sedang berada di luar asrama.',
    isAuthorized: true,
    icon: 'valid',
  },
  KEMBALI_TEPAT_WAKTU: {
    tone: 'emerald',
    title: 'DOKUMEN RESMI TERVERIFIKASI',
    subtitle: 'Surat izin asli. Masa izin telah selesai dan santri kembali tepat waktu.',
    isAuthorized: true,
    icon: 'valid',
  },
  KEMBALI_TERLAMBAT: {
    tone: 'amber',
    title: 'DOKUMEN RESMI TERVERIFIKASI',
    subtitle: 'Surat izin asli. Santri telah kembali ke asrama dengan catatan keterlambatan.',
    isAuthorized: true,
    icon: 'valid',
  },
  PENDING_WALI_KELAS: {
    tone: 'amber',
    title: 'BELUM DISETUJUI',
    subtitle:
      'Pengajuan tercatat di sistem, namun belum mendapatkan persetujuan resmi sehingga surat belum berlaku.',
    isAuthorized: false,
    icon: 'pending',
  },
  REJECTED: {
    tone: 'rose',
    title: 'SURAT TIDAK BERLAKU — DITOLAK',
    subtitle: 'Permohonan izin ini telah ditolak dan tidak sah digunakan sebagai izin keluar.',
    isAuthorized: false,
    icon: 'invalid',
  },
  CANCELLED: {
    tone: 'rose',
    title: 'SURAT TIDAK BERLAKU — DIBATALKAN',
    subtitle: 'Surat izin ini telah dibatalkan di sistem dan tidak lagi berlaku.',
    isAuthorized: false,
    icon: 'invalid',
  },
};

const TONE_CLASSES: Record<
  VerificationTone,
  { banner: string; iconBox: string; title: string; subtitle: string }
> = {
  emerald: {
    banner: 'bg-emerald-50 border-emerald-200',
    iconBox: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    title: 'text-emerald-900',
    subtitle: 'text-emerald-800',
  },
  amber: {
    banner: 'bg-amber-50 border-amber-200',
    iconBox: 'bg-amber-100 text-amber-700 border-amber-200',
    title: 'text-amber-900',
    subtitle: 'text-amber-800',
  },
  rose: {
    banner: 'bg-rose-50 border-rose-200',
    iconBox: 'bg-rose-100 text-rose-700 border-rose-200',
    title: 'text-rose-900',
    subtitle: 'text-rose-800',
  },
};

interface OfficialSignerMeta {
  signerName: string;
  signerTitle: string;
}

async function getOfficialSignerMeta(): Promise<OfficialSignerMeta> {
  const fallback: OfficialSignerMeta = {
    signerName: 'Anton, M.Hum., Gr.',
    signerTitle: 'Penanggung Jawab Perizinan SMAIT Ihsanul Fikri',
  };

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'official_digital_signature' },
      select: { value: true },
    });
    if (!setting?.value) return fallback;

    const parsed = JSON.parse(setting.value) as Partial<OfficialSignerMeta>;
    return {
      signerName: parsed.signerName || fallback.signerName,
      signerTitle: parsed.signerTitle || fallback.signerTitle,
    };
  } catch {
    return fallback;
  }
}

export default async function VerifikasiSuratPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId || '').trim();
  const checkedAt = formatDateTimeWIB(new Date());

  let permission: {
    id: string;
    studentName: string;
    studentNis: string;
    className: string;
    dormitory: string | null;
    category: string;
    reason: string;
    escortType: string;
    escortNote: string | null;
    plannedDeparture: string;
    plannedReturn: string;
    actualDeparture: string | null;
    actualReturn: string | null;
    status: string;
    rejectionReason: string | null;
    approvedByName: string | null;
    approvedAt: string | null;
    satpamDepartureName: string | null;
    satpamReturnName: string | null;
    lateDurationMinutes: number | null;
    createdAt: Date;
  } | null = null;

  let loadError = false;

  if (id) {
    try {
      permission = await prisma.permission.findUnique({
        where: { id },
        select: {
          id: true,
          studentName: true,
          studentNis: true,
          className: true,
          dormitory: true,
          category: true,
          reason: true,
          escortType: true,
          escortNote: true,
          plannedDeparture: true,
          plannedReturn: true,
          actualDeparture: true,
          actualReturn: true,
          status: true,
          rejectionReason: true,
          approvedByName: true,
          approvedAt: true,
          satpamDepartureName: true,
          satpamReturnName: true,
          lateDurationMinutes: true,
          createdAt: true,
        },
      });
    } catch (err) {
      console.error('Gagal memverifikasi surat izin:', err);
      loadError = true;
    }
  }

  const signerMeta = permission ? await getOfficialSignerMeta() : null;

  const statusInfo: VerificationDisplay | null = permission
    ? STATUS_DISPLAY_MAP[permission.status as PermissionStatus] ?? {
        tone: 'amber',
        title: 'STATUS TIDAK DIKENAL',
        subtitle: `Status perizinan: ${permission.status}`,
        isAuthorized: false,
        icon: 'pending',
      }
    : null;

  const isActiveOutside =
    permission?.status === 'APPROVED_WALI_KELAS' || permission?.status === 'SEDANG_DI_LUAR';
  const plannedReturnMs = permission ? new Date(permission.plannedReturn).getTime() : NaN;
  const isPastPlannedReturn =
    Boolean(isActiveOutside) && !Number.isNaN(plannedReturnMs) && Date.now() > plannedReturnMs;

  return (
    <main className="min-h-screen bg-zinc-100 py-6 px-4 sm:py-10">
      <div className="mx-auto max-w-xl space-y-4">
        {/* Identitas Sekolah */}
        <header className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 shadow-xs flex items-center gap-3.5">
          <img
            src="/logo-smait.png"
            alt="Logo SMAIT Ihsanul Fikri"
            className="h-12 w-12 object-contain shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Sistem E-Izin Santri
            </p>
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
              SMAIT Ihsanul Fikri Mungkid
            </h1>
            <p className="text-xs text-zinc-500">
              Verifikasi Keaslian Surat Izin Keluar / Pulang Asrama
            </p>
          </div>
        </header>

        {/* State Error Database */}
        {loadError ? (
          <section className="bg-white border border-rose-200 rounded-xl p-6 shadow-xs text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-zinc-900">
                Gagal Memuat Data Verifikasi
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Terjadi kendala saat menghubungkan ke server data perizinan. Silakan muat ulang halaman beberapa saat lagi.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <RefreshVerificationButton />
              <Button asChild variant="ghost" size="sm">
                <Link href="/">Ke Halaman Utama</Link>
              </Button>
            </div>
          </section>
        ) : !permission || !statusInfo ? (
          /* State Tidak Ditemukan */
          <section className="bg-white border border-rose-200 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-rose-50 border-b border-rose-200 p-5 flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm sm:text-base font-extrabold text-rose-900 tracking-tight">
                  DOKUMEN TIDAK DITEMUKAN / TIDAK VALID
                </h2>
                <p className="text-xs sm:text-sm text-rose-800 leading-relaxed">
                  Kode atau tautan surat izin tidak terdaftar dalam basis data resmi E-Izin SMAIT Ihsanul Fikri. Pastikan QR code dipindai dari surat resmi atau periksa kembali tautan.
                </p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 text-xs text-zinc-600 flex items-center justify-between gap-2">
                <span>ID Referensi</span>
                <code className="font-mono text-zinc-800 break-all">{id || '-'}</code>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <span>Diperiksa: {checkedAt} WIB</span>
                <Button asChild variant="outline" size="sm">
                  <Link href="/" className="gap-1.5">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Beranda E-Izin</span>
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        ) : (
          /* State Ditemukan */
          <>
            {/* Banner Keabsahan Utama */}
            <section
              className={cn(
                'border rounded-xl p-4 sm:p-5 shadow-xs space-y-3',
                TONE_CLASSES[statusInfo.tone].banner
              )}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl border flex items-center justify-center shrink-0',
                    TONE_CLASSES[statusInfo.tone].iconBox
                  )}
                >
                  {statusInfo.icon === 'valid' && <ShieldCheck className="w-6 h-6" />}
                  {statusInfo.icon === 'pending' && <Clock className="w-6 h-6" />}
                  {statusInfo.icon === 'invalid' && <Ban className="w-6 h-6" />}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h2
                    className={cn(
                      'text-sm sm:text-base font-extrabold tracking-tight',
                      TONE_CLASSES[statusInfo.tone].title
                    )}
                  >
                    {statusInfo.title}
                  </h2>
                  <p
                    className={cn(
                      'text-xs sm:text-sm leading-relaxed',
                      TONE_CLASSES[statusInfo.tone].subtitle
                    )}
                  >
                    {statusInfo.subtitle}
                  </p>
                </div>
              </div>

              {isPastPlannedReturn && (
                <div className="rounded-lg bg-amber-100/80 border border-amber-300 px-3 py-2 text-xs font-medium text-amber-950 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    Perhatian: Waktu saat ini telah melewati batas rencana kembali (
                    <strong>{formatDateTimeWIB(permission.plannedReturn)} WIB</strong>).
                  </span>
                </div>
              )}

              {permission.rejectionReason &&
                (permission.status === 'REJECTED' || permission.status === 'CANCELLED') && (
                  <div className="rounded-lg bg-white/80 border border-rose-200 px-3 py-2 text-xs text-rose-900">
                    <span className="font-semibold">Alasan: </span>
                    <span>{permission.rejectionReason}</span>
                  </div>
                )}

              {permission.status === 'KEMBALI_TERLAMBAT' &&
                typeof permission.lateDurationMinutes === 'number' &&
                permission.lateDurationMinutes > 0 && (
                  <div className="rounded-lg bg-white/80 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                    <span className="font-semibold">Durasi Keterlambatan: </span>
                    <span>{formatDuration(permission.lateDurationMinutes)}</span>
                  </div>
                )}
            </section>

            {/* Detail Dokumen Surat */}
            <section className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
              <div className="px-4 py-3.5 sm:px-5 border-b border-zinc-200 bg-zinc-50/70 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCheck2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-zinc-500">Nomor Surat Resmi</p>
                    <p className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
                      {formatNomorSurat(permission.id, permission.createdAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={permission.status as PermissionStatus} />
              </div>

              <div className="divide-y divide-zinc-100 text-xs sm:text-sm">
                <DetailRow label="Nama Santri" value={permission.studentName} bold />
                <DetailRow label="NIS" value={permission.studentNis} />
                <DetailRow
                  label="Kelas & Asrama"
                  value={`Kelas ${permission.className} • ${permission.dormitory || 'Asrama SMAIT IF'}`}
                />
                <DetailRow
                  label="Kategori Izin"
                  value={getPermissionCategoryLabel(permission.category)}
                />
                <DetailRow label="Keperluan / Alasan" value={permission.reason} />
                <DetailRow
                  label="Pihak Penjemput"
                  value={
                    permission.escortNote
                      ? `${getEscortTypeLabel(permission.escortType)} (${permission.escortNote})`
                      : getEscortTypeLabel(permission.escortType)
                  }
                />
              </div>

              {/* Jadwal & Realisasi */}
              <div className="border-t border-zinc-200 bg-zinc-50/50 px-4 py-3.5 sm:px-5 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                  <CalendarClock className="w-4 h-4 text-emerald-700" />
                  <span>Waktu Perizinan</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg bg-white border border-zinc-200 p-3">
                    <p className="text-[11px] text-zinc-500">Rencana Keluar</p>
                    <p className="font-semibold text-zinc-900 mt-0.5">
                      {formatDateTimeWIB(permission.plannedDeparture)} WIB
                    </p>
                    {permission.actualDeparture && (
                      <p className="text-[11px] text-emerald-700 mt-1">
                        Keluar tercatat: {formatDateTimeWIB(permission.actualDeparture)} WIB
                        {permission.satpamDepartureName
                          ? ` (${permission.satpamDepartureName})`
                          : ''}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg bg-white border border-zinc-200 p-3">
                    <p className="text-[11px] text-zinc-500">Rencana Kembali</p>
                    <p className="font-semibold text-zinc-900 mt-0.5">
                      {formatDateTimeWIB(permission.plannedReturn)} WIB
                    </p>
                    {permission.actualReturn && (
                      <p className="text-[11px] text-emerald-700 mt-1">
                        Kembali tercatat: {formatDateTimeWIB(permission.actualReturn)} WIB
                        {permission.satpamReturnName ? ` (${permission.satpamReturnName})` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Pengesahan */}
              {statusInfo.isAuthorized && signerMeta && (
                <div className="border-t border-zinc-200 px-4 py-3.5 sm:px-5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-0.5">
                    <p className="text-zinc-500">Disetujui &amp; Disahkan Oleh</p>
                    <p className="font-bold text-zinc-900">
                      {permission.approvedByName || signerMeta.signerName}
                    </p>
                    <p className="text-[11px] text-zinc-600">{signerMeta.signerTitle}</p>
                    {permission.approvedAt && (
                      <p className="text-[11px] text-zinc-500 pt-0.5">
                        Waktu persetujuan: {formatDateTimeWIB(permission.approvedAt)} WIB
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Footer Verifikasi */}
            <footer className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-zinc-500">
              <span>Diperiksa langsung dari basis data: {checkedAt} WIB</span>
              <div className="flex items-center gap-2">
                <RefreshVerificationButton />
                <Button asChild variant="ghost" size="sm">
                  <Link href="/">Beranda</Link>
                </Button>
              </div>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}

function DetailRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="px-4 py-2.5 sm:px-5 grid grid-cols-1 sm:grid-cols-3 gap-0.5 sm:gap-3">
      <div className="text-zinc-500 font-medium">{label}</div>
      <div
        className={cn(
          'sm:col-span-2 text-zinc-900 break-words',
          bold ? 'font-bold text-zinc-950' : 'font-medium'
        )}
      >
        {value}
      </div>
    </div>
  );
}
