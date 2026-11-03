'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, PlusCircle, Users, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StaffBottomNavProps {
  pendingCount?: number;
  outsideCount?: number;
}

export function StaffBottomNav({ pendingCount = 0, outsideCount = 0 }: StaffBottomNavProps) {
  const pathname = usePathname();

  const isHome = pathname === '/petugas' || pathname === '/';
  const isAjukan = pathname === '/petugas/ajukan';
  const isSantri = pathname === '/petugas/santri';

  const navItems = [
    {
      href: '/',
      label: 'Portal Utama',
      icon: ClipboardList,
      isActive: isHome,
      badge: pendingCount,
    },
    {
      href: '/petugas/ajukan',
      label: 'Buat Izin',
      icon: PlusCircle,
      isActive: isAjukan,
      highlight: true,
    },
    {
      href: '/petugas/santri',
      label: 'Santri & Posisi',
      icon: Users,
      isActive: isSantri,
      badge: outsideCount,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const hasBadge = Boolean(item.badge && item.badge > 0);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer select-none min-h-[48px]',
                item.isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 font-medium'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform',
                    item.isActive && 'scale-110 stroke-[2.5]',
                    item.highlight && !item.isActive && 'text-emerald-600'
                  )}
                />
                {hasBadge && (
                  <span className="absolute -top-1 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-black text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
