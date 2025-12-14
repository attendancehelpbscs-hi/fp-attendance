const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const prisma = new PrismaClient();
  try {
    const hashedPassword = await bcrypt.hash('23Emthjw9Hi', 10);
    const admin = await prisma.staff.upsert({
      where: { email: 'bsces.dmin.fp@gmail.com' },
      update: {},
      create: {
        name: 'Admin',
        email: 'bsces.dmin.fp@gmail.com',
        password: hashedPassword,
        fingerprint: null, // Optional fingerprint field
        grace_period_minutes: 15,
        school_start_time: '08:00',
        late_threshold_hours: 1,
        created_at: new Date(),
      },
    });
    console.log('Admin created or updated:', admin);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
