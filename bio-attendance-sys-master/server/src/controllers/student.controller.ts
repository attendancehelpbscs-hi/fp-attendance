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
  addStudentFingerprint,
  getStudentFingerprints as getStudentFingerprintsService,
  deleteStudentFingerprintService,
} from '../services/student.service';
import { prisma } from '../db/prisma-client';
import type { Student } from '@prisma/client';
import type { PaginationMeta } from '../interfaces/helper.interface';
import { getStudentCourses } from '../services/student.service';
import { handleFingerprintData } from '../helpers/fingerprint-security.helper';
import { markAbsentForStudent } from '../services/attendance.service';

// ============================================================================
// EXISTING CONTROLLER METHODS (keeping your original code)
// ============================================================================

export const getStudents = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { per_page, page } = req.query;
  const user_id = (req.user as JwtPayload).id;
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }
  if (!page) return next(new createError.BadRequest('Page is required'));
  try {
    // For admin users, fetch all students; for teachers, only their own
    const whereClause = currentUser.role === 'ADMIN' ? {} : { staff_id };

    const studentCount = await prisma.student.count({
      where: whereClause,
    });
    const perPage = Number(per_page) || 10;
    const students = await prisma.student.findMany({
      where: whereClause,
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
  const { name, matric_no, grade, fingerprint, courses, staff_id } = req.body as Pick<Student, 'name' | 'matric_no' | 'grade' | 'fingerprint' | 'staff_id'> & {
    courses: string[];
  };
  const user_id = (req.user as JwtPayload).id;

  // Get the current user's role and courses
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: {
      role: true,
      courses: {
        select: {
          grade: true,
          course_code: true
        },
        take: 1,
        orderBy: {
          created_at: 'desc'
        }
      }
    }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is a teacher (admins cannot create students)
  if (currentUser.role !== 'TEACHER') {
    return next(new createError.Forbidden('Only teachers can create students'));
  }

  if (!matric_no) {
    return next(createError(400, 'The matric_no field is required.'));
  }
  if (staff_id !== user_id) {
    return next(createError(403, 'Access denied'));
  }

  // For teachers, if grade is not provided, use their assigned grade
  let studentGrade = grade;
  if (!studentGrade && currentUser.role === 'TEACHER' && currentUser.courses.length > 0) {
    studentGrade = currentUser.courses[0].grade;
  }

  if (!studentGrade) {
    return next(createError(400, 'The grade field is required.'));
  }

  if (fingerprint) {
    try {
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
    const newStudent = { staff_id, name, matric_no, grade: studentGrade, fingerprint, fingerprint_hash: null, encrypted_fingerprint: null, created_at: new Date() };
    const savedStudent = await saveStudentToDb(newStudent);
    await saveStudentCoursesToDb(courses.map((course_id) => ({ course_id, student_id: savedStudent.id })));

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
  const { id } = req.params;
  if (!id) return next(createError(400, 'No student ID provided'));
  const { courses, ...newUpdate } = req.body as Partial<Student> & { courses?: string[] };
  const user_id = (req.user as JwtPayload).id;
  
  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });
  
  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }
  
  // Check if the user is a teacher (admins cannot update students)
  if (currentUser.role !== 'TEACHER') {
    return next(new createError.Forbidden('Only teachers can update students'));
  }
  
  // Check if the student belongs to the current teacher
  const student = await prisma.student.findUnique({
    where: { id },
    select: { staff_id: true }
  });
  
  if (!student) {
    return next(new createError.NotFound('Student not found'));
  }
  
  if (student.staff_id !== user_id) {
    return next(new createError.Forbidden('You can only update your own students'));
  }

  if (newUpdate.fingerprint) {
    try {
      Buffer.from(newUpdate.fingerprint, 'base64');

      const existingStudents = await prisma.student.findMany({
        where: {
          fingerprint: {
            not: null,
          },
          id: {
            not: id,
          },
        },
        select: {
          id: true,
          fingerprint: true,
        },
      });

      if (existingStudents.length > 0) {
        try {
          const formData = new FormData();
          const base64Data = newUpdate.fingerprint.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const uint8Array = new Uint8Array(buffer);

          formData.append('file', new Blob([uint8Array], { type: 'image/png' }), 'fingerprint.png');
          formData.append('staff_id', (req.user as JwtPayload).id);

          const response = await fetch('http://localhost:5050/identify/fingerprint', {
            method: 'POST',
            body: formData as any,
          });

          if (response.ok) {
            const result = await response.json();
            if (result.confidence > 70) {
              return next(createError(400, 'Fingerprint already enrolled for another student.'));
            }
          } else {
            console.warn('Failed to check fingerprint uniqueness, proceeding with update');
          }
        } catch (error) {
          console.error('Error checking for duplicate fingerprint:', error);
        }
      }
    } catch (error) {
      return next(createError(400, 'Invalid fingerprint data provided.'));
    }
  }

  try {
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
  const { id } = req.params;
  if (!id) return next(createError(400, 'No student ID provided'));
  const user_id = (req.user as JwtPayload).id;
  
  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });
  
  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }
  
  // Check if the user is a teacher (admins cannot delete students)
  if (currentUser.role !== 'TEACHER') {
    return next(new createError.Forbidden('Only teachers can delete students'));
  }
  
  // Check if the student belongs to the current teacher
  const student = await prisma.student.findUnique({
    where: { id },
    select: { staff_id: true }
  });
  
  if (!student) {
    return next(new createError.NotFound('Student not found'));
  }
  
  if (student.staff_id !== user_id) {
    return next(new createError.Forbidden('You can only delete your own students'));
  }
  
  try {
    await removeStudentFromDb(id);
    return createSuccess(res, 200, 'Student deleted successfully', { deleted: true });
  } catch (err) {
    return next(err);
  }
};

