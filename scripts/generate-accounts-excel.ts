import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import path from 'path';

const prisma = new PrismaClient();

// Helper styling constants
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF065F46' }, // Dark Emerald
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

const TITLE_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 16,
  bold: true,
  color: { argb: 'FF065F46' },
};

const SUBTITLE_FONT: Partial<ExcelJS.Font> = {
  name: 'Calibri',
  size: 11,
  italic: true,
  color: { argb: 'FF4B5563' },
};

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
};

const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF047857' } },
  left: { style: 'thin', color: { argb: 'FF047857' } },
  bottom: { style: 'medium', color: { argb: 'FF047857' } },
  right: { style: 'thin', color: { argb: 'FF047857' } },
};

const ZEBRA_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF9FAFB' }, // very light gray
};

function autoFitColumns(sheet: ExcelJS.Worksheet, minWidth = 12) {
  sheet.columns.forEach((col) => {
    let maxLen = 0;
    col.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber < 4) return; // skip main titles
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLen) maxLen = val.length;
    });
    col.width = Math.max(maxLen + 4, minWidth);
  });
}

async function main() {
  console.log('🔄 Fetching database records...');
  const users = await prisma.user.findMany({
    include: { classrooms: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });

  const students = await prisma.student.findMany({
    orderBy: [{ className: 'asc' }, { fullName: 'asc' }],
  });

  const classrooms = await prisma.classroom.findMany({
    orderBy: { name: 'asc' },
  });

  console.log(`Fetched ${users.length} users, ${students.length} students, ${classrooms.length} classrooms.`);

  // Group users
  const musyrifAccounts = users.filter((u) => u.role === 'USTADZ_UMUM' || u.role === 'KEPALA_ASRAMA');
  const satpamAccounts = users.filter((u) => u.role === 'SATPAM');
  const waliKelasAccounts = users.filter((u) => u.role === 'WALI_KELAS');
  const adminAccounts = users.filter((u) => u.role === 'SUPER_ADMIN');

  // Map classrooms for quick lookup
  const classMap = new Map<string, string>();
  for (const c of classrooms) {
    classMap.set(c.id, c.name);
  }

  // ==========================================
  // CREATE WORKBOOK
  // ==========================================
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistem Manajemen Perizinan SMAIT Ihsanul Fikri';
  workbook.lastModifiedBy = 'Admin Sistem';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ------------------------------------------
  // SHEET 1: RINGKASAN & PANDUAN LOGIN
  // ------------------------------------------
  const wsSummary = workbook.addWorksheet('Panduan & Ringkasan', {
    views: [{ showGridLines: true }],
  });

  wsSummary.getCell('A1').value = 'SISTEM INFORMASI PERIZINAN SANTRI (E-IZIN)';
  wsSummary.getCell('A1').font = TITLE_FONT;
  wsSummary.getCell('A2').value = 'SMAIT IHSANUL FIKRI MUNGKID MAGELANG - DAFTAR AKUN & AKSES RESMI';
  wsSummary.getCell('A2').font = SUBTITLE_FONT;

  wsSummary.getCell('A4').value = '1. Ringkasan Total Akun Terdaftar:';
  wsSummary.getCell('A4').font = { bold: true, size: 12, color: { argb: 'FF065F46' } };

  const summaryData = [
    ['Kategori Akun', 'Jumlah Akun', 'Metode Login', 'Keterangan Role'],
    ['Musyrif & Kepala Asrama', musyrifAccounts.length, 'Username + PIN', 'Verifikasi santri di asrama, check-in kepulangan & asrama'],
    ['Petugas Satpam Gerbang', satpamAccounts.length, 'Username + PIN', 'Scan barcode izin, verifikasi check-out & check-in gerbang'],
    ['Wali Santri (Orang Tua)', students.length, 'NIS Santri + Password', 'Mengajukan izin kepulangan/keluar, tracking status santri'],
    ['Wali Kelas', waliKelasAccounts.length, 'Username + PIN', 'Review & persetujuan izin (approval) santri kelas ampuan'],
    ['Super Admin Sistem', adminAccounts.length, 'Username + PIN', 'Manajemen master data, setting denda, & kontrol sistem'],
    ['TOTAL AKUN SISTEM', musyrifAccounts.length + satpamAccounts.length + students.length + waliKelasAccounts.length + adminAccounts.length, '-', 'Keseluruhan pengguna terdata'],
  ];

  summaryData.forEach((row, idx) => {
    const r = wsSummary.addRow(row);
    if (idx === 0) {
      r.eachCell((c) => {
        c.fill = HEADER_FILL;
        c.font = HEADER_FONT;
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = HEADER_BORDER;
      });
      r.height = 24;
    } else {
      const isTotal = idx === summaryData.length - 1;
      r.eachCell((c, colNum) => {
        c.font = { name: 'Calibri', size: 10, bold: isTotal };
        c.border = BORDER_THIN;
        if (colNum === 2) {
          c.alignment = { horizontal: 'center' };
        }
        if (isTotal) {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        }
      });
      r.height = 20;
    }
  });

  const rowOffset = 14;
  wsSummary.getCell(`A${rowOffset}`).value = '2. Petunjuk Cara Masuk (Login) Portal:';
  wsSummary.getCell(`A${rowOffset}`).font = { bold: true, size: 12, color: { argb: 'FF065F46' } };

  const loginInstructions = [
    ['Role Pengguna', 'Kolom Username di Web', 'Kolom Password di Web', 'Catatan Penting'],
    ['Musyrif Asrama', 'Username masing-masing (lihat Tab "Musyrif & Asrama")', 'PIN: ihsanulfikri123', 'Dapat memverifikasi kepulangan santri'],
    ['Satpam Gerbang', 'satpam', 'PIN: satpam', 'Ditempatkan di Pos Penjagaan Gerbang Utama'],
    ['Wali Santri', 'Nomor Induk Santri (NIS) atau Nama Santri', 'No. HP Wali / Bebas / NIS', 'Wali santri otomatis diarahkan ke portal izin santri bersangkutan'],
    ['Wali Kelas', 'Username masing-masing (lihat Tab "Wali Kelas")', 'PIN: ihsanulfikri123', 'Menerima dan menyetujui perizinan santri kelasnya'],
    ['Super Admin', 'anton', 'PIN: ihsanulfikri123', 'Akses penuh ke seluruh menu dan pengaturan'],
  ];

  loginInstructions.forEach((row, idx) => {
    const r = wsSummary.addRow(row);
    if (idx === 0) {
      r.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        c.font = HEADER_FONT;
        c.alignment = { vertical: 'middle', horizontal: 'center' };
        c.border = BORDER_THIN;
      });
      r.height = 24;
    } else {
      r.eachCell((c, colNum) => {
        c.font = { name: 'Calibri', size: 10 };
        c.border = BORDER_THIN;
      });
      r.height = 20;
    }
  });

  autoFitColumns(wsSummary, 18);

  // ------------------------------------------
  // SHEET 2: AKUN MUSYRIF & KEPALA ASRAMA
  // ------------------------------------------
  const wsMusyrif = workbook.addWorksheet('Musyrif & Asrama', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
  });

  wsMusyrif.getCell('A1').value = 'DAFTAR AKUN MUSYRIF & PIMPINAN ASRAMA';
  wsMusyrif.getCell('A1').font = TITLE_FONT;
  wsMusyrif.getCell('A2').value = 'SMAIT Ihsanul Fikri Mungkid - Hak Akses: Verifikasi & Kontrol Asrama';
  wsMusyrif.getCell('A2').font = SUBTITLE_FONT;

  const musyrifHeaders = [
    'No',
    'Jabatan / Peran',
    'Nama Lengkap Petugas',
    'Username Login',
    'PIN / Password',
    'No. WhatsApp / HP',
    'Status Akun',
    'Kewenangan Khusus',
  ];

  const headerRowMusyrif = wsMusyrif.addRow(musyrifHeaders);
  headerRowMusyrif.height = 26;
  headerRowMusyrif.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = HEADER_BORDER;
  });

  musyrifAccounts.forEach((u, i) => {
    const isKepala = u.role === 'KEPALA_ASRAMA';
    const row = wsMusyrif.addRow([
      i + 1,
      isKepala ? 'Kepala Asrama' : 'Musyrif / Ustadz Pembina Asrama',
      u.name,
      u.username,
      u.pin || 'ihsanulfikri123',
      u.phone || '-',
      'Aktif',
      isKepala
        ? 'Monitoring menyeluruh santri asrama & eskalasi perizinan khusus'
        : 'Verifikasi kepulangan santri ke asrama, check-in, tracking kamar',
    ]);

    row.height = 22;
    row.eachCell((c, colNum) => {
      c.border = BORDER_THIN;
      c.font = { name: 'Calibri', size: 10, bold: isKepala && (colNum === 2 || colNum === 3) };
      if (colNum === 1 || colNum === 4 || colNum === 5 || colNum === 7) {
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNum === 5) {
        c.font = { name: 'Consolas', size: 10, bold: true, color: { argb: 'FF065F46' } };
      }
      if (isKepala) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Light amber for Kepala Asrama
      } else if (i % 2 === 1) {
        c.fill = ZEBRA_FILL;
      }
    });
  });

  wsMusyrif.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4 + musyrifAccounts.length, column: musyrifHeaders.length },
  };
  autoFitColumns(wsMusyrif, 14);

  // ------------------------------------------
  // SHEET 3: AKUN SATPAM (POS GERBANG)
  // ------------------------------------------
  const wsSatpam = workbook.addWorksheet('Satpam Pos Gerbang', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
  });

  wsSatpam.getCell('A1').value = 'DAFTAR AKUN PETUGAS KEAMANAN (SATPAM)';
  wsSatpam.getCell('A1').font = TITLE_FONT;
  wsSatpam.getCell('A2').value = 'SMAIT Ihsanul Fikri Mungkid - Hak Akses: Verifikasi Check-out & Check-in Gerbang';
  wsSatpam.getCell('A2').font = SUBTITLE_FONT;

  const satpamHeaders = [
    'No',
    'Pos Penjagaan / Peran',
    'Nama Petugas Satpam',
    'Username Login',
    'PIN / Password',
    'No. WhatsApp / HP',
    'Status',
    'Kewenangan & Fungsi Operasional',
  ];

  const headerRowSatpam = wsSatpam.addRow(satpamHeaders);
  headerRowSatpam.height = 26;
  headerRowSatpam.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Navy
    c.font = HEADER_FONT;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = HEADER_BORDER;
  });

  satpamAccounts.forEach((u, i) => {
    const row = wsSatpam.addRow([
      i + 1,
      'Pos Gerbang Utama',
      u.name,
      u.username,
      u.pin || 'satpam',
      u.phone || '-',
      'Aktif',
      'Scan QR Code surat izin keluar santri, verifikasi kepulangan tepat waktu/terlambat di pos gerbang',
    ]);
    row.height = 24;
    row.eachCell((c, colNum) => {
      c.border = BORDER_THIN;
      c.font = { name: 'Calibri', size: 10 };
      if (colNum === 1 || colNum === 4 || colNum === 5 || colNum === 7) {
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNum === 5) {
        c.font = { name: 'Consolas', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
      }
    });
  });

  autoFitColumns(wsSatpam, 16);

  // ------------------------------------------
  // SHEET 4: AKUN WALI SANTRI (398 SANTRI)
  // ------------------------------------------
  const wsWaliSantri = workbook.addWorksheet('Wali Santri (398 Siswa)', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
  });

  wsWaliSantri.getCell('A1').value = 'DAFTAR AKUN WALI SANTRI (ORANG TUA)';
  wsWaliSantri.getCell('A1').font = TITLE_FONT;
  wsWaliSantri.getCell('A2').value = `Total Data: ${students.length} Santri Terdaftar di SMAIT Ihsanul Fikri Mungkid`;
  wsWaliSantri.getCell('A2').font = SUBTITLE_FONT;

  const waliSantriHeaders = [
    'No',
    'NIS (Username Login)',
    'Nama Lengkap Santri',
    'Kelas',
    'L/P',
    'Nama Wali Santri (Orang Tua)',
    'No. HP / WhatsApp Wali',
    'Password / PIN Login',
    'Kamar / Asrama',
    'Hak Akses Sistem',
  ];

  const headerRowWali = wsWaliSantri.addRow(waliSantriHeaders);
  headerRowWali.height = 26;
  headerRowWali.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = HEADER_BORDER;
  });

  students.forEach((s, idx) => {
    const row = wsWaliSantri.addRow([
      idx + 1,
      s.nis,
      s.fullName,
      s.className,
      s.gender,
      s.parentName,
      s.parentPhone || '-',
      s.parentPhone || s.nis, // default password
      s.dormitory && s.dormitory !== '-' ? s.dormitory : 'Asrama Pusat',
      'Pengajuan izin (Keluar/Pesiar/Pulang), pantau status, riwayat izin',
    ]);
    row.height = 20;
    row.eachCell((c, colNum) => {
      c.border = BORDER_THIN;
      c.font = { name: 'Calibri', size: 10 };
      if (colNum === 1 || colNum === 2 || colNum === 4 || colNum === 5) {
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNum === 2) {
        c.font = { name: 'Consolas', size: 10, bold: true };
      }
      if (idx % 2 === 1) {
        c.fill = ZEBRA_FILL;
      }
    });
  });

  wsWaliSantri.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4 + students.length, column: waliSantriHeaders.length },
  };
  autoFitColumns(wsWaliSantri, 14);

  // ------------------------------------------
  // SHEET 5: AKUN WALI KELAS (29 KELAS)
  // ------------------------------------------
  const wsWaliKelas = workbook.addWorksheet('Wali Kelas (29 Guru)', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
  });

  wsWaliKelas.getCell('A1').value = 'DAFTAR AKUN WALI KELAS';
  wsWaliKelas.getCell('A1').font = TITLE_FONT;
  wsWaliKelas.getCell('A2').value = 'SMAIT Ihsanul Fikri Mungkid - Hak Akses: Verifikasi & Persetujuan (Approval) Izin Kelas';
  wsWaliKelas.getCell('A2').font = SUBTITLE_FONT;

  const waliKelasHeaders = [
    'No',
    'Kelas Ampuan',
    'Nama Lengkap Wali Kelas',
    'Username Login',
    'PIN / Password',
    'No. WhatsApp / HP',
    'Status',
    'Kewenangan Khusus',
  ];

  const headerRowWaliKelas = wsWaliKelas.addRow(waliKelasHeaders);
  headerRowWaliKelas.height = 26;
  headerRowWaliKelas.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = HEADER_BORDER;
  });

  waliKelasAccounts.forEach((u, i) => {
    // Get class name
    const assignedClass = u.classrooms && u.classrooms.length > 0 ? u.classrooms.map((c) => c.name).join(', ') : u.classroomId ? classMap.get(u.classroomId) || '-' : '-';

    const row = wsWaliKelas.addRow([
      i + 1,
      assignedClass,
      u.name,
      u.username,
      u.pin || 'ihsanulfikri123',
      u.phone || '-',
      'Aktif',
      `Menyetujui (Approve) atau Menolak (Reject) izin santri kelas ${assignedClass}`,
    ]);
    row.height = 22;
    row.eachCell((c, colNum) => {
      c.border = BORDER_THIN;
      c.font = { name: 'Calibri', size: 10 };
      if (colNum === 1 || colNum === 2 || colNum === 4 || colNum === 5 || colNum === 7) {
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNum === 5) {
        c.font = { name: 'Consolas', size: 10, bold: true, color: { argb: 'FF065F46' } };
      }
      if (i % 2 === 1) {
        c.fill = ZEBRA_FILL;
      }
    });
  });

  wsWaliKelas.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4 + waliKelasAccounts.length, column: waliKelasHeaders.length },
  };
  autoFitColumns(wsWaliKelas, 15);

  // ------------------------------------------
  // SHEET 6: AKUN SUPER ADMIN
  // ------------------------------------------
  const wsAdmin = workbook.addWorksheet('Super Admin', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
  });

  wsAdmin.getCell('A1').value = 'DAFTAR AKUN SUPER ADMINISTRATOR';
  wsAdmin.getCell('A1').font = TITLE_FONT;
  wsAdmin.getCell('A2').value = 'SMAIT Ihsanul Fikri Mungkid - Hak Akses Penuh Sistem (Full Access)';
  wsAdmin.getCell('A2').font = SUBTITLE_FONT;

  const adminHeaders = [
    'No',
    'Jabatan / Peran',
    'Nama Administrator',
    'Username Login',
    'PIN / Password',
    'No. WhatsApp / HP',
    'Status',
    'Kewenangan Sistem',
  ];

  const headerRowAdmin = wsAdmin.addRow(adminHeaders);
  headerRowAdmin.height = 26;
  headerRowAdmin.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Dark Red
    c.font = HEADER_FONT;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = HEADER_BORDER;
  });

  adminAccounts.forEach((u, i) => {
    const row = wsAdmin.addRow([
      i + 1,
      'Super Administrator',
      u.name,
      u.username,
      u.pin || 'ihsanulfikri123',
      u.phone || '-',
      'Aktif (Penuh)',
      'Manajemen database, kelola akun, atur tarif denda keterlambatan, ekspor data, override izin',
    ]);
    row.height = 24;
    row.eachCell((c, colNum) => {
      c.border = BORDER_THIN;
      c.font = { name: 'Calibri', size: 10 };
      if (colNum === 1 || colNum === 4 || colNum === 5 || colNum === 7) {
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNum === 5) {
        c.font = { name: 'Consolas', size: 11, bold: true, color: { argb: 'FF991B1B' } };
      }
    });
  });

  autoFitColumns(wsAdmin, 16);

  // ==========================================
  // SAVE MAIN WORKBOOK
  // ==========================================
  const mainFilename = 'Daftar_Akun_Lengkap_SMAIT_Ihsanul_Fikri.xlsx';
  const mainFilePath = path.join(process.cwd(), mainFilename);
  await workbook.xlsx.writeFile(mainFilePath);
  console.log(`✅ File Excel utama berhasil dibuat: ${mainFilePath}`);

  // ==========================================
  // ALSO CREATE DEDICATED FILE: Musyrif & Petugas
  // ==========================================
  const musyrifWorkbook = new ExcelJS.Workbook();
  musyrifWorkbook.creator = 'Sistem Manajemen Perizinan SMAIT Ihsanul Fikri';
  const wsMusyrifSolo = musyrifWorkbook.addWorksheet('Akun Musyrif & Asrama');
  // Copy data
  wsMusyrifSolo.getCell('A1').value = 'DAFTAR AKUN MUSYRIF & PIMPINAN ASRAMA';
  wsMusyrifSolo.getCell('A1').font = TITLE_FONT;
  wsMusyrifSolo.getCell('A2').value = 'SMAIT Ihsanul Fikri Mungkid Magelang';
  wsMusyrifSolo.getCell('A2').font = SUBTITLE_FONT;

  const hRow = wsMusyrifSolo.addRow(musyrifHeaders);
  hRow.height = 26;
  hRow.eachCell((c) => {
    c.fill = HEADER_FILL;
    c.font = HEADER_FONT;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = HEADER_BORDER;
  });

  musyrifAccounts.forEach((u, i) => {
    const isKepala = u.role === 'KEPALA_ASRAMA';
    const row = wsMusyrifSolo.addRow([
      i + 1,
      isKepala ? 'Kepala Asrama' : 'Musyrif / Ustadz Pembina Asrama',
      u.name,
      u.username,
      u.pin || 'ihsanulfikri123',
      u.phone || '-',
      'Aktif',
      isKepala
        ? 'Monitoring menyeluruh santri asrama & eskalasi perizinan khusus'
        : 'Verifikasi kepulangan santri ke asrama, check-in, tracking kamar',
    ]);
    row.height = 22;
    row.eachCell((c, colNum) => {
      c.border = BORDER_THIN;
      c.font = { name: 'Calibri', size: 10, bold: isKepala && (colNum === 2 || colNum === 3) };
      if (colNum === 1 || colNum === 4 || colNum === 5 || colNum === 7) {
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      if (colNum === 5) {
        c.font = { name: 'Consolas', size: 10, bold: true, color: { argb: 'FF065F46' } };
      }
      if (isKepala) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      } else if (i % 2 === 1) {
        c.fill = ZEBRA_FILL;
      }
    });
  });
  autoFitColumns(wsMusyrifSolo, 14);

  const musyrifFilename = 'Daftar_Akun_Musyrif_Asrama.xlsx';
  const musyrifFilePath = path.join(process.cwd(), musyrifFilename);
  await musyrifWorkbook.xlsx.writeFile(musyrifFilePath);
  console.log(`✅ File Excel khusus Musyrif berhasil dibuat: ${musyrifFilePath}`);
}

main()
  .catch((e) => {
    console.error('❌ Gagal membuat Excel:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
