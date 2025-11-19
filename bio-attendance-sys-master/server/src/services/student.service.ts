import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import type { Student, StudentCourse, Course } from '@prisma/client';
import { PrismaBatchPayload } from '../interfaces/helper.interface';
import { encryptFingerprint, generateFingerprintHash, handleFingerprintData } from '../helpers/fingerprint-security.helper';
import { createAuditLog } from './audit.service';

export const saveStudentToDb = (student: Omit<Student, 'id'>): Promise<Student> => {
  return new Promise<Student>(async (resolve, reject) => {
    try {
      let fingerprintData = student.fingerprint;
      let fingerprintHash: string | undefined;
      let encryptedFingerprint: string | undefined;

      // Encrypt fingerprint if provided
      if (fingerprintData) {
        try {
          const encrypted = encryptFingerprint(fingerprintData);
          fingerprintHash = encrypted.hash;
          encryptedFingerprint = JSON.stringify({
            encryptedData: encrypted.encryptedData,
            iv: encrypted.iv,
            tag: encrypted.tag
          });
          // Keep legacy field for backward compatibility during migration
        } catch (encryptionError) {
          console.error('Fingerprint encryption failed:', encryptionError);
          // Continue without encryption for now, but log the error
        }
      }

      const savedStudent = await prisma.student.create({
        data: {
          ...student,
          fingerprint_hash: fingerprintHash,
          encrypted_fingerprint: encryptedFingerprint,
        },
      });

      // Audit log for fingerprint encryption
      if (fingerprintData && encryptedFingerprint) {
        await createAuditLog(student.staff_id, 'FINGERPRINT_ENCRYPTED', `Student ${savedStudent.matric_no} fingerprint encrypted`);
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
        // First, delete all StudentAttendance records associated with this student
        await tx.studentAttendance.deleteMany({
          where: {
            student_id: studentId,
          },
        });

        // Then, delete all StudentCourse records associated with this student
        await tx.studentCourse.deleteMany({
          where: {
            student_id: studentId,
          },
        });

        // Finally, delete the student
        const res = await tx.student.delete({
          where: {
            id: studentId,
          },
        });

        if (!res) {
          throw new createError.NotFound('Student not found');
        }
      });

      resolve(true);
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

      // Encrypt fingerprint if being updated
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
          // Keep the legacy fingerprint field updated for backward compatibility
          updateData.fingerprint = newUpdate.fingerprint;
        } catch (encryptionError) {
          console.error('Fingerprint encryption failed during update:', encryptionError);
          // Continue without encryption for now, but log the error
          updateData.fingerprint = newUpdate.fingerprint;
        }
      }

      const student = await prisma.student.update({
        where: {
          id,
        },
        data: updateData,
      });

      // Audit log for fingerprint encryption update
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
