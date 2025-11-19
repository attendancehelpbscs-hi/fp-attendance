import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { createSuccess } from '../helpers/http.helper';
import createError from 'http-errors';
import {
  removeStudentFromDb,
  saveStudentToDb,
  updateStudentInDb,
  saveStudentCoursesToDb,
  checkIfStudentExists,
  removeAllStudentCoursesToDb,
} from '../services/student.service';
import { prisma } from '../db/prisma-client';
import type { Student } from '@prisma/client';
import type { PaginationMeta } from '../interfaces/helper.interface';
import { getStudentCourses } from '../services/student.service';
import { handleFingerprintData } from '../helpers/fingerprint-security.helper';
import { markAbsentForStudent } from '../services/attendance.service';

export const getStudents = async (req: Request, res: Response, next: NextFunction) => {
  // get students that belongs to single staff
  const { staff_id } = req.params;
  const { per_page, page } = req.query;
  const user_id = (req.user as JwtPayload).id;
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (staff_id !== user_id) return next(new createError.Forbidden('Access denied'));
  if (!page) return next(new createError.BadRequest('Page is required'));
  try {
    const studentCount = await prisma.student.count({
      where: {
        staff_id,
      },
    });
    const perPage = Number(per_page) || 10;
    const students = await prisma.student.findMany({
      where: {
        staff_id,
      },
      skip: (Number(page) - 1) * perPage,
      take: perPage,
      orderBy: {
        created_at: 'desc',
      },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                course_name: true,
                course_code: true,
              },
            },
          },
        },
      },
    });
    const meta: PaginationMeta = {
      total_items: studentCount,
      total_pages: Math.ceil(studentCount / perPage) || 1,
      page: Number(page),
      per_page: perPage,
    };
    const studentToSend = students.map((item) => ({
      ...item,
      courses: item.courses.map((course) => course.course),
    }));
    return createSuccess(res, 200, 'Student fetched successfully', { students: studentToSend, meta });
  } catch (err) {
    return next(err);
  }
};

export const getSingleStudent = async (req: Request, res: Response, next: NextFunction) => {
  // get students that belongs to single staff
  const { id } = req.params;
  if (!id) return next(new createError.BadRequest('Student ID is required'));
  try {
    const student = await prisma.student.findUnique({
      where: {
        id,
      },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                course_name: true,
                course_code: true,
              },
            },
          },
        },
      },
    });
    if (!student) throw new createError.NotFound('Student not found');
    const studentToSend = student.courses.map((item) => item.course);
    return createSuccess(res, 200, 'Student fetched successfully', { student: studentToSend });
  } catch (err) {
    return next(err);
  }
};

export const createStudent = async (req: Request, res: Response, next: NextFunction) => {
  // create student
  const { name, matric_no, grade, fingerprint, courses, staff_id } = req.body as Pick<Student, 'name' | 'matric_no' | 'grade' | 'fingerprint' | 'staff_id'> & {
    courses: string[];
  };
  const user_id = (req.user as JwtPayload).id;

  if (!matric_no) {
    return next(createError(400, 'The matric_no field is required.'));
  }
  if (staff_id !== user_id) {
    return next(createError(403, 'Access denied'));
  }

  // Validate fingerprint data if provided
  if (fingerprint) {
    try {
      // Basic validation - check if it's a valid base64 string
      Buffer.from(fingerprint, 'base64');
    } catch (error) {
      return next(createError(400, 'Invalid fingerprint data provided.'));
    }
  }

  try {
    const studentExists = await checkIfStudentExists(matric_no);
    if (studentExists) {
      return next(
        createError(
          400,
          ...[
            {
              message: 'Student with the same ID number already exists.',
              errorType: 'STUDENT_ALREADY_EXISTS',
            },
          ],
        ),
      );
    }
    const newStudent = { staff_id, name, matric_no, grade, fingerprint, fingerprint_hash: null, encrypted_fingerprint: null, created_at: new Date() };
    const savedStudent = await saveStudentToDb(newStudent);
    await saveStudentCoursesToDb(courses.map((course_id) => ({ course_id, student_id: savedStudent.id })));

    // Mark student absent for AM and PM sessions on enrollment date
    const today = new Date().toISOString().split('T')[0];
    await markAbsentForStudent(savedStudent.id, today);

    const studentCourses = await getStudentCourses(savedStudent.id);
    return createSuccess(res, 200, 'Student created successfully', {
      student: { ...savedStudent, courses: studentCourses.map((item) => item.course) },
    });
  } catch (err) {
    return next(err);
  }
};

