'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Permission, DigitalSignatureData } from '@/lib/types';
import {
  formatDateTimeWIB,
  formatDateOnlyWIB,
  formatNomorSurat,
  getPermissionCategoryLabel,
  getEscortTypeLabel,
} from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, ShieldCheck, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
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
  const [verifyUrl, setVerifyUrl] = useState<string>('');
  const [signatureData, setSignatureData] = useState<DigitalSignatureData | null>(null);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings?key=official_digital_signature')
        .then((res) => res.json())
        .then((data) => {
          if (data?.value?.imageData) {
            setSignatureData(data.value);
          } else {
            setSignatureData(null);
          }
        })
        .catch((err) => console.error('Gagal memuat ttd digital:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!permission) {
      setQrCodeUrl('');
      setVerifyUrl('');
      return;
    }

    const officialBaseUrl = 'https://www.perizinan-ihsanulfikri.web.id';
    const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, '');
    const origin = configuredBaseUrl || officialBaseUrl;
    const nextVerifyUrl = `${origin}/verifikasi/${permission.id}`;

    setVerifyUrl(nextVerifyUrl);

    let cancelled = false;
    QRCode.toDataURL(nextVerifyUrl, {
      margin: 1,
      width: 160,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setQrCodeUrl(url);
      })
      .catch((err) => console.error('Gagal generate QR Code:', err));

    return () => {
      cancelled = true;
    };
  }, [permission]);

  if (!permission) return null;

  const handlePrint = async () => {
    setIsPreparingPrint(true);

    const originalTitle = document.title;
    const cleanStudentName = (permission.studentName || 'Santri').replace(/[^a-zA-Z0-9]/g, '_');
    const cleanClass = (permission.className || '').replace(/[^a-zA-Z0-9]/g, '_');
    document.title = `Surat_Izin_${cleanStudentName}_${cleanClass}`;

    let restored = false;
    const restoreState = () => {
      if (restored) return;
      restored = true;
      document.title = originalTitle;
      setIsPreparingPrint(false);
    };

    window.addEventListener('afterprint', restoreState, { once: true });

    try {
      const printRoot = document.getElementById('surat-izin-print-root');
      if (printRoot) {
        const imgs = Array.from(printRoot.querySelectorAll('img'));
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((resolve) => {
                if (img.complete) {
                  if (typeof img.decode === 'function') {
                    img.decode().then(resolve).catch(resolve);
                  } else {
                    resolve();
                  }
                  return;
                }
                const timer = setTimeout(resolve, 1000);
                img.addEventListener(
                  'load',
                  () => {
                    clearTimeout(timer);
                    resolve();
                  },
                  { once: true }
                );
                img.addEventListener(
                  'error',
                  () => {
                    clearTimeout(timer);
                    resolve();
                  },
                  { once: true }
                );
              })
          )
        );
      }

      requestAnimationFrame(() => {
        setIsPreparingPrint(false);
        window.print();
        setTimeout(restoreState, 2000);
      });
    } catch (e) {
      console.error('Error saat menyiapkan print:', e);
      restoreState();
      window.print();
    }
  };

  const nomorSurat = formatNomorSurat(permission.id, permission.createdAt);
  const categoryLabel = getPermissionCategoryLabel(permission.category);
  const escortLabel = getEscortTypeLabel(permission.escortType);

  const printButtonContent = isPreparingPrint ? (
    <>
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      <span>Menyiapkan PDF...</span>
    </>
  ) : (
    <>
      <Printer className="w-3.5 h-3.5" />
      <span>Cetak / Simpan PDF</span>
    </>
  );

  const renderSuratDocument = (isPrintMode: boolean) => (
    <div
      id={isPrintMode ? 'surat-izin-print-sheet' : 'surat-izin-printable'}
      className={
        isPrintMode
          ? 'bg-white mx-auto w-full p-0 font-sans text-zinc-900'
          : 'bg-white mx-auto max-w-[210mm] min-h-[280mm] p-4 sm:p-10 shadow-sm border border-zinc-200 rounded-md sm:rounded-lg font-sans text-zinc-900'
      }
    >
      {/* KOP SURAT RESMI SMAIT IHSANUL FIKRI */}
      <div className="border-b-4 border-double border-zinc-900 pb-3 mb-5 text-center">
        <div className={isPrintMode ? 'flex items-center justify-center gap-4 mb-2' : 'flex items-center justify-center gap-3 sm:gap-4 mb-2'}>
          <img
            src="/logo-smait.png"
            alt="Logo SMAIT Ihsanul Fikri"
            loading="eager"
            decoding="sync"
            className={isPrintMode ? 'h-16 w-auto object-contain shrink-0' : 'h-14 sm:h-16 w-auto object-contain shrink-0'}
          />
          <div>
            <h3 className={isPrintMode ? 'text-sm font-bold tracking-wider text-zinc-800 uppercase font-sans' : 'text-xs sm:text-sm font-bold tracking-wider text-zinc-800 uppercase font-sans'}>
              YAYASAN TARBIYATUL MUKMIN PABELAN
            </h3>
            <h1 className={isPrintMode ? 'text-xl font-black text-zinc-950 uppercase tracking-tight font-sans' : 'text-base sm:text-xl font-black text-zinc-950 uppercase tracking-tight font-sans'}>
              SMAIT IHSANUL FIKRI MUNGKID
            </h1>
            <p className={isPrintMode ? 'text-xs text-zinc-600 font-medium' : 'text-[11px] sm:text-xs text-zinc-600 font-medium'}>
              Islamic Boarding School &bull; Akreditasi A &bull; NSS: 302030811045 &bull; NPSN: 20338781
            </p>
          </div>
        </div>
        <p className={isPrintMode ? 'text-xs text-zinc-600' : 'text-[11px] sm:text-xs text-zinc-600'}>
          Alamat: Jl. Pabelan I, Desa Pabelan, Kec. Mungkid, Kab. Magelang, Jawa Tengah 56512 | Telp: (0293) 782444
        </p>
      </div>

      {/* JUDUL SURAT */}
      <div className="text-center mb-6">
        <h2 className={isPrintMode ? 'text-base font-black underline uppercase tracking-wide text-zinc-900' : 'text-sm sm:text-base font-black underline uppercase tracking-wide text-zinc-900'}>
          Surat Izin Keluar / Pulang Asrama
        </h2>
        <p className="text-xs text-zinc-600 mt-0.5">
          Nomor: <strong className="font-semibold text-zinc-800">{nomorSurat}</strong>
        </p>
      </div>

      {/* PENGANTAR */}
      <p className="text-xs text-zinc-800 leading-relaxed mb-4">
        Yang bertanda tangan di bawah ini menerangkan bahwa pihak pengasuhan / perizinan SMAIT Ihsanul Fikri Mungkid memberikan izin kepada santri:
      </p>

      {/* TABEL DATA SANTRI */}
      <div className="rounded-md border border-zinc-300 overflow-hidden mb-4 text-xs">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-zinc-200">
              <td className={isPrintMode ? 'w-1/3 py-2 px-3 font-semibold text-zinc-700 bg-zinc-50 border-r border-zinc-200' : 'w-2/5 sm:w-1/3 py-2 px-2.5 sm:px-3 font-semibold text-zinc-700 bg-zinc-50/80 border-r border-zinc-200'}>
                Nama Lengkap Santri
              </td>
              <td className={isPrintMode ? 'py-2 px-3 font-bold text-zinc-950 text-sm' : 'py-2 px-2.5 sm:px-3 font-bold text-zinc-950 text-xs sm:text-sm'}>
                {permission.studentName}
              </td>
            </tr>
            <tr className="border-b border-zinc-200">
              <td className={isPrintMode ? 'py-2 px-3 font-semibold text-zinc-700 bg-zinc-50 border-r border-zinc-200' : 'py-2 px-2.5 sm:px-3 font-semibold text-zinc-700 bg-zinc-50/80 border-r border-zinc-200'}>
                Nomor Induk Santri (NIS)
              </td>
              <td className={isPrintMode ? 'py-2 px-3 font-semibold text-zinc-900' : 'py-2 px-2.5 sm:px-3 font-semibold text-zinc-900'}>
                {permission.studentNis}
              </td>
            </tr>
            <tr className="border-b border-zinc-200">
              <td className={isPrintMode ? 'py-2 px-3 font-semibold text-zinc-700 bg-zinc-50 border-r border-zinc-200' : 'py-2 px-2.5 sm:px-3 font-semibold text-zinc-700 bg-zinc-50/80 border-r border-zinc-200'}>
                Kelas & Asrama
              </td>
              <td className={isPrintMode ? 'py-2 px-3 text-zinc-900 font-medium' : 'py-2 px-2.5 sm:px-3 text-zinc-900 font-medium'}>
                Kelas {permission.className} &bull; {permission.dormitory || 'Asrama SMAIT IF'}
              </td>
            </tr>
            <tr>
              <td className={isPrintMode ? 'py-2 px-3 font-semibold text-zinc-700 bg-zinc-50 border-r border-zinc-200' : 'py-2 px-2.5 sm:px-3 font-semibold text-zinc-700 bg-zinc-50/80 border-r border-zinc-200'}>
                Wali Santri & Kontak
              </td>
              <td className={isPrintMode ? 'py-2 px-3 text-zinc-900 font-medium' : 'py-2 px-2.5 sm:px-3 text-zinc-900 font-medium'}>
                {permission.applicantName} ({permission.applicantPhone || '-'})
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TABEL RINCIAN PERIZINAN */}
      <div className="rounded-md border border-zinc-300 overflow-hidden mb-5 text-xs">
        <table className="w-full border-collapse">
          <tbody>
            <tr className="border-b border-zinc-200">
              <td className={isPrintMode ? 'w-1/3 py-2 px-3 font-semibold text-zinc-700 bg-zinc-50 border-r border-zinc-200' : 'w-2/5 sm:w-1/3 py-2 px-2.5 sm:px-3 font-semibold text-zinc-700 bg-zinc-50/80 border-r border-zinc-200'}>
                Kategori Izin
              </td>
              <td className={isPrintMode ? 'py-2 px-3 font-bold text-emerald-900' : 'py-2 px-2.5 sm:px-3 font-bold text-emerald-900'}>
                {categoryLabel}
              </td>
            </tr>
            <tr className="border-b border-zinc-200">
              <td className={isPrintMode ? 'py-2 px-3 font-semibold text-zinc-700 bg-zinc-50 border-r border-zinc-200' : 'py-2 px-2.5 sm:px-3 font-semibold text-zinc-700 bg-zinc-50/80 border-r border-zinc-200'}>
                Alasan / Keperluan
              </td>
              <td className={isPrintMode ? 'py-2 px-3 text-zinc-900 font-medium leading-relaxed' : 'py-2 px-2.5 sm:px-3 text-zinc-900 font-medium leading-relaxed'}>
                {permission.reason}
              </td>
            </tr>
            <tr className="border-b border-zinc-200">
              <td className={isPrintMode ? 'py-2 px-3 font-semibold text-zinc-700 bg-zinc-50 border-r border-zinc-200' : 'py-2 px-2.5 sm:px-3 font-semibold text-zinc-700 bg-zinc-50/80 border-r border-zinc-200'}>
                Rencana Waktu Keluar
              </td>
              <td className={isPrintMode ? 'py-2 px-3 font-bold text-zinc-950' : 'py-2 px-2.5 sm:px-3 font-bold text-zinc-950'}>
                {formatDateTimeWIB(permission.plannedDeparture)} WIB
              </td>
            </tr>
            <tr className="border-b border-zinc-200">
              <td className={isPrintMode ? 'py-2 px-3 font-semibold text-zinc-700 bg-zinc-50 border-r border-zinc-200' : 'py-2 px-2.5 sm:px-3 font-semibold text-zinc-700 bg-zinc-50/80 border-r border-zinc-200'}>
                Rencana Waktu Kembali
              </td>
              <td className={isPrintMode ? 'py-2 px-3 font-bold text-zinc-950' : 'py-2 px-2.5 sm:px-3 font-bold text-zinc-950'}>
                {formatDateTimeWIB(permission.plannedReturn)} WIB
              </td>
            </tr>
            <tr className="border-b border-zinc-200">
              <td className={isPrintMode ? 'py-2 px-3 font-semibold text-zinc-700 bg-zinc-50 border-r border-zinc-200' : 'py-2 px-2.5 sm:px-3 font-semibold text-zinc-700 bg-zinc-50/80 border-r border-zinc-200'}>
                Pihak Penjemput
              </td>
              <td className={isPrintMode ? 'py-2 px-3 text-zinc-900' : 'py-2 px-2.5 sm:px-3 text-zinc-900'}>
                <strong>{escortLabel}</strong>
                {permission.escortNote && ` (${permission.escortNote})`}
              </td>
            </tr>
            <tr>
              <td className={isPrintMode ? 'py-2 px-3 font-semibold text-zinc-700 bg-zinc-50 border-r border-zinc-200' : 'py-2 px-2.5 sm:px-3 font-semibold text-zinc-700 bg-zinc-50/80 border-r border-zinc-200'}>
                Status Keberadaan
              </td>
              <td className={isPrintMode ? 'py-2 px-3 text-emerald-900 font-bold' : 'py-2 px-2.5 sm:px-3 text-emerald-900 font-bold'}>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>DISETUJUI &bull; DIANGGAP SUDAH KELUAR ASRAMA</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PERATURAN & ADAB */}
      <div className={isPrintMode ? 'rounded-md bg-zinc-50 p-3.5 border border-zinc-200 text-xs text-zinc-700 leading-relaxed mb-6' : 'rounded-md bg-zinc-50 p-3 sm:p-3.5 border border-zinc-200 text-xs text-zinc-700 leading-relaxed mb-6'}>
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
        <div className={isPrintMode ? 'flex flex-col items-start text-left' : 'flex flex-col items-center sm:items-start text-center sm:text-left'}>
          {qrCodeUrl ? (
            !isPrintMode && verifyUrl ? (
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka halaman verifikasi keaslian surat"
                className="inline-block rounded mb-1 transition-shadow hover:ring-2 hover:ring-emerald-600/30"
              >
                <img
                  src={qrCodeUrl}
                  alt="QR Code Verifikasi Perizinan"
                  loading="eager"
                  decoding="sync"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded border border-zinc-300 p-1 bg-white block"
                />
              </a>
            ) : (
              <img
                src={qrCodeUrl}
                alt="QR Code Verifikasi Perizinan"
                loading="eager"
                decoding="sync"
                className={isPrintMode ? 'w-24 h-24 rounded border border-zinc-300 p-1 mb-1 bg-white' : 'w-20 h-20 sm:w-24 sm:h-24 rounded border border-zinc-300 p-1 mb-1 bg-white'}
              />
            )
          ) : (
            <div
              aria-label="Memuat QR Code"
              className={isPrintMode ? 'w-24 h-24 bg-zinc-100 rounded border border-zinc-300 mb-1 flex items-center justify-center text-[11px] text-zinc-400' : 'w-20 h-20 sm:w-24 sm:h-24 bg-zinc-100 rounded border border-zinc-300 mb-1 flex items-center justify-center animate-pulse text-[11px] text-zinc-400'}
            >
              Memuat...
            </div>
          )}
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>DOKUMEN RESMI TERVERIFIKASI</span>
          </div>
          <p className="text-[11px] text-zinc-500">
            Scan untuk validasi keaslian surat
          </p>
        </div>

        {/* Sisi Kanan: Penanggung Jawab / Wali Kelas */}
        <div className="text-right text-xs">
          <p className="text-zinc-600 mb-1">
            Magelang, {formatDateOnlyWIB(permission.approvedAt || permission.createdAt)}
          </p>
          <p className="font-semibold text-zinc-700 mb-1">
            Mengetahui & Menyetujui,
          </p>

          {/* Tanda Tangan Digital Otomatis Ustadz Anton */}
          {signatureData?.imageData ? (
            <div className="h-16 flex items-center justify-end my-1">
              <img
                src={signatureData.imageData}
                alt={`Tanda Tangan ${signatureData.signerName || 'Ustadz Anton'}`}
                loading="eager"
                decoding="sync"
                className="h-16 max-w-[150px] object-contain"
              />
            </div>
          ) : (
            <div className="h-14" />
          )}

          <p className={isPrintMode ? 'font-bold text-zinc-950 underline text-sm' : 'font-bold text-zinc-950 underline text-xs sm:text-sm'}>
            {signatureData?.signerName || permission.approvedByName || 'Anton, M.Hum., Gr.'}
          </p>
          <p className="text-[11px] text-zinc-600 font-medium">
            {signatureData?.signerTitle || 'Penanggung Jawab Perizinan SMAIT Ihsanul Fikri'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-zinc-100">
          <DialogHeader className="px-4 py-3.5 sm:pl-6 sm:pr-14 sm:py-4 bg-white border-b border-zinc-200 flex flex-row items-center justify-between space-y-0 pr-12 print:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100/80 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold text-zinc-900 truncate">
                  Pratinjau Surat Izin Santri
                </DialogTitle>
                <p className="text-xs text-zinc-500 truncate">
                  Surat izin resmi &bull; Siap cetak &amp; PDF
                </p>
              </div>
            </div>
            {/* Desktop Print CTA (Mobile menggunakan Sticky Bottom Bar) */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={handlePrint}
                disabled={isPreparingPrint}
                size="sm"
                className="h-9 px-4 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-75"
              >
                {printButtonContent}
              </Button>
            </div>
          </DialogHeader>

          {/* Scrollable Printable Document Container */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-6">
            {renderSuratDocument(false)}
          </div>

          {/* Mobile Sticky Bottom Action Bar (Ergonomis untuk Jempol, min 44px tap target) */}
          <div className="sm:hidden border-t border-zinc-200 bg-white p-3 z-10 print:hidden shrink-0">
            <Button
              type="button"
              onClick={handlePrint}
              disabled={isPreparingPrint}
              className="w-full h-11 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-75"
            >
              {printButtonContent}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Portal cetak khusus di root document.body: tersembunyi di layar, tampil penuh saat Ctrl+P / Save PDF */}
      {isMounted &&
        isOpen &&
        createPortal(
          <div id="surat-izin-print-root" aria-hidden="true">
            <style
              id="surat-izin-print-styles"
              dangerouslySetInnerHTML={{
                __html: `
                  #surat-izin-print-root {
                    display: none;
                  }
                  @media print {
                    @page {
                      size: A4 portrait;
                      margin: 10mm 12mm;
                    }
                    html,
                    body,
                    body[data-scroll-locked] {
                      margin: 0 !important;
                      padding: 0 !important;
                      background: #ffffff !important;
                      color: #09090b !important;
                      overflow: visible !important;
                      height: auto !important;
                      min-height: 0 !important;
                      width: 100% !important;
                      position: static !important;
                      pointer-events: auto !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    body > *:not(#surat-izin-print-root) {
                      display: none !important;
                    }
                    #surat-izin-print-root {
                      display: block !important;
                      visibility: visible !important;
                      position: static !important;
                      width: 100% !important;
                      margin: 0 !important;
                      padding: 0 !important;
                      background: #ffffff !important;
                    }
                    #surat-izin-print-root * {
                      visibility: visible !important;
                    }
                  }
                `,
              }}
            />
            {renderSuratDocument(true)}
          </div>,
          document.body
        )}
    </>
  );
}
