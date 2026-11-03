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
    });

    const permissions = list.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
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

    // Aturan Perizinan:
    // 1. Perizinan hanya bisa dilakukan 1 santri.
    // 2. Jika santri sedang dalam tinjauan (PENDING_WALI_KELAS), tidak bisa menambahkan lagi dan harus menunggu di-approve.
    // 3. Jika santri sudah di-approve (APPROVED_WALI_KELAS) atau sedang di luar/pulang (SEDANG_DI_LUAR), tidak dapat mengajukan izin baru.
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
            error: `Santri ${studentName} masih memiliki permohonan izin yang sedang dalam tinjauan. Tidak bisa menambahkan izin lagi, harus menunggu persetujuan (approve).`,
          },
          { status: 400 }
        );
      }

      if (activePermission.status === 'APPROVED_WALI_KELAS') {
        return NextResponse.json(
          {
            error: `Santri ${studentName} sudah memiliki perizinan yang telah disetujui (siap keluar gerbang). Tidak bisa mengajukan izin baru.`,
          },
          { status: 400 }
        );
      }

      if (activePermission.status === 'SEDANG_DI_LUAR') {
        return NextResponse.json(
          {
            error: `Santri ${studentName} saat ini tercatat sedang berada di luar pondok / pulang. Pengajuan izin baru hanya dapat dilakukan setelah santri kembali.`,
          },
          { status: 400 }
        );
      }
    }

    // Aturan Auto-Approval:
    // 1. Jika pembuat izin adalah Kepala Asrama -> langsung AUTO-APPROVED
    // 2. Jika pembuat izin adalah Wali Kelas dari kelas santri ini -> langsung AUTO-APPROVED
    // 3. Jika pembuat izin adalah orang tua / ustadz lain di luar kelas santri -> PENDING (butuh persetujuan Wali Kelas atau Kepala Asrama)
    let isAutoApprove = false;
    let autoApproveNote = '';

    const classroomWaliId = student?.classroom?.waliKelasId;
    const classroomWaliName = student?.classroom?.waliKelasName || '';

    if (body.applicantRole === 'KEPALA_ASRAMA' || body.applicantRole === 'SUPER_ADMIN') {
      isAutoApprove = true;
      autoApproveNote = 'Disetujui otomatis oleh Super Admin / Kepala Asrama saat pembuatan izin';
    } else if (
      body.applicantType === 'USTADZ' &&
      body.applicantRole === 'WALI_KELAS' &&
      ((classroomWaliId && body.applicantId && classroomWaliId === body.applicantId) ||
       (classroomWaliName && body.applicantName && (
         classroomWaliName.toLowerCase().includes(body.applicantName.toLowerCase()) ||
         body.applicantName.toLowerCase().includes(classroomWaliName.toLowerCase())
       )))
    ) {
      isAutoApprove = true;
      autoApproveNote = `Disetujui otomatis oleh Wali Kelas (${classroomWaliName}) untuk santri kelasnya sendiri (info diteruskan ke Kepala Asrama)`;
    }

    const initialStatus = isAutoApprove ? 'APPROVED_WALI_KELAS' : 'PENDING_WALI_KELAS';
    const approvedById = isAutoApprove ? (body.applicantId || null) : null;
    const approvedByName = isAutoApprove ? (body.applicantName || classroomWaliName) : null;
    const approvedAt = isAutoApprove ? new Date().toISOString() : null;

    // Prioritaskan targetApproverId yang dipilih secara eksplisit oleh pemohon (misal memilih Anton)
    // Jika tidak ada target spesifik, gunakan wali kelas santri tersebut
    const targetApproverId = isAutoApprove ? null : (body.targetApproverId || classroomWaliId || null);
    const targetApproverName = isAutoApprove
      ? null
      : (body.targetApproverName || (classroomWaliName ? `${classroomWaliName} & Kepala Asrama` : 'Wali Kelas & Kepala Asrama'));

    const submitNote = isAutoApprove
      ? autoApproveNote
      : targetApproverName
      ? `Pengajuan izin baru diajukan oleh ${body.applicantName || 'Ustadz'}. Menunggu persetujuan ${targetApproverName}.`
      : 'Pengajuan izin baru. Menunggu persetujuan Wali Kelas atau Kepala Asrama.';

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
    });

    // Kirim Web Push Notification antar-perangkat secara otomatis (wajib di-await agar tidak diputus Vercel Serverless)
    try {
      const creatorExclude = body.applicantId ? [body.applicantId] : [];
      const newPermTag = `perm-new-${created.id}`;

      if (isAutoApprove) {
        await Promise.allSettled([
          sendTargetedPush(
            {
              title: 'Izin Santri Disetujui Otomatis 🔔',
              body: `Izin untuk ${studentName} (${className}) telah disetujui oleh ${body.applicantName || 'Pihak Sekolah'}.`,
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
              title: 'Izin Baru Siap Keluar 🚪',
              body: `Santri ${studentName} (${className}) telah disetujui izin keluar pos gerbang.`,
              url: '/',
              tag: newPermTag,
            },
            {
              roles: ['SATPAM'],
              excludeUserIds: creatorExclude,
            }
          ),
          sendTargetedPush(
            {
              title: 'Pengajuan Izin Santri Baru 📝',
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
        const targetRoles = ['KEPALA_ASRAMA', 'SUPER_ADMIN'];
        // Kumpulkan semua ID approver: approver yang dipilih pemohon (misal Anton) dan/atau wali kelas
        const candidateApproverIds = [body.targetApproverId, targetApproverId, classroomWaliId].filter(Boolean) as string[];
        const uniqueApproverIds = Array.from(new Set(candidateApproverIds));

        if (uniqueApproverIds.length === 0) {
          targetRoles.push('WALI_KELAS');
        }

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
    const { id, status, actorName, actorRole, actorId, rejectionReason, actualDeparture, actualReturn, note } = body;

    if (!id || !status || !actorName || !actorRole) {
      return NextResponse.json({ error: 'Parameter update status tidak lengkap.' }, { status: 400 });
    }

    const existing = await prisma.permission.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Izin tidak ditemukan.' }, { status: 404 });
    }

    const updateData: any = {
      status,
    };

    let logAction: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CHECK_OUT' | 'CHECK_IN' = 'APPROVED';

    if (status === 'APPROVED_WALI_KELAS') {
      updateData.approvedById = actorId || null;
      updateData.approvedByName = actorName;
      updateData.approvedAt = new Date().toISOString();
      logAction = 'APPROVED';
    } else if (status === 'REJECTED') {
      updateData.rejectionReason = rejectionReason || null;
      logAction = 'REJECTED';
    } else if (status === 'SEDANG_DI_LUAR') {
      updateData.actualDeparture = actualDeparture || new Date().toISOString();
      updateData.satpamDepartureId = actorId || null;
      updateData.satpamDepartureName = actorName;
      logAction = 'CHECK_OUT';
    } else if (status === 'KEMBALI_TEPAT_WAKTU' || status === 'KEMBALI_TERLAMBAT') {
      const returnTime = actualReturn || new Date().toISOString();
      updateData.actualReturn = returnTime;
      updateData.satpamReturnId = actorId || null;
      updateData.satpamReturnName = actorName;

      // Ambil konfigurasi denda yang disetel oleh Kepala Asrama
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

      // Terlambat jika melampaui toleransi (grace period)
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
    } else if (status === 'PAY_FINE' || body.action === 'PAY_FINE') {
      updateData.lateFineStatus = 'PAID';
      updateData.status = existing.status;
      logAction = 'CHECK_IN';
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
            note: note || rejectionReason || `Status diperbarui menjadi ${status}`,
          },
        },
      },
    });

    // Kirim Web Push Notification antar-perangkat sesuai aksi pembaruan status (wajib di-await di Serverless)
    try {
      const actorExclude = actorId ? [actorId] : [];
      const statusTag = `perm-status-${updated.id}-${updated.status}`;

      if (status === 'APPROVED_WALI_KELAS') {
        const applicantUserIds = [existing.applicantId, existing.targetApproverId].filter(Boolean) as string[];

        await Promise.allSettled([
          // 1. Beritahu Pemohon (Ustadz pemohon maupun Wali Santri) & Kepala Asrama/Super Admin
          sendTargetedPush(
            {
              title: 'Izin Santri Disetujui ✅',
              body: `Alhamdulillah, izin ${existing.studentName} (${existing.className}) telah disetujui oleh ${actorName}.`,
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
          // 2. Beritahu Satpam di pos gerbang
          sendTargetedPush(
            {
              title: 'Izin Santri Siap Keluar 🚪',
              body: `Santri ${existing.studentName} (${existing.className}) diizinkan keluar pos gerbang.`,
              url: '/',
              tag: statusTag,
            },
            {
              roles: ['SATPAM'],
              excludeUserIds: actorExclude,
            }
          ),
        ]);
      } else if (status === 'REJECTED') {
        const applicantUserIds = [existing.applicantId, existing.targetApproverId].filter(Boolean) as string[];

        // Beritahu Pemohon (Ustadz pemohon maupun Wali Santri) & Kepala Asrama/Super Admin
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
      } else if (status === 'SEDANG_DI_LUAR') {
        const applicantUserIds = existing.applicantId ? [existing.applicantId] : [];

        await Promise.allSettled([
          // Beritahu Wali Santri & Pemohon
          sendTargetedPush(
            {
              title: 'Santri Telah Keluar Gerbang 🚗',
              body: `${existing.studentName} telah melewati pos gerbang (Satpam: ${actorName}).`,
              url: '/',
              tag: statusTag,
            },
            {
              userIds: applicantUserIds.length > 0 ? applicantUserIds : undefined,
              studentNisList: [existing.studentNis],
              excludeUserIds: actorExclude,
            }
          ),
          // Beritahu Kepala Asrama & Super Admin
          sendTargetedPush(
            {
              title: 'Aktivitas Gerbang: Santri Keluar 🚪',
              body: `${existing.studentName} (${existing.className}) tercatat keluar gerbang oleh Satpam ${actorName}.`,
              url: '/',
              tag: statusTag,
            },
            {
              roles: ['KEPALA_ASRAMA', 'SUPER_ADMIN'],
              excludeUserIds: actorExclude,
            }
          ),
        ]);
      } else if (status === 'KEMBALI_TEPAT_WAKTU' || status === 'KEMBALI_TERLAMBAT') {
        const isLate = updated.status === 'KEMBALI_TERLAMBAT';
        const applicantUserIds = existing.applicantId ? [existing.applicantId] : [];

        const pushTasks: Promise<any>[] = [
          // Beritahu Wali Santri & Pemohon
          sendTargetedPush(
            {
              title: isLate ? 'Santri Kembali (Terlambat) ⚠️' : 'Santri Telah Kembali ke Pondok 🏡',
              body: isLate
                ? `${existing.studentName} telah tiba di pos gerbang (terlambat ${updated.lateDurationMinutes || 0} menit).`
                : `Alhamdulillah, ${existing.studentName} telah tiba kembali di pondok tepat waktu.`,
              url: '/',
              tag: statusTag,
            },
            {
              userIds: applicantUserIds.length > 0 ? applicantUserIds : undefined,
              studentNisList: [existing.studentNis],
              excludeUserIds: actorExclude,
            }
          ),
        ];

        // Beritahu Kepala Asrama & Super Admin
        pushTasks.push(
          sendTargetedPush(
            {
              title: isLate ? 'Laporan Keterlambatan Santri ⚠️' : 'Santri Kembali ke Pondok 🏡',
              body: isLate
                ? `${existing.studentName} (${existing.className}) terlambat ${updated.lateDurationMinutes || 0} menit (Denda: Rp${(updated.lateFineAmount || 0).toLocaleString('id-ID')}).`
                : `${existing.studentName} (${existing.className}) telah kembali ke pondok tepat waktu.`,
              url: '/',
              tag: statusTag,
            },
            {
              roles: ['KEPALA_ASRAMA', 'SUPER_ADMIN'],
              excludeUserIds: actorExclude,
            }
          )
        );

        await Promise.allSettled(pushTasks);
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