export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
  // update student
  const { id } = req.params;
  if (!id) return next(createError(400, 'No student ID provided'));
  const { courses, ...newUpdate } = req.body as Partial<Student> & { courses?: string[] };

  // Validate fingerprint data if provided
  if (newUpdate.fingerprint) {
    try {
      // Basic validation - check if it's a valid base64 string
      Buffer.from(newUpdate.fingerprint, 'base64');
    } catch (error) {
      return next(createError(400, 'Invalid fingerprint data provided.'));
    }
  }

  try {
    // Only update courses if provided
    if (courses !== undefined) {
      await removeAllStudentCoursesToDb(id);
      await saveStudentCoursesToDb(courses.map((course_id) => ({ course_id, student_id: id })));
    }
    const updatedStudent = await updateStudentInDb(id, newUpdate);
    const studentCourses = await getStudentCourses(id);
    return createSuccess(res, 200, 'Student updated successfully', {
      student: { ...updatedStudent, courses: studentCourses.map((item) => item.course) },
    });
  } catch (err) {
    return next(err);
  }
};

export const deleteStudent = async (req: Request, res: Response, next: NextFunction) => {
  // delete student
  const { id } = req.params;
  if (!id) return next(createError(400, 'No student ID provided'));
  try {
    await removeAllStudentCoursesToDb(id);
    await removeStudentFromDb(id);
    return createSuccess(res, 200, 'Student deleted successfully', { deleted: true });
  } catch (err) {
    return next(err);
  }
};

export const getStudentsFingerprints = async (req: Request, res: Response, next: NextFunction) => {
  // get students' fingerprints for identification
  const { staff_id } = req.params;
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  try {
    const students = await prisma.student.findMany({
      where: {
        staff_id,
      },
      select: {
        id: true,
        name: true,
        matric_no: true,
        grade: true,
        fingerprint: true,
        encrypted_fingerprint: true,
        fingerprint_hash: true,
        courses: {
          select: {
            course: {
              select: {
                course_code: true,
                course_name: true,
              },
            },
          },
        },
      },
    });

    const studentsWithCourses = students.map(student => {
      let fingerprintData = null;
      let isCorrupted = false;
      let needsMigration = false;

      // Try to handle fingerprint data, but don't filter out students if it fails
      try {
        const fingerprintResult = handleFingerprintData(
          student.fingerprint || undefined, 
          student.encrypted_fingerprint || undefined, 
          student.fingerprint_hash || undefined
        );

        fingerprintData = fingerprintResult.data;
        isCorrupted = fingerprintResult.isCorrupted;
        needsMigration = fingerprintResult.needsMigration;

        // If decryption failed but we have legacy fingerprint, use it directly
        if (!fingerprintData && student.fingerprint) {
          console.warn(`Using legacy fingerprint for student ${student.id} due to decryption failure`);
          fingerprintData = student.fingerprint;
          isCorrupted = false; // Mark as not corrupted since we can use legacy data
        }

      } catch (error) {
        console.error(`Error handling fingerprint data for student ${student.id}:`, error);
        
        // Fallback to legacy fingerprint if decryption fails
        if (student.fingerprint) {
          console.warn(`Falling back to legacy fingerprint for student ${student.id}`);
          fingerprintData = student.fingerprint;
          isCorrupted = false;
        }
      }

      // Log corruption detection
      if (isCorrupted) {
        console.error(`Corrupted fingerprint detected for student ${student.id}`);
      }

      return {
        id: student.id,
        name: student.name,
        matric_no: student.matric_no,
        grade: student.grade,
        fingerprint: fingerprintData,
        isCorrupted: isCorrupted,
        needsMigration: needsMigration,
        courses: student.courses.map(sc => sc.course),
      };
    }).filter(student => {
      // Only filter out students who have NO fingerprint data at all
      const hasFingerprint = student.fingerprint !== null && student.fingerprint !== undefined;
      
      if (!hasFingerprint) {
        console.warn(`Filtering out student ${student.id} - no fingerprint data available`);
      }
      
      return hasFingerprint;
    });

    console.log(`Returning ${studentsWithCourses.length} students with fingerprints out of ${students.length} total students`);

    return createSuccess(res, 200, 'Students fingerprints fetched successfully', { students: studentsWithCourses });
  } catch (err) {
    console.error('Error in getStudentsFingerprints:', err);
    return next(err);
  }
};