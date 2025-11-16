import { prisma } from '../db/prisma-client';
import { encryptFingerprint, handleFingerprintData } from '../helpers/fingerprint-security.helper';
import logger from '../helpers/logger.helper';
import { createAuditLog } from './audit.service';

/**
 * Migration service for encrypting existing unencrypted fingerprint data
 */
export class FingerprintMigrationService {
  private static readonly BATCH_SIZE = 10;
  private static readonly MIGRATION_STATUS_KEY = 'fingerprint_migration_status';

  /**
   * Get current migration status
   */
  static async getMigrationStatus() {
    try {
      // Note: systemSetting model doesn't exist in schema, using a simple in-memory approach for now
      // In a real implementation, you'd need to add a SystemSetting model to the schema
      return { completed: false, progress: 0, total: 0 };
    } catch (error) {
      logger.error('Error getting migration status:', error as Error);
      return { completed: false, progress: 0, total: 0 };
    }
  }

  /**
   * Update migration status
   */
  private static async updateMigrationStatus(status: { completed: boolean; progress: number; total: number; lastProcessedId?: string }) {
    try {
      // Note: systemSetting model doesn't exist in schema, using a simple in-memory approach for now
      // In a real implementation, you'd need to add a SystemSetting model to the schema
      logger.info('Migration status update:', status);
    } catch (error) {
      logger.error('Error updating migration status:', error as Error);
    }
  }

  /**
   * Migrate student fingerprints in batches
   */
  static async migrateStudentFingerprints(): Promise<{ success: boolean; message: string }> {
    try {
      const status = await this.getMigrationStatus();
      if (status.completed) {
        return { success: true, message: 'Student fingerprint migration already completed' };
      }

      // Get total count of students with unencrypted fingerprints
      const totalStudents = await prisma.student.count({
        where: {
          fingerprint: { not: null as any },
          encrypted_fingerprint: { equals: null }
        }
      });

      if (totalStudents === 0) {
        await this.updateMigrationStatus({ completed: true, progress: 0, total: 0 });
        return { success: true, message: 'No student fingerprints to migrate' };
      }

      let processed = status.progress || 0;
      let lastId = '';

      while (processed < totalStudents) {
        // Get batch of students
        const students = await prisma.student.findMany({
          where: {
            fingerprint: { not: null as any },
            encrypted_fingerprint: { equals: null },
            ...(lastId ? { id: { gt: lastId } } : {})
          },
          select: { id: true, fingerprint: true },
          orderBy: { id: 'asc' },
          take: this.BATCH_SIZE
        });

        if (students.length === 0) break;

        // Process each student
        for (const student of students) {
          try {
            if (student.fingerprint) {
              const encrypted = encryptFingerprint(student.fingerprint);
              await prisma.student.update({
                where: { id: student.id },
                data: {
                  fingerprint_hash: encrypted.hash,
                  encrypted_fingerprint: JSON.stringify({
                    encryptedData: encrypted.encryptedData,
                    iv: encrypted.iv,
                    tag: encrypted.tag
                  })
                }
              });

              // Audit log for migration
              await createAuditLog('system', 'FINGERPRINT_MIGRATED', `Student ${student.id} fingerprint migrated to encrypted storage`);
            }
          } catch (error) {
            logger.error(`Error migrating student ${student.id}:`, error as Error);
            // Continue with next student
          }
        }

        processed += students.length;
        lastId = students[students.length - 1].id;

        // Update progress
        await this.updateMigrationStatus({
          completed: false,
          progress: processed,
          total: totalStudents,
          lastProcessedId: lastId
        });

        logger.info(`Migrated ${processed}/${totalStudents} student fingerprints`);
      }

      // Mark as completed
      await this.updateMigrationStatus({ completed: true, progress: processed, total: totalStudents });

      return { success: true, message: `Successfully migrated ${processed} student fingerprints` };
    } catch (error) {
      logger.error('Error during student fingerprint migration:', error as Error);
      return { success: false, message: `Migration failed: ${(error as Error).message}` };
    }
  }

