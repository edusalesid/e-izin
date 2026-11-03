import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nis = searchParams.get('nis');

    if (nis) {
      const student = await prisma.student.findUnique({
        where: { nis: nis.trim() },
        include: { classroom: true },
      });
      if (!student) {
        return NextResponse.json({ error: 'Santri dengan NIS tersebut tidak ditemukan.' }, { status: 404 });
      }
      return NextResponse.json({ student });
    }

    const students = await prisma.student.findMany({
      include: { classroom: true },
      orderBy: { fullName: 'asc' },
    });
    return NextResponse.json({ students });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body.students)) {
      return NextResponse.json({ error: 'Payload harus berupa array students' }, { status: 400 });
    }

    for (const s of body.students) {
      await prisma.student.upsert({
        where: { nis: s.nis },
        update: {
          fullName: s.fullName,
          gender: s.gender,
          classroomId: s.classroomId,
          className: s.className,
          dormitory: s.dormitory,
          parentName: s.parentName,
          parentPhone: s.parentPhone,
        },
        create: {
          nis: s.nis,
          fullName: s.fullName,
          gender: s.gender,
          classroomId: s.classroomId,
          className: s.className,
          dormitory: s.dormitory,
          parentName: s.parentName,
          parentPhone: s.parentPhone,
        },
      });
    }

    return NextResponse.json({ success: true, count: body.students.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan data santri' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, parentPhone, parentName } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'ID Santri wajib disertakan.' }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof parentPhone === 'string' && parentPhone.trim().length > 0) {
      updateData.parentPhone = parentPhone.trim();
    }
    if (typeof parentName === 'string' && parentName.trim().length > 0) {
      updateData.parentName = parentName.trim();
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: updateData,
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal memperbarui profil santri.' },
      { status: 500 }
    );
  }
}
