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
  | 'PESIAR'
  | 'USER_MGMT';

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
  const getTabs = (): Array<{
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeTone?: 'pending' | 'outside';
  }> => {
    switch (activeRole) {
      case 'ORANG_TUA':
        return [
          { key: 'STATUS', label: 'Beranda', icon: Home },
          { key: 'RIWAYAT', label: 'Riwayat', icon: History },
          { key: 'PROFIL', label: 'Profil', icon: User },
        ];

      case 'WALI_KELAS':
        return [
          { key: 'KELAS', label: 'Santri', icon: Users },
          { key: 'PESIAR', label: 'Pesiar', icon: CalendarClock },
          { key: 'APPROVAL', label: 'Persetujuan', icon: CheckSquare, badge: pendingCount, badgeTone: 'pending' },
          { key: 'RIWAYAT', label: 'Riwayat', icon: History },
          { key: 'PROFIL', label: 'Profil', icon: User },
        ];

      case 'SATPAM':
        return [
          { key: 'GERBANG', label: 'Siap Keluar', icon: ShieldCheck, badge: pendingCount, badgeTone: 'pending' },
          { key: 'DILUAR', label: 'Di Luar', icon: LogOut, badge: outsideCount, badgeTone: 'outside' },
          { key: 'RIWAYAT', label: 'Riwayat', icon: History },
          { key: 'PROFIL', label: 'Profil', icon: User },
        ];

      case 'SUPER_ADMIN':
        return [
          { key: 'APPROVAL', label: 'Persetujuan', icon: CheckSquare, badge: pendingCount, badgeTone: 'pending' },
          { key: 'MASTER', label: 'Master', icon: Database },
          { key: 'RIWAYAT', label: 'Riwayat', icon: History, badge: outsideCount, badgeTone: 'outside' },
          { key: 'PROFIL', label: 'Profil', icon: User },
        ];

      case 'KEPALA_ASRAMA':
        return [
          { key: 'APPROVAL', label: 'Persetujuan', icon: CheckSquare, badge: pendingCount, badgeTone: 'pending' },
          { key: 'MASTER', label: 'Data Santri', icon: Database },
          { key: 'RIWAYAT', label: 'Riwayat', icon: History, badge: outsideCount, badgeTone: 'outside' },
          { key: 'PROFIL', label: 'Profil', icon: User },
        ];

      case 'USTADZ_UMUM':
      default:
        return [
          { key: 'STATUS', label: 'Status', icon: Clock },
          { key: 'PESIAR', label: 'Pesiar', icon: CalendarClock },
          { key: 'AJUKAN', label: 'Buat Izin', icon: FileText },
          { key: 'RIWAYAT', label: 'Riwayat', icon: History },
          { key: 'PROFIL', label: 'Profil', icon: User },
        ];
    }
  };

  const tabs = getTabs();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.key ||
            ((activeRole === 'SUPER_ADMIN' || activeRole === 'KEPALA_ASRAMA') &&
              ((tab.key === 'APPROVAL' && activeTab === 'PESIAR') ||
                (tab.key === 'RIWAYAT' && (activeTab === 'MONITOR' || activeTab === 'TERLAMBAT')))) ||
            (activeRole === 'SUPER_ADMIN' && tab.key === 'MASTER' && activeTab === 'USER_MGMT');
          const hasBadge = Boolean(tab.badge && tab.badge > 0);
          const badgeLabel = tab.badge && tab.badge > 99 ? '99+' : tab.badge;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                'relative flex flex-col items-center justify-center py-1.5 px-1.5 rounded-xl transition-colors cursor-pointer select-none min-h-[48px] flex-1 max-w-[84px]',
                isActive
                  ? 'text-emerald-800 font-bold'
                  : 'text-zinc-600 hover:text-zinc-900 font-medium'
              )}
            >
              <div className="relative">
                <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-105 stroke-[2.2] text-emerald-700')} />
                {hasBadge && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-white shadow-xs',
                      tab.badgeTone === 'outside' ? 'bg-emerald-700' : 'bg-rose-600'
                    )}
                  >
                    {badgeLabel}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[11px] tracking-tight leading-tight truncate max-w-[74px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
