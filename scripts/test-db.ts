import { PrismaClient } from '@prisma/client';

async function test() {
  const pDirect = new PrismaClient({
    datasourceUrl: 'postgresql://neondb_owner:npg_Lx21QSkbcejM@ep-fancy-haze-b47y1lvm.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require',
  });
  console.log('Testing DIRECT...');
  const countDirect = await pDirect.user.count();
  console.log('DIRECT SUCCESS, user count:', countDirect);
  await pDirect.$disconnect();

  const pPooler = new PrismaClient({
    datasourceUrl: 'postgresql://neondb_owner:npg_Lx21QSkbcejM@ep-fancy-haze-b47y1lvm-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require',
  });
  console.log('Testing POOLER without channel_binding...');
  const countPooler = await pPooler.user.count();
  console.log('POOLER SUCCESS, user count:', countPooler);
  await pPooler.$disconnect();
}

test().catch(console.error);
