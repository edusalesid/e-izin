import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys, userId, role, studentNis, deviceInfo } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Format langganan push tidak valid (endpoint dan keys wajib ada)' },
        { status: 400 }
      );
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: userId || null,
        role: role || null,
        studentNis: studentNis || null,
        deviceInfo: deviceInfo || null,
        updatedAt: new Date(),
      },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: userId || null,
        role: role || null,
        studentNis: studentNis || null,
        deviceInfo: deviceInfo || null,
      },
    });

    return NextResponse.json({ success: true, id: subscription.id });
  } catch (err: any) {
    console.error('Error in /api/push/subscribe POST:', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan langganan notifikasi' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint wajib diisi' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error in /api/push/subscribe DELETE:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
