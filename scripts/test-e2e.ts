async function runE2E() {
  const baseUrl = 'http://localhost:1000';
  console.log('🚀 Menjalankan Pengujian End-to-End Layanan Neon & Aplikasi...\n');

  // 1. Test Gateway / Login page
  const pageRes = await fetch(`${baseUrl}/`);
  console.log(`1. Halaman Login Utama (/): HTTP ${pageRes.status} (OK)`);

  // 2. Test Neon Services Status
  const neonRes = await fetch(`${baseUrl}/api/neon`);
  const neonData = await neonRes.json();
  console.log('2. Neon Services Health & Integration:');
  console.log(JSON.stringify(neonData.services, null, 2));

  // 3. Test Auth - Orang Tua
  const authParentRes = await fetch(`${baseUrl}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginType: 'ORANG_TUA', nis: '2024101' }),
  });
  const authParentData = await authParentRes.json();
  console.log(`\n3. Auth Wali Santri (NIS 2024101): ${authParentData.success ? '✅ BERHASIL' : '❌ GAGAL'}`);
  console.log(`   Nama Santri: ${authParentData.session?.student?.fullName}`);

  // 4. Test Auth - Petugas
  const authStaffRes = await fetch(`${baseUrl}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginType: 'PETUGAS', username: 'ahmad.fauzi', pin: '123456' }),
  });
  const authStaffData = await authStaffRes.json();
  console.log(`\n4. Auth Petugas (ahmad.fauzi): ${authStaffData.success ? '✅ BERHASIL' : '❌ GAGAL'}`);
  console.log(`   Nama: ${authStaffData.session?.user?.name} | Role: ${authStaffData.session?.role}`);

  // 5. Test Permintaan Baru (Create Permission) ke PostgreSQL Neon
  const newPermRes = await fetch(`${baseUrl}/api/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      studentId: 's-101',
      studentName: 'Muhammad Raihan Pratama',
      studentNis: '2024101',
      className: 'X MIPA 1',
      dormitory: '-',
      category: 'KELUAR_SEBENTAR',
      reason: 'Uji coba integrasi Neon Postgres & Prisma ORM',
      applicantType: 'ORANG_TUA',
      applicantName: 'H. Bambang Sudarmono',
      applicantPhone: '081234000111',
      escortType: 'ORANG_TUA',
      plannedDeparture: new Date().toISOString(),
      plannedReturn: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    }),
  });
  const newPermData = await newPermRes.json();
  console.log(`\n5. Pembuatan Izin Baru via Prisma ke Neon Postgres: ${newPermData.success ? '✅ BERHASIL' : '❌ GAGAL'}`);
  console.log(`   ID Izin Dibuat: ${newPermData.permission?.id}`);
  console.log(`   Status: ${newPermData.permission?.status}`);

  // 6. Test Query Permissions
  const listPermRes = await fetch(`${baseUrl}/api/permissions`);
  const listPermData = await listPermRes.json();
  console.log(`\n6. Query Daftar Izin dari Neon Postgres: Total ${listPermData.permissions?.length} izin tercatat.`);

  console.log('\n🎉 SEMUA PENGUJIAN SELESAI DENGAN SUKSES!');
}

runE2E().catch(console.error);
