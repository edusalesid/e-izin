import React from 'react';
import { PermissionStatus } from '@/lib/types';
import { Clock, CheckCircle2, XCircle, LogOut, CheckCheck, AlertTriangle } from 'lucide-react';
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
      return (
        <Badge
          variant="approved"
          className={cn('font-medium text-xs', className)}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
          <span>Disetujui (Siap Keluar)</span>
        </Badge>
      );

    case 'SEDANG_DI_LUAR':
      return (
        <Badge
          variant="active"
          className={cn('font-medium text-xs', className)}
        >
          {showIcon && <LogOut className="w-3.5 h-3.5 text-blue-700" />}
          <span>Sedang di Luar</span>
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

    default:
      return null;
  }
}
