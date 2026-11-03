import { NextRequest, NextResponse } from 'next/server';
import { sendTargetedPush } from '@/lib/server/push';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, role, studentNis } = body;

    const result = await sendTargetedPush(
      {
        title: 'Uji Push Notifikasi Berhasil! 🔔',
        body: 'Alhamdulillah, push notification server E-Izin SMAIT Ihsanul Fikri aktif dan berfungsi normal.',
        url: '/',
      },
      {
        userIds: userId ? [userId] : undefined,
        roles: role ? [role] : undefined,
        studentNisList: studentNis ? [studentNis] : undefined,
      }
    );

    return NextResponse.json({
      success: true,
      message: `Terkirim ke ${result.sent} perangkat (Gagal: ${result.failed})`,
      result,
    });
  } catch (err: any) {
    console.error('Error in /api/push/test:', err);
    return NextResponse.json({ error: err.message || 'Gagal menguji push' }, { status: 500 });
  }
}
