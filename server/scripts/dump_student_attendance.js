const { prisma } = require('../build/db/prisma-client');

async function run() {
  const attendanceId = process.argv[2];
  const section = process.argv[3] || undefined;

  if (!attendanceId) {
    console.error('Usage: node dump_student_attendance.js <attendanceId> [section]');
    process.exit(1);
  }

  const records = await prisma.studentAttendance.findMany({
    where: {
      attendance_id: attendanceId,
      ...(section ? { section } : {}),
    },
    include: {
      student: {
        include: {
          courses: {
            include: {
              course: true,
            }
          }
        }
      },
      attendance: true,
    },
  });

  console.log(JSON.stringify(records, null, 2));
  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
