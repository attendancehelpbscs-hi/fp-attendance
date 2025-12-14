import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import type { Student, StudentCourse, Course, Fingerprint, FingerType } from '@prisma/client';
import { PrismaBatchPayload } from '../interfaces/helper.interface';
import { encryptFingerprint, generateFingerprintHash, handleFingerprintData } from '../helpers/fingerprint-security.helper';
import { createAuditLog } from './audit.service';
import { createHash } from 'crypto';

export const saveStudentToDb = (student: Omit<Student, 'id'>): Promise<Student> => {
  return new Promise<Student>(async (resolve, reject) => {
    try {
      let fingerprintData = student.fingerprint;
      let fingerprintHash: string | undefined;
      let encryptedFingerprint: string | undefined;

      if (fingerprintData) {
        try {
          const encrypted = encryptFingerprint(fingerprintData);
          fingerprintHash = encrypted.hash;
          encryptedFingerprint = JSON.stringify({
            encryptedData: encrypted.encryptedData,
            iv: encrypted.iv,
            tag: encrypted.tag
          });
        } catch (encryptionError) {
          console.error('Fingerprint encryption failed:', encryptionError);
        }
      }

      const { staff_id, ...studentData } = student;

      const savedStudent = await prisma.student.create({
        data: {
          ...studentData,
          staff: {
            connect: { id: staff_id }
          },
          fingerprint_hash: fingerprintHash,
          encrypted_fingerprint: encryptedFingerprint,
        },
      });

      if (fingerprintData && encryptedFingerprint) {
        await createAuditLog(staff_id, 'FINGERPRINT_ENCRYPTED', `Student ${savedStudent.matric_no} fingerprint encrypted`);
      }

      resolve(savedStudent);
    } catch (err) {
      reject(err);
    }
  });
};

export const saveStudentCoursesToDb = (studentCourseInfoArray: StudentCourse[]): Promise<PrismaBatchPayload> => {
  return new Promise<PrismaBatchPayload>(async (resolve, reject) => {
    try {
      const batchPayload = await prisma.studentCourse.createMany({
        data: studentCourseInfoArray,
        skipDuplicates: true,
      });
      resolve(batchPayload);
    } catch (err) {
      reject(err);
    }
  });
};

export const removeAllStudentCoursesToDb = (student_id: string): Promise<PrismaBatchPayload> => {
  return new Promise<PrismaBatchPayload>(async (resolve, reject) => {
    try {
      const batchPayload = await prisma.studentCourse.deleteMany({
        where: {
          student_id,
        },
      });
      resolve(batchPayload);
    } catch (err) {
      reject(err);
    }
  });
};

export const getStudentCourses = (
  student_id: string,
): Promise<
  (StudentCourse & {
    course: Course;
  })[]
> => {
  return new Promise<
    (StudentCourse & {
      course: Course;
    })[]
  >(async (resolve, reject) => {
    try {
      const studentCourses = await prisma.studentCourse.findMany({
        where: {
          student_id,
        },
        include: {
          course: true,
        },
      });
      resolve(studentCourses);
    } catch (err) {
      reject(err);
    }
  });
};

export const getStudentsCourses = (
  student_ids: string[],
): Promise<
  (StudentCourse & {
    course: Course;
  })[]
> => {
  return new Promise<
    (StudentCourse & {
      course: Course;
    })[]
  >(async (resolve, reject) => {
    try {
      const studentsCourses = await prisma.studentCourse.findMany({
        where: {
          OR: student_ids.map((student_id) => ({
            student_id,
          })),
        },
        include: {
          course: true,
        },
      });
      resolve(studentsCourses);
    } catch (err) {
      reject(err);
    }
  });
};

export const removeStudentFromDb = (studentId: string): Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      await prisma.$transaction(async (tx) => {
        // Delete all fingerprints first
        await tx.fingerprint.deleteMany({
          where: {
            student_id: studentId,
          },
        });

        // Delete all StudentAttendance records
        await tx.studentAttendance.deleteMany({
          where: {
            student_id: studentId,
          },
        });

        // Delete all StudentCourse records
        await tx.studentCourse.deleteMany({
          where: {
            student_id: studentId,
          },
        });

        // Finally, delete the student
        await tx.student.delete({
          where: {
            id: studentId,
          },
        });
      });

      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
};

// ============================================================================
// NEW: Multi-Fingerprint Enrollment Service Methods
// ============================================================================

/**
 * Add a new fingerprint for a student
 */