  /**
   * Migrate staff fingerprints in batches
   */
  static async migrateStaffFingerprints(): Promise<{ success: boolean; message: string }> {
    try {
      const status = await this.getMigrationStatus();
      if (status.completed) {
        return { success: true, message: 'Staff fingerprint migration already completed' };
      }

      // Get total count of staff with unencrypted fingerprints
      const totalStaff = await prisma.staff.count({
        where: {
          fingerprint: { not: null as any },
          encrypted_fingerprint: { equals: null }
        }
      });

      if (totalStaff === 0) {
        return { success: true, message: 'No staff fingerprints to migrate' };
      }

      let processed = 0;
      let lastId = '';

      while (processed < totalStaff) {
        // Get batch of staff
        const staff = await prisma.staff.findMany({
          where: {
            fingerprint: { not: null as any },
            encrypted_fingerprint: { equals: null },
            ...(lastId ? { id: { gt: lastId } } : {})
          },
          select: { id: true, fingerprint: true },
          orderBy: { id: 'asc' },
          take: this.BATCH_SIZE
        });

        if (staff.length === 0) break;

        // Process each staff member
        for (const member of staff) {
          try {
            if (member.fingerprint) {
              const encrypted = encryptFingerprint(member.fingerprint);
              await prisma.staff.update({
                where: { id: member.id },
                data: {
                  fingerprint_hash: encrypted.hash,
                  encrypted_fingerprint: JSON.stringify({
                    encryptedData: encrypted.encryptedData,
                    iv: encrypted.iv,
                    tag: encrypted.tag
                  })
                }
              });

              // Audit log for migration
              await createAuditLog('system', 'FINGERPRINT_MIGRATED', `Staff ${member.id} fingerprint migrated to encrypted storage`);
            }
          } catch (error) {
            logger.error(`Error migrating staff ${member.id}:`, error as Error);
            // Continue with next staff member
          }
        }

        processed += staff.length;
        lastId = staff[staff.length - 1].id;

        logger.info(`Migrated ${processed}/${totalStaff} staff fingerprints`);
      }

      return { success: true, message: `Successfully migrated ${processed} staff fingerprints` };
    } catch (error) {
      logger.error('Error during staff fingerprint migration:', error as Error);
      return { success: false, message: `Migration failed: ${(error as Error).message}` };
    }
  }

  /**
   * Run complete migration for both students and staff
   */
  static async runCompleteMigration(): Promise<{ success: boolean; message: string }> {
    try {
      logger.info('Starting complete fingerprint migration...');

      const studentResult = await this.migrateStudentFingerprints();
      const staffResult = await this.migrateStaffFingerprints();

      const success = studentResult.success && staffResult.success;
      const message = `Migration completed. Students: ${studentResult.message}. Staff: ${staffResult.message}`;

      if (success) {
        logger.info('Fingerprint migration completed successfully');
      } else {
        logger.error('Fingerprint migration completed with errors');
      }

      return { success, message };
    } catch (error) {
      logger.error('Error during complete migration:', error as Error);
      return { success: false, message: `Complete migration failed: ${(error as Error).message}` };
    }
  }

  /**
   * Verify migration integrity - check that all fingerprints have proper encryption
   */
  static async verifyMigrationIntegrity(): Promise<{ success: boolean; message: string; stats: any }> {
    try {
      const studentStats = await prisma.student.aggregate({
        where: { fingerprint: { not: null as any } },
        _count: true
      });

      const encryptedStudentStats = await prisma.student.aggregate({
        where: { encrypted_fingerprint: { not: null as any } },
        _count: true
      });

      const staffStats = await prisma.staff.aggregate({
        where: { fingerprint: { not: null as any } },
        _count: true
      });

      const encryptedStaffStats = await prisma.staff.aggregate({
        where: { encrypted_fingerprint: { not: null as any } },
        _count: true
      });

      const stats = {
        students: {
          total: studentStats._count,
          encrypted: encryptedStudentStats._count
        },
        staff: {
          total: staffStats._count,
          encrypted: encryptedStaffStats._count
        }
      };

      const allEncrypted = stats.students.total === stats.students.encrypted &&
                          stats.staff.total === stats.staff.encrypted;

      return {
        success: allEncrypted,
        message: allEncrypted ? 'All fingerprints are properly encrypted' : 'Some fingerprints are not yet encrypted',
        stats
      };
    } catch (error) {
      logger.error('Error verifying migration integrity:', error as Error);
      return { success: false, message: `Verification failed: ${(error as Error).message}`, stats: null };
    }
  }
}
