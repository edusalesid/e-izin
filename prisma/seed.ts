import { PrismaClient } from '@prisma/client';
import { INITIAL_USERS, INITIAL_CLASSROOMS, INITIAL_STUDENTS, INITIAL_PERMISSIONS } from '../lib/seed-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Neon Database via Prisma...');

  // 1. Users
  for (const u of INITIAL_USERS) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        role: u.role,
        phone: u.phone,
        pin: u.pin,
        classroomId: u.classroomId,
      },
      create: {
        id: u.id,
        username: u.username,
        name: u.name,
        role: u.role,
        phone: u.phone,
        pin: u.pin,
        classroomId: u.classroomId,
      },
    });
  }
  console.log(`✅ Users seeded (${INITIAL_USERS.length})`);

  // 2. Classrooms
  for (const c of INITIAL_CLASSROOMS) {
    await prisma.classroom.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        waliKelasId: c.waliKelasId,
        waliKelasName: c.waliKelasName,
        waliKelasPhone: c.waliKelasPhone,
      },
      create: {
        id: c.id,
        name: c.name,
        waliKelasId: c.waliKelasId,
        waliKelasName: c.waliKelasName,
        waliKelasPhone: c.waliKelasPhone,
      },
    });
  }
  console.log(`✅ Classrooms seeded (${INITIAL_CLASSROOMS.length})`);

  // 3. Students
  for (const s of INITIAL_STUDENTS) {
    await prisma.student.upsert({
      where: { nis: s.nis },
      update: {
        fullName: s.fullName,
        gender: s.gender,
        classroomId: s.classroomId,
        className: s.className,
        dormitory: s.dormitory,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
      },
      create: {
        id: s.id,
        nis: s.nis,
        fullName: s.fullName,
        gender: s.gender,
        classroomId: s.classroomId,
        className: s.className,
        dormitory: s.dormitory,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
      },
    });
  }
  console.log(`✅ Students seeded (${INITIAL_STUDENTS.length})`);

  // 4. Permissions
  for (const p of INITIAL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { id: p.id },
      update: {
        status: p.status,
        actualDeparture: p.actualDeparture,
        actualReturn: p.actualReturn,
      },
      create: {
        id: p.id,
        studentId: p.studentId,
        studentName: p.studentName,
        studentNis: p.studentNis,
        className: p.className,
        dormitory: p.dormitory,
        category: p.category,
        reason: p.reason,
        applicantType: p.applicantType,
        applicantId: p.applicantId,
        applicantName: p.applicantName,
        applicantPhone: p.applicantPhone,
        escortType: p.escortType,
        escortNote: p.escortNote,
        plannedDeparture: p.plannedDeparture,
        plannedReturn: p.plannedReturn,
        actualDeparture: p.actualDeparture,
        actualReturn: p.actualReturn,
        status: p.status,
        approvedById: p.approvedById,
        approvedByName: p.approvedByName,
        approvedAt: p.approvedAt,
        satpamDepartureId: p.satpamDepartureId,
        satpamDepartureName: p.satpamDepartureName,
        satpamReturnId: p.satpamReturnId,
        satpamReturnName: p.satpamReturnName,
        lateDurationMinutes: p.lateDurationMinutes || 0,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
    });
  }
  console.log(`✅ Permissions seeded (${INITIAL_PERMISSIONS.length})`);
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
