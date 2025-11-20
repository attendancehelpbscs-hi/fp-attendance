// Save this as: server/clear-fingerprint.js
// Run with: node clear-fingerprint.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearFingerprint() {
  try {
    const studentId = 'faa2074a-0550-481d-af7c-8d29f7d1d914';
    
    console.log('\n=== Clearing Corrupted Fingerprint ===');
    console.log('Student ID:', studentId);
    
    // First check if student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true, matric_no: true }
    });
    
    if (!student) {
      console.log('\n❌ Student not found!');
      return;
    }
    
    console.log('Student Name:', student.name);
    console.log('Matric No:', student.matric_no);
    
    // Clear all fingerprint fields
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        fingerprint: null,
        encrypted_fingerprint: null,
        fingerprint_hash: null
      }
    });
    
    console.log('\n✅ Fingerprint data cleared successfully!');
    console.log('\n=== Next Steps ===');
    console.log('1. Go to your enrollment page');
    console.log('2. Find student:', student.name, '(' + student.matric_no + ')');
    console.log('3. Enroll their fingerprint again');
    console.log('4. Test at the attendance kiosk');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

clearFingerprint();