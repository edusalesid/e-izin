import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d).replace(/\./g, ':');
  } catch {
    return isoString;
  }
}

export function formatDateOnly(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d).replace(/\./g, ':') + ' WIB';
  } catch {
    return isoString;
  }
}

export function toInputDateTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${y}-${m}-${day}T${hours}:${mins}`;
  } catch {
    return '';
  }
}

export function fromInputDateTime(value?: string): string {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch {
    return '';
  }
}

export function calculateLateMinutes(plannedReturnIso: string, actualReturnIso: string): number {
  try {
    const planned = new Date(plannedReturnIso).getTime();
    const actual = new Date(actualReturnIso).getTime();
    const diffMs = actual - planned;
    if (diffMs > 0) {
      return Math.round(diffMs / (1000 * 60));
    }
    return 0;
  } catch {
    return 0;
  }
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'Tepat Waktu';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) {
    return `${remainingMinutes} menit`;
  }
  return `${hours} jam ${remainingMinutes > 0 ? remainingMinutes + ' menit' : ''}`;
}

export const DEFAULT_FINE_SETTINGS = {
  mode: 'PER_JAM' as const,
  ratePerUnit: 5000,
  gracePeriodMinutes: 15,
  maxFineAmount: 50000,
};

export function calculateLateFine(
  lateMinutes: number,
  customSettings?: {
    mode?: 'PER_JAM' | 'FLAT';
    ratePerUnit?: number;
    gracePeriodMinutes?: number;
    maxFineAmount?: number;
  }
): number {
  if (lateMinutes <= 0) return 0;
  const config = { ...DEFAULT_FINE_SETTINGS, ...customSettings };

  if (lateMinutes <= config.gracePeriodMinutes) {
    return 0; // Masih dalam toleransi bebas denda
  }

  let amount = 0;
  if (config.mode === 'FLAT') {
    amount = config.ratePerUnit;
  } else {
    // Mode PER_JAM: dihitung setiap kelipatan jam keterlambatan
    const hours = Math.ceil(lateMinutes / 60);
    amount = hours * config.ratePerUnit;
  }

  if (config.maxFineAmount > 0 && amount > config.maxFineAmount) {
    amount = config.maxFineAmount;
  }

  return amount;
}

export const LATE_FINE_AMOUNT = 20000;

export function formatRupiah(amount?: number): string {
  if (!amount && amount !== 0) return 'Rp0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s/g, '');
}

const WIB_TIMEZONE = 'Asia/Jakarta';

/**
 * Format date and time explicitly in WIB (Asia/Jakarta) for consistent SSR and client rendering.
 */
export function formatDateTimeWIB(value?: string | Date | null): string {
  if (!value) return '-';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: WIB_TIMEZONE,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
      .format(d)
      .replace(/\./g, ':');
  } catch {
    return typeof value === 'string' ? value : '-';
  }
}

/**
 * Format full Indonesian date explicitly in WIB (Asia/Jakarta).
 */
export function formatDateOnlyWIB(value?: string | Date | null): string {
  if (!value) return '-';
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: WIB_TIMEZONE,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return typeof value === 'string' ? value : '-';
  }
}

/**
 * Build the official permit letter number (`SI-IF/YYYY/MM/XXXXXX`) using WIB date parts.
 */
export function formatNomorSurat(id: string, createdAt: string | Date): string {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: WIB_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(isNaN(date.getTime()) ? new Date() : date);

  const year = parts.find((p) => p.type === 'year')?.value ?? String(new Date().getFullYear());
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const shortId = id.slice(-6).toUpperCase();

  return `SI-IF/${year}/${month}/${shortId}`;
}

export function getPermissionCategoryLabel(category?: string): string {
  switch (category) {
    case 'KELUAR_SEBENTAR':
      return 'Izin Keluar Sebentar (Tidak Menginap)';
    case 'PESIAR':
      return 'Izin Pesiar Terjadwal';
    case 'PULANG_MENGINAP':
      return 'Izin Pulang Menginap ke Rumah';
    default:
      return category || '-';
  }
}

const ESCORT_LABELS: Record<string, string> = {
  ORANG_TUA: 'Orang Tua / Wali',
  MANDIRI: 'Mandiri / Sendiri',
  OJEK_TRAVEL: 'Ojek Online / Travel',
  SAUDARA: 'Saudara / Kerabat',
  LAINNYA: 'Pihak Lainnya',
};

export function getEscortTypeLabel(escortType?: string): string {
  if (!escortType) return '-';
  return ESCORT_LABELS[escortType] || escortType;
}