export const addStudentFingerprint = (studentId: string, fingerprint: string, fingerType: string): Promise<Fingerprint> => {
  return new Promise<Fingerprint>(async (resolve, reject) => {
    try {
      let fingerprintHash: string | undefined;
      let encryptedFingerprint: string | undefined;

      // Encrypt fingerprint
      try {
        const encrypted = encryptFingerprint(fingerprint);
        fingerprintHash = encrypted.hash;
        encryptedFingerprint = JSON.stringify({
          encryptedData: encrypted.encryptedData,
          iv: encrypted.iv,
          tag: encrypted.tag
        });
      } catch (encryptionError) {
        console.error('Fingerprint encryption failed:', encryptionError);
        // Continue without encryption but log the error
      }

      const newFingerprint = await prisma.fingerprint.create({
        data: {
          student_id: studentId,
          fingerprint: fingerprint, // Legacy field
          fingerprint_hash: fingerprintHash,
          encrypted_fingerprint: encryptedFingerprint,
          finger_type: fingerType as FingerType,
        }
      });

      // Get student info for audit log
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { staff_id: true }
      });

      if (student) {
        await createAuditLog(student.staff_id, 'FINGERPRINT_ADDED', `Added ${fingerType} fingerprint for student ${studentId}`);
      }

      resolve(newFingerprint);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Get all fingerprints for a student
 */
export const getStudentFingerprints = (studentId: string): Promise<Fingerprint[]> => {
  return new Promise<Fingerprint[]>(async (resolve, reject) => {
    try {
      const fingerprints = await prisma.fingerprint.findMany({
        where: { student_id: studentId },
        orderBy: { created_at: 'asc' }
      });
      resolve(fingerprints);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Delete a specific fingerprint
 */
export const deleteStudentFingerprintService = (fingerprintId: string): Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      // Get fingerprint info for audit log before deleting
      const fingerprint = await prisma.fingerprint.findUnique({
        where: { id: fingerprintId },
        include: {
          student: {
            select: {
              staff_id: true,
              id: true
            }
          }
        }
      });

      if (!fingerprint) {
        throw new Error('Fingerprint not found');
      }

      // Delete the fingerprint
      await prisma.fingerprint.delete({
        where: { id: fingerprintId }
      });

      // Audit log
      await createAuditLog(
        fingerprint.student.staff_id, 
        'FINGERPRINT_DELETED', 
        `Deleted ${fingerprint.finger_type} fingerprint for student ${fingerprint.student.id}`
      );

      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Check if a fingerprint is unique across all enrolled fingerprints
 */
export const isFingerprintUnique = (fingerprint: string, excludeStudentId?: string): Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      const hash = createHash('sha256').update(fingerprint).digest('hex');
      
      const existing = await prisma.fingerprint.findFirst({
        where: {
          fingerprint_hash: hash,
          ...(excludeStudentId ? {
            student: {
              id: { not: excludeStudentId }
            }
          } : {})
        }
      });

      resolve(!existing);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateStudentInDb = (id: string, newUpdate: Partial<Student>): Promise<Student> => {
  return new Promise<Student>(async (resolve, reject) => {
    try {
      let updateData = { ...newUpdate };
      let fingerprintHash: string | undefined;
      let encryptedFingerprint: string | undefined;

      if (newUpdate.fingerprint) {
        try {
          const encrypted = encryptFingerprint(newUpdate.fingerprint);
          fingerprintHash = encrypted.hash;
          encryptedFingerprint = JSON.stringify({
            encryptedData: encrypted.encryptedData,
            iv: encrypted.iv,
            tag: encrypted.tag
          });
          updateData.fingerprint_hash = fingerprintHash;
          updateData.encrypted_fingerprint = encryptedFingerprint;
          updateData.fingerprint = newUpdate.fingerprint;
        } catch (encryptionError) {
          console.error('Fingerprint encryption failed during update:', encryptionError);
          updateData.fingerprint = newUpdate.fingerprint;
        }
      }

      const student = await prisma.student.update({
        where: { id },
        data: updateData,
        include: { fingerprints: true }
      });

      if (newUpdate.fingerprint && encryptedFingerprint) {
        await createAuditLog(student.staff_id, 'FINGERPRINT_ENCRYPTED', `Student ${student.matric_no} fingerprint updated and encrypted`);
      }

      resolve(student);
    } catch (err) {
      reject(err);
    }
  });
};

export const checkIfStudentExists = (matric_no: string): Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      const student = await prisma.student.findUnique({
        where: {
          matric_no,
        },
        select: {
          id: true,
        },
      });
      if (student) resolve(true);
      resolve(false);
    } catch (err) {
      reject(err);
    }
  });
};