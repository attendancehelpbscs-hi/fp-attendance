/**
 * Background migration script to encrypt existing unencrypted fingerprints
 * Run this script to migrate legacy fingerprint data to the new encrypted format
 */

const { PrismaClient } = require('@prisma/client');
const { encryptFingerprint, generateFingerprintHash } = require('./src/helpers/fingerprint-security.helper');

const prisma = new PrismaClient();

async function migrateFingerprints() {
  console.log('Starting fingerprint migration...');

  try {
    // Migrate student fingerprints
    console.log('Migrating student fingerprints...');
    const students = await prisma.student.findMany({
      where: {
        fingerprint: {
          not: undefined,
        },
        encrypted_fingerprint: null, // Only migrate unencrypted ones
      },
      select: {
        id: true,
        fingerprint: true,
      },
    });

    console.log(`Found ${students.length} students with unencrypted fingerprints`);

    let studentSuccessCount = 0;
    let studentErrorCount = 0;

    for (const student of students) {
      try {
        // Use the helper to encrypt and hash the fingerprint
        const encryptedObj = encryptFingerprint(student.fingerprint);
        const hash = generateFingerprintHash(student.fingerprint);

        await prisma.student.update({
          where: { id: student.id },
          data: {
            encrypted_fingerprint: JSON.stringify(encryptedObj),
            fingerprint_hash: hash,
          },
        });
        studentSuccessCount++;
      } catch (error) {
        console.error(`Error migrating student ${student.id}:`, error.message);
        studentErrorCount++;
      }
    }

    console.log(`Student migration complete: ${studentSuccessCount} success, ${studentErrorCount} errors`);

    // Migrate staff fingerprints
    console.log('Migrating staff fingerprints...');
    const staff = await prisma.staff.findMany({
      where: {
        fingerprint: {
          not: undefined,
        },
        encrypted_fingerprint: null, // Only migrate unencrypted ones
      },
      select: {
        id: true,
        fingerprint: true,
      },
    });

    console.log(`Found ${staff.length} staff with unencrypted fingerprints`);

    let staffSuccessCount = 0;
    let staffErrorCount = 0;

    for (const staffMember of staff) {
      try {
        // Use the helper to encrypt and hash the fingerprint
        const encryptedObj = encryptFingerprint(staffMember.fingerprint);
        const hash = generateFingerprintHash(staffMember.fingerprint);

        await prisma.staff.update({
          where: { id: staffMember.id },
          data: {
            encrypted_fingerprint: JSON.stringify(encryptedObj),
            fingerprint_hash: hash,
          },
        });
        staffSuccessCount++;
      } catch (error) {
        console.error(`Error migrating staff ${staffMember.id}:`, error.message);
        staffErrorCount++;
      }
    }

    console.log(`Staff migration complete: ${staffSuccessCount} success, ${staffErrorCount} errors`);

    console.log('Fingerprint migration completed successfully!');
    console.log(`Total migrated: ${studentSuccessCount + staffSuccessCount} fingerprints`);
    console.log(`Total errors: ${studentErrorCount + staffErrorCount} fingerprints`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateFingerprints();
}

module.exports = { migrateFingerprints };
