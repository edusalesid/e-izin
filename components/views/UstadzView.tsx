'use client';

import React from 'react';
import { Student, Permission, UserAccount } from '@/lib/types';
import { CreatePermissionForm } from '../forms/CreatePermissionForm';
import { PermissionCard } from '../cards/PermissionCard';
import { HistoryView } from './HistoryView';
import { PesiarView } from './PesiarView';
import { Clock, UserCheck, ChevronRight } from 'lucide-react';
import { TabKey } from '../BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface UstadzViewProps {
  activeTab: TabKey;
  currentUser: UserAccount;
  students: Student[];
  permissions: Permission[];
  onCheckIn?: (id: string, lateFineStatus?: 'UNPAID' | 'PAID') => void;
  onOpenReturnDrawer?: () => void;
  onRefresh: () => void;
  onTabChange: (tab: TabKey) => void;
}

export function UstadzView({
  activeTab,
  currentUser,
  students,
  permissions,
  onCheckIn,
  onOpenReturnDrawer,
  onRefresh,
  onTabChange,
}: UstadzViewProps) {
  const mySubmissions = permissions.filter(
    (p) => p.applicantType === 'USTADZ' && p.applicantId === currentUser.id
  );

  const outsideStudents = permissions.filter((p) => p.status === 'SEDANG_DI_LUAR');

  return (
    <div className="space-y-3.5">
      {/* Tab: AJUKAN */}
      {activeTab === 'AJUKAN' && (
        <div className="space-y-2">
          <div className="px-0.5">
            <h2 className="text-sm font-bold text-zinc-900">Pengajuan Izin Santri di Tempat</h2>
            <p className="text-xs text-zinc-600">
              Permohonan akan otomatis dikirim ke Wali Kelas santri yang bersangkutan.
            </p>
          </div>
          <CreatePermissionForm
            students={students}
            activeRole="USTADZ_UMUM"
            currentUser={currentUser}
            onSuccess={() => {
              onRefresh();
              onTabChange('STATUS');
            }}
          />
        </div>
      )}

      {/* Tab: PESIAR (Monitoring & Check-In Pesiar) */}
      {activeTab === 'PESIAR' && (
        <PesiarView
          currentUser={currentUser}
          students={students}
          permissions={permissions}
          onRefresh={onRefresh}
          activeRole="USTADZ_UMUM"
        />
      )}

      {/* Tab: STATUS */}
      {activeTab === 'STATUS' && (
        <div className="space-y-3">
          {/* Quick Action: Cek-in Santri Kembali (Compact Anti-Slop Bar) */}
          {outsideStudents.length > 0 && onOpenReturnDrawer && (
            <button
              type="button"
              onClick={onOpenReturnDrawer}
              className="w-full flex items-center justify-between p-2.5 px-3 rounded-xl border border-emerald-200/90 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-950 transition active:scale-[0.99] cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-3.5 h-3.5" />
                </div>
                <div className="text-left flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-900">
                    Cek-in Santri Kembali
                  </span>
                  <span className="text-[10px] font-semibold bg-emerald-200/80 text-emerald-900 px-1.5 py-0.2 rounded-full">
                    {outsideStudents.length} di luar
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-0.5">
                Cari Santri <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </button>
          )}

          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Status Permohonan Santri</h2>
              <p className="text-xs text-zinc-600">Izin santri yang diajukan oleh Anda</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onRefresh();
                toast.success('Data Diperbarui', {
                  description: 'Status permohonan santri telah disinkronkan.',
                });
              }}
              className="text-xs text-emerald-700 hover:text-emerald-800"
            >
              Segarkan
            </Button>
          </div>

          {mySubmissions.length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <Clock className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-zinc-900">Belum Ada Pengajuan Aktif</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Gunakan tab Ajukan jika ada santri yang meminta izin langsung di lokasi.
              </p>
            </Card>
          ) : (
            mySubmissions.map((perm) => (
              <PermissionCard key={perm.id} permission={perm} activeRole="USTADZ_UMUM" />
            ))
          )}
        </div>
      )}

      {/* Tab: RIWAYAT */}
      {activeTab === 'RIWAYAT' && (
        <HistoryView
          permissions={mySubmissions}
          title="Riwayat Pengajuan Anda"
          description="Daftar seluruh izin santri yang pernah Anda ajukan di ma'had."
          activeRole="USTADZ_UMUM"
          emptyTitle="Belum Ada Riwayat Pengajuan"
          emptySubtitle="Izin santri yang diajukan oleh Anda akan tercatat rapi di sini."
        />
      )}
    </div>
  );
}
