'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Permission } from '@/lib/types';
import { formatDateTime, formatDateOnly } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X, ShieldCheck, CheckCircle2, FileText, Share2 } from 'lucide-react';
import QRCode from 'qrcode';

interface SuratIzinPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission: Permission | null;
}

export function SuratIzinPreviewModal({
  isOpen,
  onClose,
  permission,
}: SuratIzinPreviewModalProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (permission) {
      const qrData = JSON.stringify({
        doc: 'SURAT_IZIN_SMAIT_IF',
        id: permission.id,
        nis: permission.studentNis,
        nama: permission.studentName,
        kelas: permission.className,
        status: permission.status,
        disetujui: permission.approvedByName || 'Pihak Sekolah',
        waktu: permission.approvedAt || permission.createdAt,
      });

      QRCode.toDataURL(qrData, {
        margin: 1,
        width: 130,
        color: {
          dark: '#1e293b',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('Gagal generate QR Code:', err));
    }
  }, [permission]);

  if (!permission) return null;

  const handlePrint = () => {
    window.print();
  };

  const createdYear = new Date(permission.createdAt).getFullYear();
  const createdMonth = String(new Date(permission.createdAt).getMonth() + 1).padStart(2, '0');
  const shortId = permission.id.slice(-6).toUpperCase();
  const nomorSurat = `SI-IF/${createdYear}/${createdMonth}/${shortId}`;

  const categoryLabel =
    permission.category === 'KELUAR_SEBENTAR'
      ? 'Izin Keluar Sebentar (Tidak Menginap)'
      : permission.category === 'PESIAR'
      ? 'Izin Pesiar Terjadwal'
      : 'Izin Pulang Menginap ke Rumah';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-zinc-100">
        <DialogHeader className="p-4 bg-white border-b border-zinc-200 flex flex-row items-center justify-between space-y-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-zinc-900">
                Pratinjau Surat Izin Santri
              </DialogTitle>
              <p className="text-[11px] text-zinc-500">
                Surat izin resmi pasca disetujui &bull; Siap diekspor ke PDF
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handlePrint}
              size="sm"
              className="h-9 px-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export PDF / Cetak</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onClose}
              className="h-9 w-9 rounded-xl border-zinc-200 text-zinc-500 hover:text-zinc-900"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
          <div
            id="surat-izin-printable"
            ref={printRef}
            className="bg-white mx-auto max-w-[210mm] min-h-[280mm] p-6 sm:p-10 shadow-sm border border-zinc-200 print:border-none print:shadow-none print:m-0 print:w-full print:p-8 font-sans text-zinc-900"
          >
            {/* KOP SURAT RESMI SMAIT IHSANUL FIKRI */}
            <div className="border-b-4 border-double border-zinc-900 pb-3 mb-5 text-center">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className="h-14 w-14 rounded-full bg-emerald-900 text-white flex items-center justify-center font-serif font-black text-xl border-2 border-emerald-600 print:border-zinc-900">
                  IF
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wider text-zinc-700 uppercase">
                    Yayasan Ihsanul Fikri Magelang
                  </h3>
                  <h1 className="text-base sm:text-xl font-black text-zinc-950 uppercase tracking-tight font-serif">
                    SMAIT Ihsanul Fikri Pabelan
                  </h1>
                  <p className="text-[10px] text-zinc-600">
                    Islamic Boarding School &bull; Akreditasi A &bull; NSS: 302030811045 &bull; NPSN: 20338781
                  </p>
                </div>
              </div>
              <p className="text-[9px] text-zinc-500 italic">
                Alamat: Jl. Pabelan I, Desa Pabelan, Kec. Mungkid, Kab. Magelang, Jawa Tengah 56512 | Telp: (0293) 782444
              </p>
            </div>

            {/* JUDUL SURAT */}
            <div className="text-center mb-6">
              <h2 className="text-sm sm:text-base font-black underline uppercase tracking-wide text-zinc-900">
                Surat Izin Keluar / Pulang Asrama
              </h2>
              <p className="text-xs font-mono text-zinc-600 mt-0.5">
                Nomor: <strong>{nomorSurat}</strong>
              </p>
            </div>

            {/* PENGANTAR */}
            <p className="text-xs text-zinc-800 leading-relaxed mb-4">
              Yang bertanda tangan di bawah ini menerangkan bahwa pihak pengasuhan / perizinan SMAIT Ihsanul Fikri Pabelan memberikan izin kepada santri:
            </p>

            {/* TABEL DATA SANTRI */}
            <div className="rounded-lg border border-zinc-300 overflow-hidden mb-4 text-xs">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-zinc-200">
                    <td className="w-1/3 py-2 px-3 font-semibold text-zinc-600 bg-zinc-50/70 border-r border-zinc-200">
                      Nama Lengkap Santri
                    </td>
                    <td className="py-2 px-3 font-bold text-zinc-950 text-sm">
                      {permission.studentName}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="py-2 px-3 font-semibold text-zinc-600 bg-zinc-50/70 border-r border-zinc-200">
                      Nomor Induk Santri (NIS)
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-zinc-900">
                      {permission.studentNis}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="py-2 px-3 font-semibold text-zinc-600 bg-zinc-50/70 border-r border-zinc-200">
                      Kelas & Asrama
                    </td>
                    <td className="py-2 px-3 text-zinc-900 font-medium">
                      Kelas {permission.className} &bull; {permission.dormitory || 'Asrama SMAIT IF'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-zinc-600 bg-zinc-50/70 border-r border-zinc-200">
                      Wali Santri & Kontak
                    </td>
                    <td className="py-2 px-3 text-zinc-900 font-medium">
                      {permission.applicantName} ({permission.applicantPhone || '-'})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TABEL RINCIAN PERIZINAN */}
            <div className="rounded-lg border border-zinc-300 overflow-hidden mb-5 text-xs">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-zinc-200">
                    <td className="w-1/3 py-2 px-3 font-semibold text-zinc-600 bg-zinc-50/70 border-r border-zinc-200">
                      Kategori Izin
                    </td>
                    <td className="py-2 px-3 font-bold text-emerald-900">
                      {categoryLabel}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="py-2 px-3 font-semibold text-zinc-600 bg-zinc-50/70 border-r border-zinc-200">
                      Alasan / Keperluan
                    </td>
                    <td className="py-2 px-3 text-zinc-900 font-medium leading-relaxed">
                      {permission.reason}
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="py-2 px-3 font-semibold text-zinc-600 bg-zinc-50/70 border-r border-zinc-200">
                      Rencana Waktu Keluar
                    </td>
                    <td className="py-2 px-3 font-bold text-zinc-950">
                      {formatDateTime(permission.plannedDeparture)} WIB
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="py-2 px-3 font-semibold text-zinc-600 bg-zinc-50/70 border-r border-zinc-200">
                      Rencana Waktu Kembali
                    </td>
                    <td className="py-2 px-3 font-bold text-zinc-950">
                      {formatDateTime(permission.plannedReturn)} WIB
                    </td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="py-2 px-3 font-semibold text-zinc-600 bg-zinc-50/70 border-r border-zinc-200">
                      Pihak Penjemput
                    </td>
                    <td className="py-2 px-3 text-zinc-900">
                      <strong>{permission.escortType}</strong>
                      {permission.escortNote && ` — ${permission.escortNote}`}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-zinc-600 bg-zinc-50/70 border-r border-zinc-200">
                      Status Keberadaan
                    </td>
                    <td className="py-2 px-3 text-emerald-900 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>DISETUJUI &bull; DIANGGAP SUDAH KELUAR ASRAMA</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* PERATURAN & ADAB */}
            <div className="rounded-lg bg-zinc-50 p-3 border border-zinc-200 text-[10.5px] text-zinc-700 leading-relaxed mb-6">
              <strong className="text-zinc-900 block mb-1">Ketentuan Santri Selama Berizin:</strong>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Santri wajib senantiasa menjaga adab islami, busana syar&apos;i, dan nama baik almamater.</li>
                <li>Wajib menjaga shalat 5 waktu berjamaah di masjid/mushalla.</li>
                <li>Wajib kembali ke asrama tepat waktu sesuai rencana kepulangan yang tertera pada surat ini.</li>
                <li>Surat izin ini sah dikeluarkan secara resmi oleh sistem E-Izin SMAIT Ihsanul Fikri.</li>
              </ol>
            </div>

            {/* PENGESAHAN & TANDA TANGAN ELEKTRONIK */}
            <div className="grid grid-cols-2 gap-4 items-end pt-2">
              {/* Sisi Kiri: QR Code & Validasi Sistem */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code Verifikasi Perizinan"
                    className="w-24 h-24 rounded border border-zinc-300 p-1 mb-1 bg-white"
                  />
                ) : (
                  <div className="w-24 h-24 bg-zinc-100 rounded border border-zinc-300 mb-1" />
                )}
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-700" />
                  <span>DOKUMEN RESMI TERVERIFIKASI</span>
                </div>
                <p className="text-[9px] text-zinc-500 font-mono">
                  Scan untuk validasi keaslian surat
                </p>
              </div>

              {/* Sisi Kanan: Penanggung Jawab / Wali Kelas */}
              <div className="text-right text-xs">
                <p className="text-zinc-600 mb-1">
                  Magelang, {formatDateOnly(permission.approvedAt || permission.createdAt)}
                </p>
                <p className="font-semibold text-zinc-700 mb-12">
                  Mengetahui & Menyetujui,
                </p>
                <p className="font-bold text-zinc-950 underline text-sm">
                  {permission.approvedByName || 'Wali Kelas / Pengasuhan'}
                </p>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Pengasuhan Santri SMAIT Ihsanul Fikri
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Print Media Query */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #surat-izin-printable,
            #surat-izin-printable * {
              visibility: visible;
            }
            #surat-izin-printable {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 10mm 15mm !important;
              border: none !important;
              box-shadow: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
