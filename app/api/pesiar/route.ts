import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (date) {
      const schedule = await prisma.pesiarSchedule.findUnique({
        where: { date },
      });
      return NextResponse.json({ schedule });
    }

    const schedules = await prisma.pesiarSchedule.findMany({
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ schedules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat jadwal pesiar' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, startTime = '08:00', returnTime = '17:00', description = 'Pesiar Santri', isActive = true, actorId, actorName } = body;

    if (!date) {
      return NextResponse.json({ error: 'Tanggal jadwal pesiar wajib diisi.' }, { status: 400 });
    }

    const schedule = await prisma.pesiarSchedule.upsert({
      where: { date },
      update: {
        startTime,
        returnTime,
        description,
        isActive,
        createdById: actorId || undefined,
        createdByName: actorName || undefined,
      },
      create: {
        date,
        startTime,
        returnTime,
        description,
        isActive,
        createdById: actorId || null,
        createdByName: actorName || 'Kepala Asrama',
      },
    });

    return NextResponse.json({ success: true, schedule }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan jadwal pesiar' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, returnTime, startTime, description, isActive, actorName = 'Kepala Asrama', actorId, syncActive = true } = body;

    if (!date || !returnTime) {
      return NextResponse.json({ error: 'Tanggal dan jam batas kepulangan wajib diisi.' }, { status: 400 });
    }

    // Update pesiar schedule
    const schedule = await prisma.pesiarSchedule.upsert({
      where: { date },
      update: {
        returnTime,
        ...(startTime ? { startTime } : {}),
        ...(description ? { description } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      create: {
        date,
        startTime: startTime || '08:00',
        returnTime,
        description: description || 'Pesiar Santri',
        isActive: typeof isActive === 'boolean' ? isActive : true,
        createdById: actorId || null,
        createdByName: actorName,
      },
    });

    // Otomatis sinkronisasi plannedReturn ke semua santri yang sedang di luar pesiar pada tanggal tersebut
    let updatedCount = 0;
    if (syncActive) {
      // Buat format target Planned Return ISO untuk tanggal dan jam baru
      const targetPlannedReturn = `${date}T${returnTime}:00`;

      // Ambil santri yang berstatus SEDANG_DI_LUAR dengan kategori PESIAR pada tanggal tersebut
      const activePesiarList = await prisma.permission.findMany({
        where: {
          category: 'PESIAR',
          status: 'SEDANG_DI_LUAR',
          plannedDeparture: {
            startsWith: date,
          },
        },
      });

      for (const p of activePesiarList) {
        await prisma.permission.update({
          where: { id: p.id },
          data: {
            plannedReturn: targetPlannedReturn,
            logs: {
              create: {
                action: 'APPROVED',
                actorName,
                actorRole: 'KEPALA_ASRAMA',
                note: `Batas kepulangan pesiar diperbarui menjadi pukul ${returnTime} WIB oleh ${actorName}.`,
              },
            },
          },
        });
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      schedule,
      updatedActiveStudentsCount: updatedCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memperbarui jadwal pesiar' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({ error: 'Tanggal pesiar wajib disertakan.' }, { status: 400 });
    }

    await prisma.pesiarSchedule.delete({
      where: { date },
    });

    return NextResponse.json({ success: true, message: 'Jadwal pesiar berhasil dihapus.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal menghapus jadwal pesiar' }, { status: 500 });
  }
}
