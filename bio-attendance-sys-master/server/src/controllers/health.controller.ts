import type { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { createSuccess } from '../helpers/http.helper';
import { prisma } from '../db/prisma-client';
import { handleFingerprintData } from '../helpers/fingerprint-security.helper';
import { sendFingerprintCorruptionAlert } from '../helpers/email.helper';
import logger from '../helpers/logger.helper';

/**
 * Check for fingerprint corruption by attempting to decrypt encrypted fingerprints
 */
const checkFingerprintCorruption = async () => {
  const result = {
    students: { total: 0, corrupted: 0 },
    staff: { total: 0, corrupted: 0 }
  };

  try {
    // Check student fingerprints
    const encryptedStudents = await prisma.student.findMany({
      where: {
        encrypted_fingerprint: { not: null },
        fingerprint_hash: { not: null }
      },
      select: {
        id: true,
        matric_no: true,
        encrypted_fingerprint: true,
        fingerprint_hash: true
      },
      take: 10 // Sample first 10 for performance
    });

    result.students.total = encryptedStudents.length;

    for (const student of encryptedStudents) {
      try {
        const fingerprintData = handleFingerprintData(
          undefined,
          student.encrypted_fingerprint || undefined,
          student.fingerprint_hash || undefined
        );

        if (fingerprintData.isCorrupted) {
          result.students.corrupted++;
          logger.info(`Corrupted fingerprint detected for student ${student.matric_no} (ID: ${student.id})`);
        }
      } catch (error) {
        result.students.corrupted++;
        logger.error(`Error checking student ${student.matric_no}:`, error);
      }
    }

    // Check staff fingerprints
    const encryptedStaff = await prisma.staff.findMany({
      where: {
        encrypted_fingerprint: { not: null },
        fingerprint_hash: { not: null }
      },
      select: {
        id: true,
        email: true,
        encrypted_fingerprint: true,
        fingerprint_hash: true
      },
      take: 10 // Sample first 10 for performance
    });

    result.staff.total = encryptedStaff.length;

    for (const staff of encryptedStaff) {
      try {
        const fingerprintData = handleFingerprintData(
          undefined,
          staff.encrypted_fingerprint || undefined,
          staff.fingerprint_hash || undefined
        );

        if (fingerprintData.isCorrupted) {
          result.staff.corrupted++;
          logger.info(`Corrupted fingerprint detected for staff ${staff.email} (ID: ${staff.id})`);
        }
      } catch (error) {
        result.staff.corrupted++;
        logger.error(`Error checking staff ${staff.email}:`, error);
      }
    }
  } catch (error) {
    logger.error('Error during fingerprint corruption check:', error);
  }

  return result;
};

/**
 * Send corruption alerts via email
 */
const sendCorruptionAlerts = async (corruptionCheck: any) => {
  try {
    // Get admin emails for alerts
    const admins = await prisma.staff.findMany({
      where: {
        email: {
          in: ['admin@school.edu', 'superadmin@school.edu'] // Use specific admin emails
        }
      },
      select: {
        email: true,
        name: true
      }
    });

    if (admins.length === 0) {
      logger.info('No admin users found to send corruption alerts');
      return;
    }

    // Send alerts for student corruption
    if (corruptionCheck.students.corrupted > 0) {
      const riskLevel = getRiskLevel(corruptionCheck.students.corrupted, corruptionCheck.students.total);

      for (const admin of admins) {
        await sendFingerprintCorruptionAlert(admin.email, {
          type: 'student',
          identifier: 'Sample Check',
          corruptionCount: corruptionCheck.students.corrupted,
          totalCount: corruptionCheck.students.total,
          riskLevel
        });
      }
    }

    // Send alerts for staff corruption
    if (corruptionCheck.staff.corrupted > 0) {
      const riskLevel = getRiskLevel(corruptionCheck.staff.corrupted, corruptionCheck.staff.total);

      for (const admin of admins) {
        await sendFingerprintCorruptionAlert(admin.email, {
          type: 'staff',
          identifier: 'Sample Check',
          corruptionCount: corruptionCheck.staff.corrupted,
          totalCount: corruptionCheck.staff.total,
          riskLevel
        });
      }
    }
  } catch (error) {
    logger.error('Error sending corruption alerts:', error);
  }
};

/**
 * Determine risk level based on corruption count and total
 */
const getRiskLevel = (corrupted: number, total: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (total === 0) return 'low';

  const percentage = (corrupted / total) * 100;

  if (percentage >= 50) return 'critical';
  if (percentage >= 25) return 'high';
  if (percentage >= 10) return 'medium';
  return 'low';
};

/**
 * Health check endpoint for data integrity monitoring
 */
export const getHealthStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const healthData = {
      timestamp: new Date().toISOString(),
      database: {
        status: 'unknown',
        connection: false,
      },
      fingerprint_integrity: {
        total_students: 0,
        encrypted_students: 0,
        corrupted_students: 0,
        total_staff: 0,
        encrypted_staff: 0,
        corrupted_staff: 0,
      },
    };

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      healthData.database.status = 'healthy';
      healthData.database.connection = true;
    } catch (dbError) {
      healthData.database.status = 'unhealthy';
      healthData.database.connection = false;
    }

    if (healthData.database.connection) {
      // Get student fingerprint statistics
      const studentStats = await prisma.student.groupBy({
        by: ['fingerprint', 'encrypted_fingerprint', 'fingerprint_hash'],
        _count: {
          id: true,
        },
        where: {
          fingerprint: {
            not: undefined,
          },
        },
      });

      healthData.fingerprint_integrity.total_students = studentStats.length;

      // Count encrypted students
      const encryptedStudents = await prisma.student.count({
        where: {
          encrypted_fingerprint: {
            not: undefined,
          },
          fingerprint_hash: {
            not: undefined,
          },
        },
      });
      healthData.fingerprint_integrity.encrypted_students = encryptedStudents;

      // Get staff fingerprint statistics
      const staffStats = await prisma.staff.groupBy({
        by: ['fingerprint', 'encrypted_fingerprint', 'fingerprint_hash'],
        _count: {
          id: true,
        },
        where: {
          fingerprint: {
            not: undefined,
          },
        },
      });

      healthData.fingerprint_integrity.total_staff = staffStats.length;

      // Count encrypted staff
      const encryptedStaff = await prisma.staff.count({
        where: {
          encrypted_fingerprint: {
            not: undefined,
          },
          fingerprint_hash: {
            not: undefined,
          },
        },
      });
      healthData.fingerprint_integrity.encrypted_staff = encryptedStaff;

      // Check for corruption by attempting to decrypt a sample of encrypted fingerprints
      const corruptionCheck = await checkFingerprintCorruption();
      healthData.fingerprint_integrity.corrupted_students = corruptionCheck.students.corrupted;
      healthData.fingerprint_integrity.corrupted_staff = corruptionCheck.staff.corrupted;

      // Send alerts if corruption detected
      if (corruptionCheck.students.corrupted > 0 || corruptionCheck.staff.corrupted > 0) {
        await sendCorruptionAlerts(corruptionCheck);
      }
    }

    // Determine overall health status
    const isHealthy =
      healthData.database.connection &&
      healthData.fingerprint_integrity.corrupted_students === 0 &&
      healthData.fingerprint_integrity.corrupted_staff === 0;

    const status = isHealthy ? 'healthy' : 'warning';

    return createSuccess(res, 200, 'Health check completed', {
      status,
      ...healthData,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get detailed corruption statistics
 */
export const getCorruptionStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get students with potential corruption (have fingerprint but no encryption)
    const unencryptedStudents = await prisma.student.count({
      where: {
        fingerprint: {
          not: undefined,
        },
        encrypted_fingerprint: null,
      },
    });

    // Get staff with potential corruption (have fingerprint but no encryption)
    const unencryptedStaff = await prisma.staff.count({
      where: {
        fingerprint: {
          not: undefined,
        },
        encrypted_fingerprint: null,
      },
    });

    // Get total counts
    const totalStudents = await prisma.student.count({
      where: {
        fingerprint: {
          not: undefined,
        },
      },
    });

    const totalStaff = await prisma.staff.count({
      where: {
        fingerprint: {
          not: undefined,
        },
      },
    });

    const stats = {
      timestamp: new Date().toISOString(),
      students: {
        total: totalStudents,
        unencrypted: unencryptedStudents,
        encrypted: totalStudents - unencryptedStudents,
        corruption_risk_percentage: totalStudents > 0 ? ((unencryptedStudents / totalStudents) * 100).toFixed(2) : '0.00',
      },
      staff: {
        total: totalStaff,
        unencrypted: unencryptedStaff,
        encrypted: totalStaff - unencryptedStaff,
        corruption_risk_percentage: totalStaff > 0 ? ((unencryptedStaff / totalStaff) * 100).toFixed(2) : '0.00',
      },
      recommendations: [] as string[],
    };

    // Add recommendations based on stats
    if (unencryptedStudents > 0 || unencryptedStaff > 0) {
      stats.recommendations.push('Run fingerprint migration script to encrypt legacy data');
    }

    const totalUnencrypted = unencryptedStudents + unencryptedStaff;
    const totalFingerprints = totalStudents + totalStaff;

    if (totalFingerprints > 0 && (totalUnencrypted / totalFingerprints) > 0.5) {
      stats.recommendations.push('High percentage of unencrypted fingerprints detected - prioritize migration');
    }

    return createSuccess(res, 200, 'Corruption statistics retrieved', stats);
  } catch (err) {
    return next(err);
  }
};
