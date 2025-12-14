// Save this as: server/check-specific-student.js
// Run with: node check-specific-student.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStudent() {
  try {
    const studentId = 'faa2074a-0550-481d-af7c-8d29f7d1d914';
    
    console.log('\n=== Checking Specific Student ===');
    console.log('Student ID:', studentId);
    
    const student = await prisma.student.findUnique({
      where: {
        id: studentId
      },
      select: {
        id: true,
        name: true,
        matric_no: true,
        staff_id: true,
        fingerprint: true,
        encrypted_fingerprint: true,
        fingerprint_hash: true,
        created_at: true
      }
    });
    
    if (!student) {
      console.log('\n❌ Student not found!');
      return;
    }
    
    console.log('\n=== Student Found ===');
    console.log('  Name:', student.name);
    console.log('  Matric No:', student.matric_no);
    console.log('  Staff ID:', student.staff_id);
    console.log('  Created:', student.created_at);
    console.log('\n=== Fingerprint Data ===');
    console.log('  Legacy Fingerprint:', student.fingerprint ? `${student.fingerprint.length} chars` : '❌ NULL');
    console.log('  Encrypted Fingerprint:', student.encrypted_fingerprint ? `${student.encrypted_fingerprint.length} chars` : '❌ NULL');
    console.log('  Fingerprint Hash:', student.fingerprint_hash ? '✅ Present' : '❌ NULL');
    
    // Check if fingerprint data looks valid
    if (student.fingerprint) {
      try {
        const buffer = Buffer.from(student.fingerprint, 'base64');
        console.log('  Legacy fingerprint decodes to:', buffer.length, 'bytes');
        
        // Check PNG header
        const pngHeader = buffer.slice(0, 8);
        const expectedHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        if (pngHeader.equals(expectedHeader)) {
          console.log('  PNG header: ✅ Valid');
        } else {
          console.log('  PNG header: ❌ Invalid - Data is corrupted!');
        }
      } catch (error) {
        console.log('  ❌ Failed to decode base64:', error.message);
      }
    }
    
    console.log('\n=== Action Required ===');
    if (!student.fingerprint || student.fingerprint.length < 1000) {
      console.log('❌ Student needs fingerprint enrollment!');
      console.log('   Go to enrollment page and scan their fingerprint.');
    } else {
      console.log('⚠️  Fingerprint data exists but appears corrupted.');
      console.log('   Recommendation: Delete and re-enroll fingerprint.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStudent();