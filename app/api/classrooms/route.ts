import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const classrooms = await prisma.classroom.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ classrooms });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat data kelas' }, { status: 500 });
  }
}
