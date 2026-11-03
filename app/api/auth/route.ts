import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthSession } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { loginType, identifier, secret, nis, phone, username, pin } = body;

    const rawId = (identifier || username || nis || '').trim();
    const rawSecret = (secret || pin || phone || '').trim();

    // 1. General Login (Default / Unified login)
    if (!loginType || loginType === 'GENERAL') {
      if (!rawId) {
        return NextResponse.json(
          { error: 'NIS santri atau username petugas wajib diisi.' },
          { status: 400 }
        );
      }

      // Check if it's a Staff account first (bisa via username atau nama ustadz)
      const staffUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username: rawId.toLowerCase() },
            { name: { equals: rawId, mode: 'insensitive' } },
          ],
        },
      });

      if (staffUser) {
        if (staffUser.pin && rawSecret && staffUser.pin !== rawSecret) {
          return NextResponse.json({ error: 'PIN pengamanan salah.' }, { status: 401 });
        }

        const session: AuthSession = {
          role: staffUser.role as any,
          user: {
            id: staffUser.id,
            username: staffUser.username,
            name: staffUser.name,
            role: staffUser.role as any,
            phone: staffUser.phone || undefined,
            pin: staffUser.pin || undefined,
            classroomId: staffUser.classroomId || undefined,
          },
          loginTime: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, session });
      }

      // Check if it's a Student (Wali Santri) - bisa via NIS atau nama lengkap santri
      const student = await prisma.student.findFirst({
        where: {
          OR: [
            { nis: rawId },
            { fullName: { equals: rawId, mode: 'insensitive' } },
          ],
        },
      });

      if (student) {
        const session: AuthSession = {
          role: 'ORANG_TUA',
          student: {
            id: student.id,
            nis: student.nis,
            fullName: student.fullName,
            gender: student.gender as 'L' | 'P',
            classroomId: student.classroomId,
            className: student.className,
            dormitory: student.dormitory,
            parentName: student.parentName,
            parentPhone: student.parentPhone,
          },
          loginTime: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, session });
      }

      return NextResponse.json(
        { error: 'Akun petugas atau NIS santri tidak ditemukan. Mohon periksa kembali.' },
        { status: 404 }
      );
    }

    // 2. Backward compatibility: Login Orang Tua
    if (loginType === 'ORANG_TUA') {
      const targetNis = (nis || rawId).trim();
      if (!targetNis) {
        return NextResponse.json(
          { error: 'Nomor Induk Santri (NIS) wajib diisi.' },
          { status: 400 }
        );
      }

      const student = await prisma.student.findUnique({
        where: { nis: targetNis },
      });

      if (!student) {
        return NextResponse.json(
          { error: 'Santri dengan NIS tersebut tidak ditemukan. Mohon periksa kembali.' },
          { status: 404 }
        );
      }

      const session: AuthSession = {
        role: 'ORANG_TUA',
        student: {
          id: student.id,
          nis: student.nis,
          fullName: student.fullName,
          gender: student.gender as 'L' | 'P',
          classroomId: student.classroomId,
          className: student.className,
          dormitory: student.dormitory,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
        },
        loginTime: new Date().toISOString(),
      };

      return NextResponse.json({ success: true, session });
    }

    // 3. Backward compatibility: Login Petugas / Ustadz
    if (loginType === 'PETUGAS') {
      const targetUsername = (username || rawId).trim();
      const targetPin = (pin || rawSecret).trim();

      if (!targetUsername) {
        return NextResponse.json({ error: 'Username petugas wajib diisi.' }, { status: 400 });
      }

      const user = await prisma.user.findUnique({
        where: { username: targetUsername.toLowerCase() },
      });

      if (!user) {
        return NextResponse.json({ error: 'Akun petugas tidak terdaftar.' }, { status: 404 });
      }

      if (user.pin && user.pin !== targetPin) {
        return NextResponse.json({ error: 'PIN pengamanan salah.' }, { status: 401 });
      }

      const session: AuthSession = {
        role: user.role as any,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role as any,
          phone: user.phone || undefined,
          pin: user.pin || undefined,
          classroomId: user.classroomId || undefined,
        },
        loginTime: new Date().toISOString(),
      };

      return NextResponse.json({ success: true, session });
    }

    return NextResponse.json({ error: 'Tipe login tidak valid.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kendala saat memproses login.' }, { status: 500 });
  }
}
