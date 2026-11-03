'use client';

import React from 'react';
import { UserRole } from '@/lib/types';
import {
  Home,
  FileText,
  Clock,
  History,
  CheckSquare,
  Users,
  ShieldCheck,
  LogOut,
  Activity,
  AlertTriangle,
  Database,
  User,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type TabKey =
  | 'AJUKAN'
  | 'STATUS'
  | 'APPROVAL'
  | 'KELAS'
  | 'GERBANG'
  | 'DILUAR'
  | 'MONITOR'
  | 'TERLAMBAT'
  | 'MASTER'
  | 'RIWAYAT'
  | 'PROFIL'
  | 'PESIAR';

interface BottomNavProps {
  activeRole: UserRole;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  pendingCount?: number;
  outsideCount?: number;
  lateCount?: number;
}

export function BottomNav({
  activeRole,
  activeTab,
  onTabChange,
  pendingCount = 0,
  outsideCount = 0,
  lateCount = 0,
}: BottomNavProps) {
  const getTabs = () => {
    switch (activeRole) {
      case 'ORANG_TUA':
        return [
          { key: 'STATUS', label: 'Beranda', icon: Home },
          { key: 'RIWAYAT', label: 'Riwayat', icon: History },
          { key: 'PROFIL', label: 'Profil', icon: User },
        ];

      case 'WALI_KELAS':
        return [
          { key: 'KELAS', label: 'Santri Kelas', icon: Users },
          { key: 'PESIAR', label: 'Pesiar', icon: CalendarClock },
          { key: 'APPROVAL', label: 'Persetujuan', icon: CheckSquare, badge: pendingCount },
          { key: 'RIWAYAT', label: 'Riwayat', icon: History },
          { key: 'PROFIL', label: 'Profil Akun', icon: User },
        ];

      case 'SATPAM':
        return [
          { key: 'GERBANG', label: 'Siap Keluar', icon: ShieldCheck, badge: pendingCount },
          { key: 'DILUAR', label: 'Di Luar', icon: LogOut, badge: outsideCount },
          { key: 'RIWAYAT', label: 'Log Gerbang', icon: History },
          { key: 'PROFIL', label: 'Profil Akun', icon: User },
        ];

      case 'SUPER_ADMIN':
        return [
          { key: 'APPROVAL', label: 'Persetujuan', icon: CheckSquare, badge: pendingCount },
          { key: 'PESIAR', label: 'Pesiar', icon: CalendarClock },
          { key: 'MONITOR', label: 'Live Monitor', icon: Activity, badge: outsideCount },
          { key: 'TERLAMBAT', label: 'Keterlambatan', icon: AlertTriangle, badge: lateCount },
          { key: 'MASTER', label: 'Data Santri', icon: Database },
          { key: 'RIWAYAT', label: 'Semua Izin', icon: History },
          { key: 'PROFIL', label: 'Profil Akun', icon: User },
        ];

      case 'KEPALA_ASRAMA':
        return [
          { key: 'APPROVAL', label: 'Persetujuan', icon: CheckSquare, badge: pendingCount },
          { key: 'PESIAR', label: 'Pesiar', icon: CalendarClock },
          { key: 'MONITOR', label: 'Live Monitor', icon: Activity, badge: outsideCount },
          { key: 'TERLAMBAT', label: 'Keterlambatan', icon: AlertTriangle, badge: lateCount },
          { key: 'MASTER', label: 'Data Santri', icon: Database },
          { key: 'RIWAYAT', label: 'Semua Izin', icon: History },
          { key: 'PROFIL', label: 'Profil Akun', icon: User },
        ];

      case 'USTADZ_UMUM':
      default:
        return [
          { key: 'STATUS', label: 'Status Santri', icon: Clock },
          { key: 'PESIAR', label: 'Pesiar', icon: CalendarClock },
          { key: 'AJUKAN', label: 'Buat Izin', icon: FileText },
          { key: 'RIWAYAT', label: 'Riwayat', icon: History },
          { key: 'PROFIL', label: 'Profil Akun', icon: User },
        ];
    }
  };

  const tabs = getTabs();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-md items-center justify-around px-1 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          const hasBadge = Boolean(tab.badge && tab.badge > 0);

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key as TabKey)}
              className={cn(
                'relative flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-colors cursor-pointer select-none min-h-[48px] min-w-[52px]',
                isActive
                  ? 'text-emerald-800 font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 font-medium'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-105 stroke-[2.2] text-emerald-700')} />
                {hasBadge && (
                  <span className="absolute -top-1 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[10px] tracking-tight leading-none truncate max-w-[64px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
