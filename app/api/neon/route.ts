import { NextResponse } from 'next/server';
import { testNeonServices } from '@/lib/neon';

export async function GET() {
  try {
    const services = await testNeonServices();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      services,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
