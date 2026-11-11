import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        classrooms: true,
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat pengguna' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, name, role, phone, pin, classroomId } = body;

    if (!username || !name || !role) {
      return NextResponse.json(
        { error: 'Nama, username, dan peran akun (role) wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();

    // Cek username unik
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Username "${cleanUsername}" sudah digunakan oleh akun lain.` },
        { status: 400 }
      );
    }

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        name: name.trim(),
        role: role.trim(),
        phone: phone ? phone.trim() : null,
        pin: pin ? pin.trim() : '123456',
        classroomId: role === 'WALI_KELAS' && classroomId ? classroomId : null,
      },
      include: {
        classrooms: true,
      },
    });

    // Jika role WALI_KELAS dan memilih kelas, sinkronkan data Classroom
    if (role === 'WALI_KELAS' && classroomId) {
      try {
        await prisma.classroom.update({
          where: { id: classroomId },
          data: {
            waliKelasId: newUser.id,
            waliKelasName: newUser.name,
            waliKelasPhone: newUser.phone,
          },
        });
      } catch (classErr) {
        console.warn('Gagal menautkan ke kelas:', classErr);
      }
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      message: 'Akun petugas berhasil dibuat.',
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal membuat akun pengguna baru.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, pin, phone, name, username, role, classroomId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID wajib disertakan.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
    }

    const updateData: any = {};
    if (typeof pin === 'string' && pin.trim().length > 0) {
      updateData.pin = pin.trim();
    }
    if (typeof phone === 'string') {
      updateData.phone = phone.trim() || null;
    }
    if (typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim();
    }
    if (typeof username === 'string' && username.trim().length > 0) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername !== targetUser.username) {
        const usernameExists = await prisma.user.findUnique({
          where: { username: cleanUsername },
        });
        if (usernameExists) {
          return NextResponse.json({ error: 'Username sudah digunakan.' }, { status: 400 });
        }
        updateData.username = cleanUsername;
      }
    }
    if (typeof role === 'string' && role.trim().length > 0) {
      updateData.role = role.trim();
    }
    if (classroomId !== undefined) {
      updateData.classroomId = classroomId || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        classrooms: true,
      },
    });

    // Jika wali kelas, sinkronkan nama di classroom
    if (updatedUser.role === 'WALI_KELAS' && classroomId) {
      try {
        await prisma.classroom.update({
          where: { id: classroomId },
          data: {
            waliKelasId: updatedUser.id,
            waliKelasName: updatedUser.name,
            waliKelasPhone: updatedUser.phone,
          },
        });
      } catch {}
    }

    return NextResponse.json({ success: true, user: updatedUser, message: 'Data akun berhasil diperbarui.' });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal memperbarui profil pengguna.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'User ID wajib disertakan.' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { classrooms: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Akun tidak ditemukan.' }, { status: 404 });
    }

    // Cegah penghapusan jika ini adalah satu-satunya Super Admin
    if (targetUser.role === 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN' },
      });
      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'Tidak dapat menghapus Super Admin terakhir pada sistem.' },
          { status: 400 }
        );
      }
    }

    // Jika akun mengampu kelas, lepas relasi kelas terlebih dahulu
    if (targetUser.classrooms && targetUser.classrooms.length > 0) {
      // Cari fallback super admin untuk menampung kelas sementara
      const fallbackAdmin = await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN', id: { not: userId } },
      });

      if (fallbackAdmin) {
        await prisma.classroom.updateMany({
          where: { waliKelasId: userId },
          data: {
            waliKelasId: fallbackAdmin.id,
            waliKelasName: fallbackAdmin.name,
            waliKelasPhone: fallbackAdmin.phone,
          },
        });
      }
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: `Akun ${targetUser.name} berhasil dihapus.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus akun pengguna.' },
      { status: 500 }
    );
  }
}
