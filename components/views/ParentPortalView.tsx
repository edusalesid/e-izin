'use client';

import React from 'react';
import { Student, Permission } from '@/lib/types';
import { CreatePermissionForm } from '../forms/CreatePermissionForm';
import { PermissionCard } from '../cards/PermissionCard';
import { HistoryView } from './HistoryView';
import { formatDateTime } from '@/lib/utils';
import {
  Clock,
  CheckCircle2,
  ArrowUpRight,
  CheckCheck,
  AlertCircle,
  Home,
  FileText,
  History,
  RotateCw,
} from 'lucide-react';
import { TabKey } from '../BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface ParentPortalViewProps {
  activeTab: TabKey;
  student: Student | null;
  permissions: Permission[];
  onRefresh: () => void;
  onTabChange: (tab: TabKey) => void;
  onOpenAjukan?: () => void;
  onPreviewSurat?: (permission: Permission) => void;
}

export function ParentPortalView({
  activeTab,
  student,
  permissions,
  onRefresh,
  onTabChange,
  onOpenAjukan,
  onPreviewSurat,
}: ParentPortalViewProps) {
  const activePermission = permissions.find(
    (p) =>
      p.status === 'PENDING_WALI_KELAS' ||
      p.status === 'APPROVED_WALI_KELAS' ||
      p.status === 'SEDANG_DI_LUAR'
  );

  const historyPermissions = permissions.filter(
    (p) =>
      p.status === 'KEMBALI_TEPAT_WAKTU' ||
      p.status === 'KEMBALI_TERLAMBAT' ||
      p.status === 'REJECTED'
  );

  if (!student) {
    return (
      <Card className="p-8 text-center border-dashed">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-zinc-900">Santri Tidak Ditemukan</h3>
        <p className="text-xs text-zinc-600 mt-1">Periksa kembali NIS yang dimasukkan saat masuk.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* Tab: AJUKAN (Fallback / Direct) */}
      {activeTab === 'AJUKAN' && (
        <div className="space-y-2">
          <div className="px-0.5">
            <h2 className="text-sm font-bold text-zinc-900">Form Pengajuan Izin Santri</h2>
            <p className="text-xs text-zinc-600">Izin akan diteruskan langsung ke Wali Kelas santri.</p>
          </div>
          <CreatePermissionForm
            students={[student]}
            permissions={permissions}
            preselectedStudent={student}
            activeRole="ORANG_TUA"
            currentUser={null}
            onSuccess={() => {
              onRefresh();
              onTabChange('STATUS');
            }}
          />
        </div>
      )}

      {/* Tab: STATUS (Beranda Wali Santri) */}
      {activeTab === 'STATUS' && (
        <div className="space-y-3">
          {/* 1. Header Ringkas Beranda & Status Santri */}
          <div className="flex items-center justify-between px-0.5 pt-0.5">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">
                Beranda Wali Santri
              </h2>
              <p className="text-xs text-zinc-500">
                Pantau perizinan dan keberadaan santri secara real-time
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onRefresh();
                toast.success('Data Diperbarui', {
                  description: 'Status perizinan santri telah disinkronkan.',
                });
              }}
              className="text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 h-8 px-2.5 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 mr-1" />
              <span>Segarkan</span>
            </Button>
          </div>

          {/* 2. Banner Identitas & Status Keberadaan Ananda */}
          <Card className="p-3.5 border-zinc-200/90 bg-white shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {student.fullName.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
                    {student.fullName}
                  </h3>
                  <p className="text-[11px] text-zinc-500 truncate">
                    NIS: {student.nis} • {student.className}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                {activePermission?.status === 'SEDANG_DI_LUAR' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-300">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Di Luar Asrama
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <Home className="w-3 h-3 text-emerald-600" />
                    Di Asrama
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* 3. Tampilan Saat Ada Izin Aktif vs Tidak Ada Izin */}
          {activePermission ? (
            <div className="space-y-3">
              {/* Timeline Flow Card */}
              <Card className="p-4 border-zinc-200/90 shadow-xs">
                <p className="text-xs font-bold text-zinc-900 mb-3.5">Rangkaian Proses Perizinan:</p>

                <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                  {/* Step 1: Diajukan */}
                  <div className="relative flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xs z-10">
                      <CheckCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">Pengajuan Terkirim</p>
                      <p className="text-[11px] text-zinc-500">{formatDateTime(activePermission.createdAt)}</p>
                    </div>
                  </div>

                  {/* Step 2: Persetujuan Wali Kelas */}
                  <div className="relative flex items-start gap-3">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white shadow-xs z-10 ${
                        activePermission.status !== 'PENDING_WALI_KELAS'
                          ? 'bg-emerald-700'
                          : 'bg-amber-500'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">
                        {activePermission.status === 'PENDING_WALI_KELAS'
                          ? 'Menunggu Persetujuan Wali Kelas'
                          : `Disetujui (${activePermission.approvedByName || 'Wali Kelas'})`}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {activePermission.approvedAt
                          ? formatDateTime(activePermission.approvedAt)
                          : 'Notifikasi telah masuk ke sistem persetujuan Wali Kelas / Kepala Asrama'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Gerbang Pos Satpam */}
                  <div className="relative flex items-start gap-3">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white shadow-xs z-10 ${
                        activePermission.status === 'SEDANG_DI_LUAR'
                          ? 'bg-blue-600'
                          : activePermission.status === 'APPROVED_WALI_KELAS'
                          ? 'bg-zinc-300 text-zinc-700'
                          : 'bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-900">
                        {activePermission.status === 'SEDANG_DI_LUAR'
                          ? 'Santri Telah Keluar Gerbang'
                          : 'Menunggu Santri Melewati Pos Gerbang'}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {activePermission.actualDeparture
                          ? `Keluar pada: ${formatDateTime(activePermission.actualDeparture)}`
                          : 'Petugas pos satpam akan memverifikasi saat santri keluar'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Detail Card Izin Aktif */}
              <PermissionCard
                permission={activePermission}
                activeRole="ORANG_TUA"
                onPreviewSurat={onPreviewSurat}
              />
            </div>
          ) : (
            <Card className="border border-zinc-200/90 bg-white p-6 text-center shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mx-auto text-emerald-700">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Ananda di Asrama
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Tidak ada izin aktif saat ini.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2 max-w-xs mx-auto">
                <Button
                  size="sm"
                  onClick={() => {
                    if (onOpenAjukan) {
                      onOpenAjukan();
                    } else {
                      onTabChange('AJUKAN');
                    }
                  }}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs min-h-[42px] cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  <span>Ajukan Izin Santri Baru</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onTabChange('RIWAYAT')}
                  className="w-full text-xs font-semibold text-zinc-700 border-zinc-200 min-h-[38px] cursor-pointer hover:bg-zinc-50"
                >
                  <History className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                  <span>Lihat Riwayat Izin Ananda</span>
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab: RIWAYAT (Riwayat Santri untuk Wali Santri) */}
      {activeTab === 'RIWAYAT' && (
        <HistoryView
          permissions={historyPermissions}
          title={`Riwayat Izin Ananda ${student ? student.fullName.split(' ')[0] : 'Santri'}`}
          description="Catatan seluruh permohonan izin dan kepulangan ananda di lingkungan pondok."
          activeRole="ORANG_TUA"
          emptyTitle="Belum Ada Riwayat Perizinan Ananda"
          emptySubtitle="Permohonan izin ananda yang telah selesai atau diputuskan akan tersimpan di sini."
          onRefresh={onRefresh}
          onPreviewSurat={onPreviewSurat}
        />
      )}
    </div>
  );
}