export const getStudentsFingerprints = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    console.log(`\n========================================`);
    console.log(`Fetching ALL fingerprints for staff_id: ${staff_id} (user role: ${currentUser.role})`);
    console.log(`========================================\n`);

    // For admin users, fetch all students; for teachers, only their own
    const whereClause = currentUser.role === 'ADMIN' ? {} : { staff_id };

    // Fetch ALL students with ALL their fingerprints
    const students = await prisma.student.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        matric_no: true,
        grade: true,
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
        // Include the new Fingerprint table entries
        fingerprints: {
          select: {
            id: true,
            fingerprint: true,
            encrypted_fingerprint: true,
            fingerprint_hash: true,
            finger_type: true,
          },
        },
      },
    });

    console.log(`Total students found: ${students.length}`);

    const allFingerprints = [];

    for (const student of students) {
      console.log(`\nProcessing student: ${student.id} (${student.name})`);
      console.log(`  - Enrolled fingerprints: ${student.fingerprints.length}`);

      // Process each fingerprint for this student
      for (const fp of student.fingerprints) {
        console.log(`  - Processing fingerprint: ${fp.id} (${fp.finger_type})`);

        let fingerprintData = null;

        try {
          if (fp.fingerprint || fp.encrypted_fingerprint) {
            const result = handleFingerprintData(
              fp.fingerprint || undefined,
              fp.encrypted_fingerprint || undefined,
              fp.fingerprint_hash || undefined
            );

            if (result.data) {
              fingerprintData = result.data;
              console.log(`    ✓ Successfully extracted fingerprint data`);

              if (result.isCorrupted) {
                console.warn(`    ⚠ Warning: Fingerprint may be corrupted`);
              }
            } else {
              console.warn(`    ✗ handleFingerprintData returned null`);
            }
          }

          // Fallback to direct access
          if (!fingerprintData && fp.fingerprint) {
            console.log(`    ↻ Attempting direct fingerprint field access...`);
            try {
              let cleanedData = fp.fingerprint.replace(/^data:image\/\w+;base64,/, '');
              Buffer.from(cleanedData, 'base64');
              fingerprintData = cleanedData;
              console.log(`    ✓ Successfully using direct fingerprint field`);
            } catch (directError) {
              console.error(`    ✗ Direct fingerprint access failed:`, directError);
            }
          }

          // Add to results if valid
          if (fingerprintData) {
            try {
              const buffer = Buffer.from(fingerprintData, 'base64');
              if (buffer.length > 0) {
                allFingerprints.push({
                  id: student.id,
                  name: student.name,
                  matric_no: student.matric_no,
                  grade: student.grade,
                  fingerprint: fingerprintData,
                  finger_type: fp.finger_type, // IMPORTANT: Include finger type
                  fingerprint_id: fp.id, // Include fingerprint ID for reference
                  courses: student.courses.map(sc => sc.course),
                });

                console.log(`    ✓✓ Fingerprint added to list (${fp.finger_type}, size: ${buffer.length} bytes)`);
              }
            } catch (validationError) {
              console.error(`    ✗ Final validation failed:`, validationError);
            }
          } else {
            console.warn(`    ✗ No valid fingerprint data could be extracted`);
          }

        } catch (error) {
          console.error(`    ✗✗ Error processing fingerprint ${fp.id}:`, error);
        }
      }
    }

    console.log(`\n========================================`);
    console.log(`SUMMARY:`);
    console.log(`  Total students: ${students.length}`);
    console.log(`  Total fingerprints collected: ${allFingerprints.length}`);
    console.log(`========================================\n`);

    if (allFingerprints.length === 0) {
      return createSuccess(res, 200, 'No students enrolled with fingerprints for this staff member', {
        students: [],
        meta: {
          total_items: 0,
          total_pages: 1,
          page: 1,
          per_page: 1000
        }
      });
    }

    return createSuccess(res, 200, 'All student fingerprints fetched successfully', {
      students: allFingerprints,
      meta: {
        total_items: allFingerprints.length,
        total_pages: 1,
        page: 1,
        per_page: 1000
      }
    });

  } catch (err) {
    console.error('\n✗✗✗ FATAL ERROR in getStudentsFingerprints:', err);
    return next(err);
  }
};

