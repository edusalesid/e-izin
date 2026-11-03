import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTargetedPush } from '@/lib/server/push';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentId,
      escortType = 'ORANG_TUA',
      escortNote,
      pesiarDate,
      returnTime = '17:00',
      actorId,
      actorName = 'Kepala Asrama',
    } = body;

    if (!studentId || !pesiarDate) {
      return NextResponse.json({ error: 'Data santri dan tanggal pesiar wajib disertakan.' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Data santri tidak ditemukan.' }, { status: 404 });
    }

    // Periksa apakah santri saat ini sedang berada di luar
    const activeOutside = await prisma.permission.findFirst({
      where: {
        studentId,
        status: 'SEDANG_DI_LUAR',
      },
    });

    if (activeOutside) {
      return NextResponse.json(
        { error: `Santri ${student.fullName} saat ini masih berstatus SEDANG_DI_LUAR.` },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const plannedReturnStr = `${pesiarDate}T${returnTime}:00`;

    const noteEscort =
      escortNote ||
      (escortType === 'ORANG_TUA'
        ? `Wali: ${student.parentName || 'Orang Tua'}`
        : escortType === 'MANDIRI'
        ? 'Keluar Mandiri'
        : escortType === 'OJEK_TRAVEL'
        ? 'Ojek / Travel'
        : 'Saudara / Mahram');

    const created = await prisma.permission.create({
      data: {
        studentId: student.id,
        studentName: student.fullName,
        studentNis: student.nis,
        className: student.className,
        dormitory: student.dormitory,
        category: 'PESIAR',
        reason: 'Pesiar Santri Asrama',
        applicantType: 'USTADZ',
        applicantId: actorId || null,
        applicantName: actorName,
        applicantPhone: student.parentPhone || '-',
        targetApproverId: actorId || null,
        targetApproverName: actorName,
        escortType,
        escortNote: noteEscort,
        plannedDeparture: nowIso,
        plannedReturn: plannedReturnStr,
        actualDeparture: nowIso,
        status: 'SEDANG_DI_LUAR',
        approvedById: actorId || null,
        approvedByName: actorName,
        approvedAt: nowIso,
        logs: {
          create: [
            {
              action: 'SUBMITTED',
              actorName,
              actorRole: 'KEPALA_ASRAMA',
              note: 'Pendaftaran izin pesiar cepat oleh Kepala Asrama.',
            },
            {
              action: 'CHECK_OUT',
              actorName,
              actorRole: 'KEPALA_ASRAMA',
              note: `Quick Approval Pesiar: Santri langsung keluar asrama (${escortType}). Batas kembali ${returnTime} WIB.`,
            },
          ],
        },
      },
    });

    // Kirim Web Push Notification antar-perangkat secara otomatis (di-await agar selesai di Serverless)
    try {
      const pesiarTag = `perm-new-${created.id}`;
      const actorExclude = actorId ? [actorId] : [];
      await Promise.allSettled([
        // 1. Beritahu Wali Santri
        sendTargetedPush(
          {
            title: 'Santri Pesiar (Keluar Asrama) 🚗',
            body: `${student.fullName} telah check-out pesiar. Batas waktu kembali: ${returnTime} WIB.`,
            url: '/',
            tag: pesiarTag,
          },
          {
            studentNisList: [student.nis],
            excludeUserIds: actorExclude,
          }
        ),
        // 2. Beritahu Satpam di pos gerbang
        sendTargetedPush(
          {
            title: 'Pesiar Santri: Siap Keluar Gerbang 🚪',
            body: `Santri ${student.fullName} (${student.className}) telah diizinkan pesiar (Batas: ${returnTime} WIB).`,
            url: '/',
            tag: pesiarTag,
          },
          {
            roles: ['SATPAM'],
            excludeUserIds: actorExclude,
          }
        ),
      ]);
    } catch (pushErr) {
      console.error('Push notification trigger error on Pesiar checkout:', pushErr);
    }

    return NextResponse.json(
      {
        success: true,
        permission: {
          ...created,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses quick approval pesiar' }, { status: 500 });
  }
}
