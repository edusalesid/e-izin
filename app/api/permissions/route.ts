import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateLateMinutes, calculateLateFine, DEFAULT_FINE_SETTINGS } from '@/lib/utils';

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

    const targetApproverId = isAutoApprove ? null : (classroomWaliId || body.targetApproverId || null);
    const targetApproverName = isAutoApprove ? null : (classroomWaliName || body.targetApproverName || 'Wali Kelas & Kepala Asrama');

    const submitNote = isAutoApprove
      ? autoApproveNote
      : classroomWaliName
      ? `Pengajuan izin baru diajukan oleh ${body.applicantName || 'Ustadz'}. Menunggu persetujuan Wali Kelas (${classroomWaliName}) atau Kepala Asrama.`
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