export const checkFingerprintUniqueness = async (req: Request, res: Response, next: NextFunction) => {
  const { fingerprint } = req.body;
  const user_id = (req.user as JwtPayload).id;

  if (!fingerprint) {
    return next(createError(400, 'Fingerprint data is required'));
  }

  try {
    Buffer.from(fingerprint, 'base64');
  } catch (error) {
    return next(createError(400, 'Invalid fingerprint data provided'));
  }

  try {
    const students = await prisma.student.findMany({
      where: {
        staff_id: user_id,
        fingerprint: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        matric_no: true,
        grade: true,
        fingerprint: true,
        encrypted_fingerprint: true,
        fingerprint_hash: true,
      },
    });

    if (students.length === 0) {
      return createSuccess(res, 200, 'Fingerprint is unique', {
        isUnique: true,
        message: 'No existing fingerprints to compare against'
      });
    }

    const studentsWithFingerprints = [];

    for (const student of students) {
      let fingerprintData = null;

      try {
        if (student.fingerprint || student.encrypted_fingerprint) {
          const result = handleFingerprintData(
            student.fingerprint || undefined,
            student.encrypted_fingerprint || undefined,
            student.fingerprint_hash || undefined
          );

          if (result.data) {
            fingerprintData = result.data;
          }
        }

        if (!fingerprintData && student.fingerprint) {
          let cleanedData = student.fingerprint.replace(/^data:image\/\w+;base64,/, '');
          Buffer.from(cleanedData, 'base64');
          fingerprintData = cleanedData;
        }

        if (fingerprintData) {
          studentsWithFingerprints.push({
            id: student.id,
            name: student.name,
            matric_no: student.matric_no,
            grade: student.grade,
            fingerprint: fingerprintData,
          });
        }
      } catch (error) {
        console.warn(`Skipping student ${student.id} due to fingerprint processing error:`, error);
      }
    }

    if (studentsWithFingerprints.length === 0) {
      return createSuccess(res, 200, 'Fingerprint is unique', {
        isUnique: true,
        message: 'No valid existing fingerprints to compare against'
      });
    }

    try {
      const formData = new FormData();
      const base64Data = fingerprint.split(',')[1] || fingerprint;
      const buffer = Buffer.from(base64Data, 'base64');
      const uint8Array = new Uint8Array(buffer);

      formData.append('file', new Blob([uint8Array], { type: 'image/png' }), 'fingerprint.png');
      formData.append('staff_id', user_id);

      const response = await fetch('http://localhost:5050/identify/fingerprint', {
        method: 'POST',
        body: formData as any,
      });

      if (response.ok) {
        const result = await response.json();
        const confidence = result.confidence || 0;

        console.log('Fingerprint check result:', { confidence, student_id: result.student_id });

        if (confidence > 70) {
          return createSuccess(res, 200, 'Fingerprint already exists', {
            isUnique: false,
            confidence,
            matchedStudent: {
              id: result.student_id,
              name: studentsWithFingerprints.find(s => s.id === result.student_id)?.name,
              matric_no: studentsWithFingerprints.find(s => s.id === result.student_id)?.matric_no,
            },
            message: `Fingerprint matches existing student with ${confidence.toFixed(1)}% confidence`
          });
        } else {
          return createSuccess(res, 200, 'Fingerprint is unique', {
            isUnique: true,
            confidence,
            message: `Fingerprint is unique (best match: ${confidence.toFixed(1)}% confidence)`
          });
        }
      } else {
        console.warn('Python server returned error, assuming fingerprint is unique');
        return createSuccess(res, 200, 'Fingerprint is unique', {
          isUnique: true,
          message: 'Unable to verify uniqueness, proceeding with caution'
        });
      }
    } catch (error) {
      console.error('Error calling Python server for fingerprint check:', error);
      return createSuccess(res, 200, 'Fingerprint is unique', {
        isUnique: true,
        message: 'Unable to verify uniqueness due to server error, proceeding with caution'
      });
    }

  } catch (err) {
    console.error('Error in checkFingerprintUniqueness:', err);
    return next(err);
  }
};

