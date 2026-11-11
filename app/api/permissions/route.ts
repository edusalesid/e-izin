import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateLateMinutes, calculateLateFine, DEFAULT_FINE_SETTINGS } from '@/lib/utils';
import { sendTargetedPush } from '@/lib/server/push';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const studentId = searchParams.get('studentId');
    const studentNis = searchParams.get('studentNis');
    const classroomName = searchParams.get('className');

    if (id) {
      const permission = await prisma.permission.findUnique({
        where: { id },
        include: {
          logs: {
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      if (!permission) {
        return NextResponse.json({ error: 'Izin tidak ditemukan.' }, { status: 404 });
      }

      return NextResponse.json({
        permission: {
          ...permission,
          createdAt: permission.createdAt.toISOString(),
          updatedAt: permission.updatedAt.toISOString(),
        },
        logs: permission.logs.map((l) => ({
          ...l,
          timestamp: l.timestamp.toISOString(),
        })),
      });
    }

    const where: any = {};
    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      where.status = { in: statuses };
    }
    if (studentId) {
      where.studentId = studentId;
    }
    if (studentNis) {
      where.studentNis = studentNis.trim();
    }
    if (classroomName) {
      where.className = { equals: classroomName, mode: 'insensitive' };
    }

    const list = await prisma.permission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    const permissions = list.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      logs: p.logs.map((l) => ({
        ...l,
        timestamp: l.timestamp.toISOString(),
      })),
    }));

    return NextResponse.json({ permissions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat perizinan' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.studentId || !body.category || !body.reason || !body.plannedDeparture || !body.plannedReturn) {
      return NextResponse.json({ error: 'Data formulir tidak lengkap.' }, { status: 400 });
    }

    // Ambil konfigurasi hak akses & wewenang dari Super Admin
    let accessSettings = {
      superAdminOnlyApproval: false,
      allowWaliKelasApprove: true,
      allowWaliKelasCreate: true,
      allowUstadzCreate: true,
      allowOrangTuaCreate: true,
    };
    try {
      const row = await prisma.systemSetting.findUnique({
        where: { key: 'access_control_settings' },
      });
      if (row) {
        accessSettings = { ...accessSettings, ...JSON.parse(row.value) };
      }
    } catch (e) {
      console.warn('Gagal membaca access_control_settings:', e);
    }

    // Validasi wewenang pembuatan izin
    if (body.applicantType === 'ORANG_TUA' && !accessSettings.allowOrangTuaCreate) {
      return NextResponse.json(
        { error: 'Pengajuan izin oleh Orang Tua sedang dinonaktifkan oleh Super Admin.' },
        { status: 403 }
      );
    }
    if (body.applicantRole === 'USTADZ_UMUM' && !accessSettings.allowUstadzCreate) {
      return NextResponse.json(
        { error: 'Pembuatan izin oleh Musrif / Ustadz sedang dinonaktifkan oleh Super Admin.' },
        { status: 403 }
      );
    }
    if (body.applicantRole === 'WALI_KELAS' && !accessSettings.allowWaliKelasCreate) {
      return NextResponse.json(
        { error: 'Pembuatan izin oleh Wali Kelas sedang dinonaktifkan oleh Super Admin.' },
        { status: 403 }
      );
    }

    // Ambil data santri beserta kelas & wali kelasnya
    const student = await prisma.student.findUnique({
      where: { id: body.studentId },
      include: {
        classroom: {
          include: {
            waliKelas: true,
          },
        },
      },
    });

    const studentName = body.studentName || student?.fullName;
    const studentNis = body.studentNis || student?.nis || '-';
    const className = body.className || student?.className || '-';
    const dormitory = body.dormitory || student?.dormitory || '-';

    if (!studentName) {
      return NextResponse.json({ error: 'Data santri tidak ditemukan.' }, { status: 400 });
    }

    // Cek apakah santri masih memiliki izin aktif yang sedang berlangsung
    const activePermission = await prisma.permission.findFirst({
      where: {
        OR: [
          { studentId: body.studentId },
          ...(studentNis && studentNis !== '-' ? [{ studentNis }] : []),
        ],
        status: {
          in: ['PENDING_WALI_KELAS', 'APPROVED_WALI_KELAS', 'SEDANG_DI_LUAR'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activePermission) {
      if (activePermission.status === 'PENDING_WALI_KELAS') {
        return NextResponse.json(
          {
            error: `Santri ${studentName} masih memiliki permohonan izin yang sedang dalam tinjauan. Mohon tunggu persetujuan.`,
          },
          { status: 400 }
        );
      }

      if (activePermission.status === 'APPROVED_WALI_KELAS' || activePermission.status === 'SEDANG_DI_LUAR') {
        return NextResponse.json(
          {
            error: `Santri ${studentName} saat ini tercatat sedang memiliki izin aktif (sudah keluar asrama). Pengajuan baru dapat dilakukan setelah santri kembali atau jika izin sebelumnya dibatalkan.`,
          },
          { status: 400 }
        );
      }
    }

    // Aturan Auto-Approval & Wewenang:
    // 1. Jika mode "Super Admin Only" aktif -> Semua izin harus disetujui Super Admin (kecuali Super Admin sendiri yang membuat)
    // 2. Jika Super Admin / Kepala Asrama membuat -> langsung disetujui
    // 3. Jika Wali Kelas membuat dan wewenang Walas aktif -> langsung disetujui
    let isAutoApprove = false;
    let autoApproveNote = '';

    const classroomWaliId = student?.classroom?.waliKelasId;
    const classroomWaliName = student?.classroom?.waliKelasName || '';

    if (body.applicantRole === 'SUPER_ADMIN') {
      isAutoApprove = true;
      autoApproveNote = 'Disetujui otomatis oleh Super Admin saat pembuatan izin (Otomatis keluar asrama)';
    } else if (!accessSettings.superAdminOnlyApproval) {
      if (body.applicantRole === 'KEPALA_ASRAMA') {
        isAutoApprove = true;
        autoApproveNote = 'Disetujui otomatis oleh Kepala Asrama saat pembuatan izin (Otomatis keluar asrama)';
      } else if (
        accessSettings.allowWaliKelasApprove &&
        body.applicantType === 'USTADZ' &&
        body.applicantRole === 'WALI_KELAS' &&
        ((classroomWaliId && body.applicantId && classroomWaliId === body.applicantId) ||
         (classroomWaliName && body.applicantName && (
           classroomWaliName.toLowerCase().includes(body.applicantName.toLowerCase()) ||
           body.applicantName.toLowerCase().includes(classroomWaliName.toLowerCase())
         )))
      ) {
        isAutoApprove = true;
        autoApproveNote = `Disetujui otomatis oleh Wali Kelas (${classroomWaliName}) untuk santri kelasnya (Otomatis keluar asrama)`;
      }
    }

    // Aturan Requirement 1: Jika sudah diizinkan, otomatis dianggap sudah keluar asrama (SEDANG_DI_LUAR)
    const initialStatus = isAutoApprove ? 'SEDANG_DI_LUAR' : 'PENDING_WALI_KELAS';
    const approvedById = isAutoApprove ? (body.applicantId || null) : null;
    const approvedByName = isAutoApprove ? (body.applicantName || classroomWaliName) : null;
    const approvedAt = isAutoApprove ? new Date().toISOString() : null;
    const actualDeparture = isAutoApprove ? new Date().toISOString() : null;

    const targetApproverId = isAutoApprove ? null : (body.targetApproverId || classroomWaliId || null);
    const targetApproverName = isAutoApprove
      ? null
      : (body.targetApproverName || (accessSettings.superAdminOnlyApproval ? 'Super Admin' : (classroomWaliName ? `${classroomWaliName} & Super Admin` : 'Super Admin')));

    const submitNote = isAutoApprove
      ? autoApproveNote
      : targetApproverName
      ? `Pengajuan izin baru diajukan oleh ${body.applicantName || 'Pemohon'}. Menunggu persetujuan ${targetApproverName}.`
      : 'Pengajuan izin baru. Menunggu persetujuan Super Admin / Wali Kelas.';

    const created = await prisma.permission.create({
      data: {
        studentId: body.studentId,
        studentName,
        studentNis,
        className,
        dormitory,
        category: body.category,
        reason: body.reason,
        applicantType: body.applicantType || 'USTADZ',
        applicantId: body.applicantId || null,
        applicantName: body.applicantName || 'Pemohon',
        applicantPhone: body.applicantPhone || '-',
        targetApproverId,
        targetApproverName,
        escortType: body.escortType || 'ORANG_TUA',
        escortNote: body.escortNote || null,
        attachmentUrl: body.attachmentUrl || null,
        plannedDeparture: body.plannedDeparture,
        plannedReturn: body.plannedReturn,
        actualDeparture,
        status: initialStatus,
        approvedById,
        approvedByName,
        approvedAt,
        logs: {
          create: {
            action: isAutoApprove ? 'APPROVED' : 'SUBMITTED',
            actorName: body.applicantName || 'Pemohon',
            actorRole: body.applicantType === 'ORANG_TUA' ? 'ORANG_TUA' : (body.applicantRole || 'WALI_KELAS'),
            note: submitNote,
          },
        },
      },
      include: {
        logs: true,
      },
    });

    // Kirim Web Push Notification antar-perangkat
    try {
      const creatorExclude = body.applicantId ? [body.applicantId] : [];
      const newPermTag = `perm-new-${created.id}`;

      if (isAutoApprove) {
        await Promise.allSettled([
          sendTargetedPush(
            {
              title: 'Izin Santri Disetujui (Sudah Keluar Asrama) 🚪',
              body: `Izin untuk ${studentName} (${className}) telah disetujui oleh ${body.applicantName || 'Pihak Sekolah'}. Santri tercatat sudah keluar asrama.`,
              url: '/',
              tag: newPermTag,
            },
            {
              studentNisList: [studentNis],
              excludeUserIds: creatorExclude,
            }
          ),
          sendTargetedPush(
            {
              title: 'Izin Baru Disetujui 📝',
              body: `${studentName} (${className}) izin: ${body.reason} (Oleh: ${body.applicantName || 'Wali Kelas'})`,
              url: '/',
              tag: newPermTag,
            },
            {
              roles: ['KEPALA_ASRAMA', 'SUPER_ADMIN'],
              excludeUserIds: creatorExclude,
            }
          ),
        ]);
      } else {
        const targetRoles = ['SUPER_ADMIN'];
        if (!accessSettings.superAdminOnlyApproval) {
          targetRoles.push('KEPALA_ASRAMA');
          if (accessSettings.allowWaliKelasApprove) {
            targetRoles.push('WALI_KELAS');
          }
        }

        const candidateApproverIds = [body.targetApproverId, targetApproverId, classroomWaliId].filter(Boolean) as string[];
        const uniqueApproverIds = Array.from(new Set(candidateApproverIds));

        await sendTargetedPush(
          {
            title: 'Pengajuan Izin Santri Baru 📝',
            body: `${studentName} (${className}) mengajukan izin: ${body.reason}`,
            url: '/',
            tag: newPermTag,
          },
          {
            userIds: uniqueApproverIds.length > 0 ? uniqueApproverIds : undefined,
            roles: targetRoles,
            excludeUserIds: creatorExclude,
          }
        );
      }
    } catch (pushErr) {
      console.error('Push notification trigger error on POST:', pushErr);
    }

    return NextResponse.json({
      success: true,
      isAutoApproved: isAutoApprove,
      permission: {
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal membuat perizinan' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, actorName, actorRole, actorId, rejectionReason, cancelReason, actualDeparture, actualReturn, note } = body;

    // ==========================================
    // 0. EDIT DETAILS (UBAH DATA PERIZINAN OLEH ADMIN / KEPALA ASRAMA)
    // ==========================================
    if (body.action === 'EDIT_DETAILS' || body.isEdit) {
      if (!id) {
        return NextResponse.json({ error: 'ID izin wajib disertakan.' }, { status: 400 });
      }

      const existing = await prisma.permission.findUnique({
        where: { id },
      });

      if (!existing) {
        return NextResponse.json({ error: 'Izin tidak ditemukan.' }, { status: 404 });
      }

      const editData: any = {};
      if (body.category !== undefined) editData.category = body.category;
      if (body.reason !== undefined) editData.reason = body.reason;
      if (body.status !== undefined) editData.status = body.status;
      if (body.plannedDeparture !== undefined) editData.plannedDeparture = body.plannedDeparture;
      if (body.plannedReturn !== undefined) editData.plannedReturn = body.plannedReturn;
      if (body.actualDeparture !== undefined) editData.actualDeparture = body.actualDeparture || null;
      if (body.actualReturn !== undefined) editData.actualReturn = body.actualReturn || null;
      if (body.escortType !== undefined) editData.escortType = body.escortType;
      if (body.escortNote !== undefined) editData.escortNote = body.escortNote;
      if (body.applicantName !== undefined) editData.applicantName = body.applicantName;
      if (body.applicantPhone !== undefined) editData.applicantPhone = body.applicantPhone;
      if (body.rejectionReason !== undefined) editData.rejectionReason = body.rejectionReason || null;
      if (body.lateDurationMinutes !== undefined) editData.lateDurationMinutes = Number(body.lateDurationMinutes) || 0;
      if (body.lateFineAmount !== undefined) editData.lateFineAmount = Number(body.lateFineAmount) || 0;
      if (body.lateFineStatus !== undefined) editData.lateFineStatus = body.lateFineStatus || null;
      if (body.approvedByName !== undefined) editData.approvedByName = body.approvedByName;
      if (body.approvedAt !== undefined) editData.approvedAt = body.approvedAt;

      const actName = body.actorName || 'Admin Asrama';
      const actRole = body.actorRole || 'KEPALA_ASRAMA';

      const updated = await prisma.permission.update({
        where: { id },
        data: {
          ...editData,
          logs: {
            create: {
              action: 'APPROVED',
              actorName: actName,
              actorRole: actRole,
              note: body.note || `Data perizinan diperbarui oleh ${actName} (${actRole}).`,
            },
          },
        },
        include: {
          logs: {
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      return NextResponse.json({
        success: true,
        permission: {
          ...updated,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          logs: updated.logs.map((l) => ({
            ...l,
            timestamp: l.timestamp.toISOString(),
          })),
        },
      });
    }

    if (!id || !status || !actorName || !actorRole) {
      return NextResponse.json({ error: 'Parameter update status tidak lengkap.' }, { status: 400 });
    }

    const existing = await prisma.permission.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Izin tidak ditemukan.' }, { status: 404 });
    }

    // Ambil konfigurasi hak akses dari Super Admin
    let accessSettings = {
      superAdminOnlyApproval: false,
      allowWaliKelasApprove: true,
      allowWaliKelasCreate: true,
      allowUstadzCreate: true,
      allowOrangTuaCreate: true,
    };
    try {
      const row = await prisma.systemSetting.findUnique({
        where: { key: 'access_control_settings' },
      });
      if (row) {
        accessSettings = { ...accessSettings, ...JSON.parse(row.value) };
      }
    } catch {}

    const updateData: any = {};
    let logAction: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CHECK_OUT' | 'CHECK_IN' | 'CANCELLED' = 'APPROVED';
    let logNote = note || '';

    // ==========================================
    // 1. APPROVAL (DISETUJUI)
    // Requirement 1: Jika disetujui, otomatis langsung dianggap sudah keluar asrama (SEDANG_DI_LUAR)
    // Requirement 3: Super admin mengontrol hak menyetujui akun lain
    // ==========================================
    if (status === 'APPROVED_WALI_KELAS' || status === 'SEDANG_DI_LUAR' || body.action === 'APPROVE') {
      if (accessSettings.superAdminOnlyApproval && actorRole !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Mode "Hanya Super Admin Menyetujui" sedang aktif. Hanya Super Admin yang berwenang menyetujui izin ini.' },
          { status: 403 }
        );
      }

      if (actorRole === 'WALI_KELAS' && !accessSettings.allowWaliKelasApprove) {
        return NextResponse.json(
          { error: 'Wewenang persetujuan izin oleh Wali Kelas sedang dinonaktifkan oleh Super Admin.' },
          { status: 403 }
        );
      }

      // Otomatis tercatat keluar asrama saat diizinkan
      updateData.status = 'SEDANG_DI_LUAR';
      updateData.actualDeparture = actualDeparture || new Date().toISOString();
      updateData.approvedById = actorId || null;
      updateData.approvedByName = actorName;
      updateData.approvedAt = new Date().toISOString();
      logAction = 'APPROVED';
      logNote = logNote || `Disetujui oleh ${actorName} (${actorRole}). Santri otomatis tercatat sudah keluar asrama.`;
    }

    // ==========================================
    // 2. CANCEL / BATAL IZIN (REMOVE BUTTON)
    // Requirement 2: Tombol Remove/Cancel bisa dilakukan oleh semua musrif/guru yang dijumpai anak
    // Super admin menerima laporan detail
    // ==========================================
    else if (status === 'CANCELLED' || body.action === 'CANCEL') {
      const reasonText = cancelReason || note || 'Santri membatalkan izin keluar / pulang asrama.';
      updateData.status = 'CANCELLED';
      updateData.rejectionReason = reasonText;
      logAction = 'CANCELLED';
      logNote = `Izin dibatalkan oleh ${actorName} (${actorRole}). Alasan: ${reasonText}`;
    }

    // ==========================================
    // 3. REJECTED (DITOLAK)
    // ==========================================
    else if (status === 'REJECTED') {
      updateData.status = 'REJECTED';
      updateData.rejectionReason = rejectionReason || note || 'Izin ditolak.';
      logAction = 'REJECTED';
      logNote = `Ditolak oleh ${actorName} (${actorRole}): ${updateData.rejectionReason}`;
    }

    // ==========================================
    // 4. CHECK-IN (KEMBALI KE ASRAMA)
    // Bisa dilakukan oleh Musrif / Guru / Satpam manapun yang menemui santri
    // ==========================================
    else if (status === 'KEMBALI_TEPAT_WAKTU' || status === 'KEMBALI_TERLAMBAT') {
      const returnTime = actualReturn || new Date().toISOString();
      updateData.actualReturn = returnTime;
      updateData.satpamReturnId = actorId || null;
      updateData.satpamReturnName = actorName;

      let fineSettings = DEFAULT_FINE_SETTINGS;
      try {
        const settingRow = await prisma.systemSetting.findUnique({
          where: { key: 'late_fine_settings' },
        });
        if (settingRow) {
          fineSettings = { ...DEFAULT_FINE_SETTINGS, ...JSON.parse(settingRow.value) };
        }
      } catch {}

      const lateMins = calculateLateMinutes(existing.plannedReturn, returnTime);
      updateData.lateDurationMinutes = lateMins;

      const isLate = lateMins > (fineSettings.gracePeriodMinutes || 0);
      updateData.status = isLate ? 'KEMBALI_TERLAMBAT' : 'KEMBALI_TEPAT_WAKTU';

      if (isLate) {
        updateData.lateFineAmount = calculateLateFine(lateMins, fineSettings);
        updateData.lateFineStatus = body.lateFineStatus || 'UNPAID';
      } else {
        updateData.lateFineAmount = 0;
        updateData.lateFineStatus = null;
      }
      logAction = 'CHECK_IN';
      logNote = logNote || (isLate ? `Kembali ke asrama (terlambat ${lateMins} menit).` : 'Kembali ke asrama tepat waktu.');
    } else if (status === 'PAY_FINE' || body.action === 'PAY_FINE') {
      updateData.lateFineStatus = 'PAID';
      updateData.status = existing.status;
      logAction = 'CHECK_IN';
      logNote = `Pembayaran denda keterlambatan diselesaikan oleh ${actorName}.`;
    }

    if (body.lateFineStatus) {
      updateData.lateFineStatus = body.lateFineStatus;
    }

    const updated = await prisma.permission.update({
      where: { id },
      data: {
        ...updateData,
        logs: {
          create: {
            action: logAction,
            actorName,
            actorRole,
            note: logNote,
          },
        },
      },
      include: {
        logs: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    // Kirim Web Push Notification antar-perangkat
    try {
      const actorExclude = actorId ? [actorId] : [];
      const statusTag = `perm-status-${updated.id}-${updated.status}`;

      if (updated.status === 'SEDANG_DI_LUAR') {
        const applicantUserIds = [existing.applicantId, existing.targetApproverId].filter(Boolean) as string[];

        await Promise.allSettled([
          // Beritahu Pemohon & Orang Tua
          sendTargetedPush(
            {
              title: 'Izin Santri Disetujui (Keluar Asrama) ✅',
              body: `Alhamdulillah, izin ${existing.studentName} (${existing.className}) telah disetujui oleh ${actorName}. Santri otomatis tercatat keluar asrama.`,
              url: '/',
              tag: statusTag,
            },
            {
              userIds: applicantUserIds.length > 0 ? applicantUserIds : undefined,
              roles: ['KEPALA_ASRAMA', 'SUPER_ADMIN'],
              studentNisList: [existing.studentNis],
              excludeUserIds: actorExclude,
            }
          ),
        ]);
      } else if (updated.status === 'CANCELLED') {
        // Laporan Detail Pembatalan untuk Super Admin & Orang Tua (Requirement 2)
        await Promise.allSettled([
          sendTargetedPush(
            {
              title: 'Laporan: Izin Santri Dibatalkan 🚫',
              body: `Izin untuk ${existing.studentName} (${existing.className}) dibatalkan oleh ${actorName} (${actorRole}). Alasan: ${cancelReason || note || 'Batal izin'}`,
              url: '/',
              tag: statusTag,
            },
            {
              roles: ['SUPER_ADMIN', 'KEPALA_ASRAMA'],
              excludeUserIds: actorExclude,
            }
          ),
          sendTargetedPush(
            {
              title: 'Pemberitahuan: Izin Dibatalkan ℹ️',
              body: `Permohonan izin ananda ${existing.studentName} telah dibatalkan oleh pihak ustadz/sekolah (${actorName}).`,
              url: '/',
              tag: statusTag,
            },
            {
              studentNisList: [existing.studentNis],
              excludeUserIds: actorExclude,
            }
          ),
        ]);
      } else if (updated.status === 'REJECTED') {
        const applicantUserIds = [existing.applicantId, existing.targetApproverId].filter(Boolean) as string[];

        await sendTargetedPush(
          {
            title: 'Pengajuan Izin Belum Disetujui ❌',
            body: `Izin untuk ${existing.studentName} belum disetujui oleh ${actorName}: ${rejectionReason || 'Silakan hubungi pihak sekolah/asrama.'}`,
            url: '/',
            tag: statusTag,
          },
          {
            userIds: applicantUserIds.length > 0 ? applicantUserIds : undefined,
            roles: ['KEPALA_ASRAMA', 'SUPER_ADMIN'],
            studentNisList: [existing.studentNis],
            excludeUserIds: actorExclude,
          }
        );
      } else if (updated.status === 'KEMBALI_TEPAT_WAKTU' || updated.status === 'KEMBALI_TERLAMBAT') {
        const isLate = updated.status === 'KEMBALI_TERLAMBAT';
        const applicantUserIds = existing.applicantId ? [existing.applicantId] : [];

        await Promise.allSettled([
          sendTargetedPush(
            {
              title: isLate ? 'Santri Kembali ke Asrama (Terlambat) ⚠️' : 'Santri Telah Kembali ke Asrama 🏡',
              body: isLate
                ? `${existing.studentName} telah kembali ke asrama (terlambat ${updated.lateDurationMinutes || 0} menit, diverifikasi oleh ${actorName}).`
                : `Alhamdulillah, ${existing.studentName} telah tiba kembali di asrama tepat waktu (diverifikasi oleh ${actorName}).`,
              url: '/',
              tag: statusTag,
            },
            {
              userIds: applicantUserIds.length > 0 ? applicantUserIds : undefined,
              studentNisList: [existing.studentNis],
              excludeUserIds: actorExclude,
            }
          ),
          sendTargetedPush(
            {
              title: isLate ? 'Laporan Keterlambatan Santri ⚠️' : 'Santri Kembali ke Asrama 🏡',
              body: isLate
                ? `${existing.studentName} (${existing.className}) kembali terlambat ${updated.lateDurationMinutes || 0} menit (Verifikator: ${actorName}).`
                : `${existing.studentName} (${existing.className}) telah kembali ke asrama (Verifikator: ${actorName}).`,
              url: '/',
              tag: statusTag,
            },
            {
              roles: ['KEPALA_ASRAMA', 'SUPER_ADMIN'],
              excludeUserIds: actorExclude,
            }
          ),
        ]);
      }
    } catch (pushErr) {
      console.error('Push notification trigger error on PATCH:', pushErr);
    }

    return NextResponse.json({
      success: true,
      permission: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memperbarui status izin' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');
    let actorName = searchParams.get('actorName') || 'Admin Asrama';
    let actorRole = searchParams.get('actorRole') || 'KEPALA_ASRAMA';

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
        if (body.actorName) actorName = body.actorName;
        if (body.actorRole) actorRole = body.actorRole;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'ID izin wajib disertakan.' }, { status: 400 });
    }

    const existing = await prisma.permission.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Data izin tidak ditemukan.' }, { status: 404 });
    }

    // Hapus log terkait terlebih dahulu, kemudian hapus perizinan
    await prisma.permissionLog.deleteMany({
      where: { permissionId: id },
    });
    await prisma.permission.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Arsip perizinan santri ${existing.studentName} berhasil dihapus.`,
      deletedId: id,
    });
  } catch (error: any) {
    console.error('Error deleting permission:', error);
    return NextResponse.json(
      { error: error.message || 'Gagal menghapus arsip perizinan.' },
      { status: 500 }
    );
  }
}
