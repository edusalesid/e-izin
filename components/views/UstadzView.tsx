'use client';

import React, { useState } from 'react';
import { Student, Permission, UserAccount } from '@/lib/types';
import { CreatePermissionForm } from '../forms/CreatePermissionForm';
import { PermissionCard } from '../cards/PermissionCard';
import { HistoryView } from './HistoryView';
import { PesiarView } from './PesiarView';
import { Clock, UserCheck, ChevronRight, Search, X } from 'lucide-react';
import { TabKey } from '../BottomNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface UstadzViewProps {
  activeTab: TabKey;
  currentUser: UserAccount;
  students: Student[];
  permissions: Permission[];
  onCheckIn?: (id: string, lateFineStatus?: 'UNPAID' | 'PAID') => void;
  onCancel?: (id: string, reason: string) => void;
  onPreviewSurat?: (permission: Permission) => void;
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
  onCancel,
  onPreviewSurat,
  onOpenReturnDrawer,
  onRefresh,
  onTabChange,
}: UstadzViewProps) {
  const [query, setQuery] = useState('');

  const mySubmissions = permissions.filter(
    (p) => p.applicantType === 'USTADZ' && p.applicantId === currentUser.id
  );

  const outsideStudents = permissions.filter((p) => p.status === 'SEDANG_DI_LUAR');

  const filteredSubmissions = mySubmissions.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      p.studentName.toLowerCase().includes(q) ||
      p.studentNis.includes(q) ||
      p.className.toLowerCase().includes(q) ||
      p.reason.toLowerCase().includes(q)
    );
  });

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
            permissions={permissions}
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
          {/* Quick Action: Cek-in Santri Kembali */}
          {outsideStudents.length > 0 && onOpenReturnDrawer && (
            <button
              type="button"
              onClick={onOpenReturnDrawer}
              className="w-full flex items-center justify-between p-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/70 hover:bg-emerald-100/60 text-emerald-950 transition active:scale-[0.99] cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-left flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900">
                    Cek-in Santri Kembali
                  </span>
                  <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-lg">
                    {outsideStudents.length} di luar
                  </span>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-0.5">
                Cari Santri <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          )}

          <div className="flex items-center justify-between px-0.5 pt-0.5">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Status Permohonan Santri</h2>
              <p className="text-xs text-zinc-500">Izin santri yang diajukan oleh Anda</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">
                {filteredSubmissions.length} Permohonan
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onRefresh();
                  toast.success('Data Diperbarui', {
                    description: 'Status permohonan santri telah disinkronkan.',
                  });
                }}
                className="h-8 px-2.5 rounded-lg text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer"
              >
                Segarkan
              </Button>
            </div>
          </div>

          {mySubmissions.length > 2 && (
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari santri atau keperluan..."
                className="pl-9 pr-8 h-9 bg-white border-zinc-200 text-xs rounded-xl focus-visible:ring-emerald-600/30"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {mySubmissions.length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <Clock className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-zinc-900">Belum Ada Pengajuan Aktif</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Gunakan tab Ajukan jika ada santri yang meminta izin langsung di lokasi.
              </p>
            </Card>
          ) : filteredSubmissions.length === 0 ? (
            <Card className="border-dashed p-6 text-center bg-zinc-50/50 rounded-xl">
              <Search className="w-6 h-6 text-zinc-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-zinc-800">Tidak Ditemukan</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Tidak ada pengajuan izin yang cocok dengan kata kunci Anda.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuery('')}
                className="mt-3 text-xs h-7 px-3 rounded-lg cursor-pointer"
              >
                Reset Pencarian
              </Button>
            </Card>
          ) : (
            filteredSubmissions.map((perm) => (
              <PermissionCard
                key={perm.id}
                permission={perm}
                activeRole="USTADZ_UMUM"
                onCheckIn={onCheckIn}
                onCancel={onCancel}
                onPreviewSurat={onPreviewSurat}
              />
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
