import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat pengguna' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pin, phone, name } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID wajib disertakan.' }, { status: 400 });
    }

    const updateData: any = {};
    if (typeof pin === 'string' && pin.trim().length > 0) {
      updateData.pin = pin.trim();
    }
    if (typeof phone === 'string' && phone.trim().length > 0) {
      updateData.phone = phone.trim();
    }
    if (typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal memperbarui profil pengguna.' },
      { status: 500 }
    );
  }
}
