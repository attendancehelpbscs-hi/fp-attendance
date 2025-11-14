const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearFingerprint() {
  await prisma.staff.update({
    where: { id: 'admin-uuid-12345' },
    data: { fingerprint: null }
  });
  console.log('Fingerprint cleared!');
  await prisma.$disconnect();
}

clearFingerprint();