// ============================================================================
// NEW: Multi-Fingerprint Enrollment Controller Methods
// ============================================================================

/**
 * Get all enrolled fingerprints for a specific student
 */
export const getStudentFingerprints = async (req: Request, res: Response, next: NextFunction) => {
  const { student_id } = req.params;

  if (!student_id) {
    return next(createError(400, 'Student ID is required'));
  }

  try {
    const fingerprints = await getStudentFingerprintsService(student_id);

    // Return fingerprints without the actual fingerprint data for security
    const fingerprintsToSend = fingerprints.map(fp => ({
      id: fp.id,
      finger_type: fp.finger_type,
      created_at: fp.created_at,
    }));

    return createSuccess(res, 200, 'Student fingerprints fetched successfully', {
      fingerprints: fingerprintsToSend
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Enroll a new fingerprint for a student
 */
export const enrollStudentFingerprint = async (req: Request, res: Response, next: NextFunction) => {
  const { student_id, fingerprint, finger_type } = req.body;
  const user_id = (req.user as JwtPayload).id;

  if (!student_id || !fingerprint || !finger_type) {
    return next(createError(400, 'Student ID, fingerprint data, and finger type are required'));
  }

  // Validate finger type
  const validFingerTypes = ['thumb', 'index', 'middle', 'ring', 'pinky'];
  if (!validFingerTypes.includes(finger_type)) {
    return next(createError(400, 'Invalid finger type. Must be one of: thumb, index, middle, ring, pinky'));
  }

  // Validate fingerprint data
  try {
    Buffer.from(fingerprint, 'base64');
  } catch (error) {
    return next(createError(400, 'Invalid fingerprint data provided'));
  }

  try {
    // Verify student belongs to this staff
    const student = await prisma.student.findUnique({
      where: { id: student_id },
      include: { fingerprints: true }
    });

    if (!student) {
      return next(createError(404, 'Student not found'));
    }

    if (student.staff_id !== user_id) {
      return next(createError(403, 'Access denied'));
    }

    // Check if student already has 5 fingerprints
    if (student.fingerprints.length >= 5) {
      return next(createError(400, 'Maximum of 5 fingerprints per student reached'));
    }

    // Check if this finger type is already enrolled
    const existingFingerType = student.fingerprints.find(fp => fp.finger_type === finger_type);
    if (existingFingerType) {
      return next(createError(400, `This student already has a ${finger_type} fingerprint enrolled`));
    }

    // Add the new fingerprint
    const newFingerprint = await addStudentFingerprint(student_id, fingerprint, finger_type);

    return createSuccess(res, 200, 'Fingerprint enrolled successfully', {
      fingerprint: {
        id: newFingerprint.id,
        student_id: newFingerprint.student_id,
        finger_type: newFingerprint.finger_type,
        created_at: newFingerprint.created_at,
      }
    });
  } catch (err) {
    console.error('Error enrolling fingerprint:', err);
    return next(err);
  }
};

/**
 * Delete a specific fingerprint
 */
export const deleteStudentFingerprint = async (req: Request, res: Response, next: NextFunction) => {
  const { fingerprint_id } = req.params;
  const user_id = (req.user as JwtPayload).id;

  if (!fingerprint_id) {
    return next(createError(400, 'Fingerprint ID is required'));
  }

  try {
    // Verify the fingerprint exists and belongs to a student of this staff
    const fingerprint = await prisma.fingerprint.findUnique({
      where: { id: fingerprint_id },
      include: {
        student: {
          select: {
            staff_id: true,
          }
        }
      }
    });

    if (!fingerprint) {
      return next(createError(404, 'Fingerprint not found'));
    }

    if (fingerprint.student.staff_id !== user_id) {
      return next(createError(403, 'Access denied'));
    }

    // Delete the fingerprint
    await deleteStudentFingerprintService(fingerprint_id);

    return createSuccess(res, 200, 'Fingerprint deleted successfully', {
      deleted: true
    });
  } catch (err) {
    console.error('Error deleting fingerprint:', err);
    return next(err);
  }
};

/**
 * Check if a fingerprint is unique across ALL enrolled fingerprints
 */
export const checkFingerprintUniquenessMulti = async (req: Request, res: Response, next: NextFunction) => {
  const { fingerprint, excludeStudentId } = req.body;
  const user_id = (req.user as JwtPayload).id;

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  if (!fingerprint) {
    return next(createError(400, 'Fingerprint data is required'));
  }

  // Validate fingerprint data
  try {
    Buffer.from(fingerprint, 'base64');
  } catch (error) {
    return next(createError(400, 'Invalid fingerprint data provided'));
  }

  try {
    // For admin users, check against all students; for teachers, only their own
    const whereClause = currentUser.role === 'ADMIN'
      ? (excludeStudentId ? { id: { not: excludeStudentId } } : {})
      : {
          staff_id: user_id,
          ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
        };

    // Get ALL fingerprints for ALL students of this staff (or all students for admin)
    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        fingerprints: {
          select: {
            id: true,
            fingerprint: true,
            encrypted_fingerprint: true,
            fingerprint_hash: true,
            finger_type: true,
          }
        }
      }
    });

    // Collect all fingerprints
    const allFingerprints = [];
    for (const student of students) {
      for (const fp of student.fingerprints) {
        let fingerprintData = null;

        try {
          if (fp.fingerprint || fp.encrypted_fingerprint) {
            const result = handleFingerprintData(
              fp.fingerprint || undefined,
              fp.encrypted_fingerprint || undefined,
              fp.fingerprint_hash || undefined
            );

            if (result.data) {
              fingerprintData = result.data;
            }
          }

          if (!fingerprintData && fp.fingerprint) {
            let cleanedData = fp.fingerprint.replace(/^data:image\/\w+;base64,/, '');
            Buffer.from(cleanedData, 'base64');
            fingerprintData = cleanedData;
          }

          if (fingerprintData) {
            allFingerprints.push({
              id: student.id,
              name: student.name,
              matric_no: student.matric_no,
              fingerprint: fingerprintData,
              finger_type: fp.finger_type,
            });
          }
        } catch (error) {
          console.warn(`Skipping fingerprint ${fp.id} due to processing error:`, error);
        }
      }
    }

    if (allFingerprints.length === 0) {
      return createSuccess(res, 200, 'Fingerprint is unique', {
        isUnique: true,
        message: 'No existing fingerprints to compare against'
      });
    }

    // Call Python server to check for duplicates using multi-fingerprint endpoint
    try {
      const formData = new FormData();
      const base64Data = fingerprint.split(',')[1] || fingerprint;
      const buffer = Buffer.from(base64Data, 'base64');
      const uint8Array = new Uint8Array(buffer);

      formData.append('file', new Blob([uint8Array], { type: 'image/png' }), 'fingerprint.png');
      formData.append('fingerprints_data', JSON.stringify(allFingerprints));

      const response = await fetch('http://localhost:5050/identify/fingerprint/multi', {
        method: 'POST',
        body: formData as any,
      });

      if (response.ok) {
        const result = await response.json();
        const confidence = result.confidence || 0;
        const fingerType = result.finger_type || null;

        console.log('Multi-fingerprint check result:', { 
          confidence, 
          student_id: result.student_id,
          finger_type: fingerType 
        });

        // If confidence is above 70%, consider it a duplicate (increased from 30% to reduce false positives)
        if (confidence > 70 && result.student_id) {
          return createSuccess(res, 200, 'Fingerprint already exists', {
            isUnique: false,
            confidence,
            matchedStudent: {
              id: result.student_id,
              name: allFingerprints.find(f => f.id === result.student_id)?.name,
              matric_no: allFingerprints.find(f => f.id === result.student_id)?.matric_no,
            },
            matchedFingerType: fingerType,
            message: `Fingerprint matches existing ${fingerType} fingerprint with ${confidence.toFixed(1)}% confidence`
          });
        } else {
          return createSuccess(res, 200, 'Fingerprint is unique', {
            isUnique: true,
            confidence,
            message: `Fingerprint is unique (best match: ${confidence.toFixed(1)}% confidence)`
          });
        }
      } else {
        console.warn('Python server returned error, assuming fingerprint is unique');
        return createSuccess(res, 200, 'Fingerprint is unique', {
          isUnique: true,
          message: 'Unable to verify uniqueness, proceeding with caution'
        });
      }
    } catch (error) {
      console.error('Error calling Python server for multi-fingerprint check:', error);
      return createSuccess(res, 200, 'Fingerprint is unique', {
        isUnique: true,
        message: 'Unable to verify uniqueness due to server error, proceeding with caution'
      });
    }

  } catch (err) {
    console.error('Error in checkFingerprintUniquenessMulti:', err);
    return next(err);
  }
};