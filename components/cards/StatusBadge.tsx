import React from 'react';
import { PermissionStatus } from '@/lib/types';
import { Clock, CheckCircle2, XCircle, LogOut, CheckCheck, AlertTriangle, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: PermissionStatus;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  switch (status) {
    case 'PENDING_WALI_KELAS':
      return (
        <Badge
          variant="pending"
          className={cn('font-medium text-xs', className)}
        >
          {showIcon && <Clock className="w-3.5 h-3.5 text-amber-700" />}
          <span>Menunggu Persetujuan</span>
        </Badge>
      );

    case 'APPROVED_WALI_KELAS':
    case 'SEDANG_DI_LUAR':
      return (
        <Badge
          variant="active"
          className={cn('font-medium text-xs bg-emerald-50 text-emerald-800 border-emerald-200', className)}
        >
          {showIcon && <LogOut className="w-3.5 h-3.5 text-emerald-700" />}
          <span>Di Luar Asrama</span>
        </Badge>
      );

    case 'KEMBALI_TEPAT_WAKTU':
      return (
        <Badge
          variant="approved"
          className={cn('font-medium text-xs', className)}
        >
          {showIcon && <CheckCheck className="w-3.5 h-3.5 text-emerald-700" />}
          <span>Kembali Tepat Waktu</span>
        </Badge>
      );

    case 'KEMBALI_TERLAMBAT':
      return (
        <Badge
          variant="destructive"
          className={cn('font-medium text-xs', className)}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />}
          <span>Kembali Terlambat</span>
        </Badge>
      );

    case 'REJECTED':
      return (
        <Badge
          variant="rejected"
          className={cn('font-medium text-xs', className)}
        >
          {showIcon && <XCircle className="w-3.5 h-3.5 text-rose-700" />}
          <span>Ditolak</span>
        </Badge>
      );

    case 'CANCELLED':
      return (
        <Badge
          variant="outline"
          className={cn('font-medium text-xs bg-zinc-100 text-zinc-700 border-zinc-300', className)}
        >
          {showIcon && <Ban className="w-3.5 h-3.5 text-zinc-600" />}
          <span>Izin Dibatalkan</span>
        </Badge>
      );

    default:
      return null;
  }
}
