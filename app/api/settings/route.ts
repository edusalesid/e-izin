import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_FINE_SETTINGS } from '@/lib/utils';

const DEFAULT_ACCESS_CONTROL_SETTINGS = {
  superAdminOnlyApproval: false,
  allowWaliKelasApprove: true,
  allowWaliKelasCreate: true,
  allowUstadzCreate: true,
  allowOrangTuaCreate: true,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') || 'late_fine_settings';

    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      let defaultValue: any = null;
      if (key === 'late_fine_settings') {
        defaultValue = DEFAULT_FINE_SETTINGS;
      } else if (key === 'access_control_settings') {
        defaultValue = DEFAULT_ACCESS_CONTROL_SETTINGS;
      }

      return NextResponse.json({
        key,
        value: defaultValue,
      });
    }

    try {
      const parsed = JSON.parse(setting.value);
      return NextResponse.json({ key, value: parsed });
    } catch {
      return NextResponse.json({ key, value: setting.value });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal memuat pengaturan sistem' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key dan value pengaturan wajib disertakan.' },
        { status: 400 }
      );
    }

    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    const updated = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: stringValue },
      create: { key, value: stringValue },
    });

    return NextResponse.json({
      success: true,
      key: updated.key,
      value: typeof value === 'string' ? updated.value : JSON.parse(updated.value),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan pengaturan sistem' },
      { status: 500 }
    );
  }
}
