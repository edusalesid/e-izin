'use client';

import React, { useState } from 'react';
import { Student } from '@/lib/types';
import Papa from 'papaparse';
import { UploadCloud, FileDown, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface MasterDataViewProps {
  students: Student[];
  onStudentsUpdated: () => void;
  isUploadModalOpen?: boolean;
  setIsUploadModalOpen?: (open: boolean) => void;
}

export function MasterDataView({
  students,
  onStudentsUpdated,
  isUploadModalOpen: externalIsOpen,
  setIsUploadModalOpen: externalSetIsOpen,
}: MasterDataViewProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isModalOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsModalOpen = externalSetIsOpen !== undefined ? externalSetIsOpen : setInternalIsOpen;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [query, setQuery] = useState('');

  const handleDownloadTemplate = () => {
    const csvContent =
      'nis,full_name,gender,class_name,dormitory,parent_name,parent_phone\n' +
      '2024103,Ahmad Zaki Fauzan,L,X MIPA 1,Asrama Al-Fatih Lt. 2 (Kamar 205),Bpk. Hendra Fauzan,081299887766\n' +
      '2024104,Fathir Ramadhan,L,XI MIPA 1,Asrama Shalahuddin Lt. 1 (Kamar 101),Ibu Nurul Hidayah,081377889900\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_santri_smait_if.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedData = results.data as any[];
          const formattedStudents: Student[] = parsedData.map((row, idx) => ({
            id: `s-imp-${Date.now()}-${idx}`,
            nis: String(row.nis || row.NIS || '').trim(),
            fullName: String(row.full_name || row.nama || row.Nama || '').trim(),
            gender: (row.gender || row.Gender || 'L').toUpperCase() as 'L' | 'P',
            className: String(row.class_name || row.kelas || row.Kelas || 'X MIPA 1').trim(),
            classroomId: 'c-x-ipa-1',
            dormitory: String(row.dormitory || row.asrama || row.Asrama || 'Asrama Al-Fatih').trim(),
            parentName: String(row.parent_name || row.wali || row.nama_ortu || 'Wali Santri').trim(),
            parentPhone: String(row.parent_phone || row.hp_ortu || row.no_hp || '081234567890').trim(),
          })).filter((s) => s.nis && s.fullName);

          if (formattedStudents.length === 0) {
            throw new Error('Tidak ada data santri yang valid di file CSV.');
          }

          const res = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students: formattedStudents }),
          });

          if (!res.ok) {
            throw new Error('Gagal mengimpor ke database server.');
          }

          setUploadStatus({
            success: true,
            message: `Berhasil mengimpor ${formattedStudents.length} data santri!`,
          });
          toast.success('Impor Data Santri Berhasil', {
            description: `Berhasil menambahkan ${formattedStudents.length} santri ke master data.`,
          });
          onStudentsUpdated();
        } catch (err: any) {
          const msg = err.message || 'Gagal memproses file CSV.';
          setUploadStatus({
            success: false,
            message: msg,
          });
          toast.error('Gagal Mengimpor Data Santri', {
            description: msg,
          });
        } finally {
          setIsUploading(false);
          e.target.value = '';
        }
      },
      error: (err) => {
        setUploadStatus({ success: false, message: err.message });
        toast.error('Gagal Membaca File CSV', { description: err.message });
        setIsUploading(false);
      },
    });
  };

  const filtered = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(query.toLowerCase()) ||
      s.nis.includes(query) ||
      s.className.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-3.5 pb-8">
      <div className="flex items-center justify-between px-0.5">
        <div>
          <h2 className="text-sm font-bold text-zinc-900">Kelola Data Master Santri</h2>
          <p className="text-xs text-zinc-600">Impor dan perbarui data santri, kelas, dan orang tua</p>
        </div>
        <Button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload CSV</span>
        </Button>
      </div>

      {/* Modal Popup Upload CSV */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md p-5 sm:p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-zinc-900">
              <UploadCloud className="w-5 h-5 text-emerald-700" />
              Unggah File CSV Data Santri
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Perbarui atau tambahkan data santri secara massal melalui berkas CSV.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 pt-2">
            {/* Box Unggah File */}
            <div className="border-dashed border-2 border-emerald-300 bg-emerald-50/50 rounded-2xl p-5 text-center">
              <UploadCloud className="w-9 h-9 text-emerald-700 mx-auto mb-2" />
              <p className="text-xs font-bold text-zinc-800">
                Pilih Berkas CSV Santri
              </p>
              <p className="text-[11px] text-zinc-500 max-w-xs mx-auto mt-0.5">
                Format kolom: nis, full_name, gender, class_name, dormitory, parent_name, parent_phone
              </p>

              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 text-xs font-bold shadow-xs active:scale-95 transition min-h-[40px]">
                  <span>{isUploading ? 'Memproses...' : 'Pilih File CSV'}</span>
                  <input
                    type="file"
                    accept=".csv"
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="min-h-[40px] text-xs font-semibold rounded-xl border-zinc-300"
                >
                  <FileDown className="w-3.5 h-3.5 mr-1 text-zinc-600" />
                  Template CSV
                </Button>
              </div>

              {uploadStatus && (
                <div
                  role="status"
                  className={`mt-3 rounded-xl p-2.5 flex items-center justify-center gap-2 text-xs font-semibold ${
                    uploadStatus.success ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-rose-100 text-rose-900 border border-rose-200'
                  }`}
                >
                  {uploadStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  )}
                  <span>{uploadStatus.message}</span>
                </div>
              )}
            </div>

            {/* Petunjuk format */}
            <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200 text-[11px] text-zinc-600 space-y-1">
              <p className="font-bold text-zinc-800">Petunjuk Pengisian CSV:</p>
              <ul className="list-disc list-inside space-y-0.5 text-zinc-500">
                <li>Gunakan header kolom persis sesuai template CSV.</li>
                <li>Kolom <strong>nis</strong> dan <strong>full_name</strong> wajib terisi.</li>
                <li>Kolom <strong>gender</strong> diisi <strong>L</strong> atau <strong>P</strong>.</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-bold text-zinc-800">
            Daftar Santri Terdaftar ({students.length})
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari santri..."
            className="pl-10"
          />
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filtered.map((s) => (
            <Card
              key={s.id}
              className="p-3 border-zinc-200/90 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-zinc-900">{s.fullName}</p>
                <p className="text-[11px] text-zinc-500">
                  NIS: {s.nis} &bull; {s.className} &bull; Wali: {s.parentName} ({s.parentPhone})
                </p>
              </div>
              <Badge variant="approved" className="text-[10px]">
                {s.dormitory.split('(')[0]}
              </Badge>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
