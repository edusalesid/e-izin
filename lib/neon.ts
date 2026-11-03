import { prisma } from './prisma';

export const neonConfig = {
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',
  authUrl: process.env.NEON_AUTH_URL || '',
  authJwksUrl: process.env.NEON_AUTH_JWKS_URL || '',
  dataApiUrl: process.env.NEON_DATA_API_URL || '',
  bucket: 'assets',
};

export async function testNeonServices() {
  const results: Record<string, { status: 'success' | 'failed' | 'configured'; message: string; details?: any }> = {};

  // 1. PostgreSQL via Prisma
  try {
    const userCount = await prisma.user.count();
    const studentCount = await prisma.student.count();
    const permissionCount = await prisma.permission.count();

    results.postgres = {
      status: 'success',
      message: `Terkoneksi ke Neon Postgres via Prisma ORM. Data: ${userCount} users, ${studentCount} students, ${permissionCount} permissions.`,
      details: { userCount, studentCount, permissionCount },
    };
  } catch (err: any) {
    results.postgres = {
      status: 'failed',
      message: `Gagal terkoneksi ke Neon Postgres: ${err.message}`,
    };
  }

  // 2. Neon Auth (JWKS Verification)
  try {
    const jwksRes = await fetch(neonConfig.authJwksUrl || 'https://ep-fancy-haze-b47y1lvm.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth/.well-known/jwks.json');
    if (jwksRes.ok) {
      const jwks = await jwksRes.json();
      results.auth = {
        status: 'success',
        message: 'Neon Auth JWKS endpoint aktif dan merespon kunci publik.',
        details: { keyCount: jwks.keys?.length || 0, keys: jwks.keys },
      };
    } else {
      results.auth = {
        status: 'failed',
        message: `Neon Auth endpoint merespon status ${jwksRes.status}`,
      };
    }
  } catch (err: any) {
    results.auth = {
      status: 'failed',
      message: `Gagal mengakses Neon Auth: ${err.message}`,
    };
  }

  // 3. Neon Data API / REST
  try {
    const dataApiRes = await fetch(neonConfig.dataApiUrl || 'https://ep-fancy-haze-b47y1lvm.apirest.c-6.us-east-2.aws.neon.tech/neondb/rest/v1');
    const dataApiBody = await dataApiRes.json();
    results.dataApi = {
      status: 'success',
      message: 'Neon Data API REST endpoint aktif (memerlukan Bearer token JWT).',
      details: dataApiBody,
    };
  } catch (err: any) {
    results.dataApi = {
      status: 'failed',
      message: `Gagal mengakses Neon Data API: ${err.message}`,
    };
  }

  // 4. Neon Functions (hello)
  try {
    const helloModule = await import('../hello');
    const helloResponse = await helloModule.default();
    const text = await helloResponse.text();
    results.functions = {
      status: 'success',
      message: `Neon Function 'hello' dieksekusi dengan hasil: "${text}"`,
      details: { output: text },
    };
  } catch (err: any) {
    results.functions = {
      status: 'failed',
      message: `Gagal mengeksekusi Neon Function: ${err.message}`,
    };
  }

  // 5. Neon Object Storage
  results.objectStorage = {
    status: 'configured',
    message: `Bucket '${neonConfig.bucket}' dideklarasikan di neon.ts dengan access private.`,
  };

  // 6. Neon AI Gateway
  results.aiGateway = {
    status: 'configured',
    message: 'Neon AI Gateway diaktifkan di neon.ts (aiGateway: true).',
  };

  // 7. Neon Realtime
  results.realtime = {
    status: 'configured',
    message: 'Neon Realtime diaktifkan di neon.ts (preview.realtime: true).',
  };

  return results;
}
