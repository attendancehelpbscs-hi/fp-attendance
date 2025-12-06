import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import { createSuccess } from '../helpers/http.helper';
import { hashPassword } from '../helpers/password.helper';
import { sendTeacherWelcomeEmail } from '../helpers/email.helper';
import { registerTeacherSchema } from '../../joi/teacher.joi';
import type { JwtPayload } from 'jsonwebtoken';

// Extend JwtPayload to include our custom properties
interface CustomJwtPayload extends JwtPayload {
  id: string;
}

// Create a new teacher account (admin only)
export const createTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { firstName, lastName, email, password, section, grade, matric_no } = req.body;
  const user = req.user as CustomJwtPayload;
  if (!user || !user.id) {
    return next(createError(401, 'Unauthorized'));
  }
  const user_id = user.id;

  // Check if the current user is an admin
  try {
    const currentUser = await prisma.staff.findUnique({
      where: { id: user_id },
      select: { role: true }
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return next(createError(403, 'Only admins can create teacher accounts'));
    }
  } catch (err) {
    return next(err);
  }

  // Validate input
  if (!firstName || !lastName || !email || !password) {
    return next(createError(400, 'All fields are required'));
  }

  try {
    // Check if teacher already exists
    const existingTeacher = await prisma.staff.findUnique({
      where: { email }
    });

    if (existingTeacher) {
      return next(createError(409, 'A user with this email already exists'));
    }

    // Check if matric_no (Teacher ID) already exists
    if (matric_no) {
      const existingMatric = await prisma.course.findFirst({
        where: { matric_no }
      });

      if (existingMatric) {
        return next(createError(409, 'Teacher ID already exists'));
      }
    }

    // Check if section already exists
    if (section) {
      const existingSection = await prisma.course.findFirst({
        where: { course_code: section }
      });

      if (existingSection) {
        return next(createError(409, 'Section already exists'));
      }
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the teacher
    const teacherName = `${firstName} ${lastName}`;
    const newTeacher = await prisma.staff.create({
      data: {
        firstName,
        lastName,
        name: teacherName,
        email,
        password: hashedPassword,
        role: 'TEACHER',
        created_at: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        created_at: true
      }
    });

    // If section details are provided, create a course for the teacher
    let course = null;
    if (section && grade) {
      try {
        course = await prisma.course.create({
          data: {
            staff_id: newTeacher.id,
            course_name: teacherName,
            course_code: section,
            grade,
            matric_no: matric_no || null,
            created_at: new Date()
          },
          select: {
            id: true,
            course_name: true,
            course_code: true,
            grade: true,
            matric_no: true
          }
        });
      } catch (courseErr) {
        // If course creation fails, log but don't fail the teacher creation
        console.error('Failed to create course for teacher:', courseErr);
      }
    }

    // Send welcome email (don't await to not delay response)
    sendTeacherWelcomeEmail(email, teacherName).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    return createSuccess(res, 201, 'Teacher account created successfully', { teacher: newTeacher, course });
  } catch (err) {
    return next(err);
  }
};

// Register a new teacher (self-service)
export const registerTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { firstName, lastName, email, password, section, employeeId, grade } = req.body;

  // Validate input
  const { error } = registerTeacherSchema.validate(req.body);
  if (error) {
    return next(createError(422, error.details[0].message));
  }

  try {
    // Check if teacher already exists by email
    const existingTeacher = await prisma.staff.findUnique({
      where: { email }
    });

    if (existingTeacher) {
      return next(createError(409, 'A user with this email already exists'));
    }

    // Check if employeeId (Teacher ID) already exists
    const existingMatric = await prisma.course.findFirst({
      where: { matric_no: employeeId }
    });

    if (existingMatric) {
      return next(createError(409, 'Teacher ID already exists'));
    }

    // Check if section already exists
    const existingSection = await prisma.course.findFirst({
      where: { course_code: section }
    });

    if (existingSection) {
      return next(createError(409, 'Section already exists'));
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the teacher
    const teacherName = `${firstName} ${lastName}`;
    const newTeacher = await prisma.staff.create({
      data: {
        firstName,
        lastName,
        name: teacherName,
        email,
        password: hashedPassword,
        role: 'TEACHER',
        created_at: new Date()
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        created_at: true
      }
    });

    // Create a course for the teacher
    let course = null;
    try {
      course = await prisma.course.create({
        data: {
          staff_id: newTeacher.id,
          course_name: teacherName,
          course_code: section,
          grade,
          matric_no: employeeId,
          created_at: new Date()
        },
        select: {
          id: true,
          course_name: true,
          course_code: true,
          grade: true,
          matric_no: true
        }
      });
    } catch (courseErr) {
      // If course creation fails, log but don't fail the teacher creation
      console.error('Failed to create course for teacher:', courseErr);
    }

    // Send welcome email (don't await to not delay response)
    sendTeacherWelcomeEmail(email, teacherName).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    return createSuccess(res, 201, 'Teacher account created successfully', { teacher: newTeacher, course });
  } catch (err) {
    return next(err);
  }
};

// Get all teachers (admin only)
export const getAllTeachers = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as CustomJwtPayload;
  if (!user || !user.id) {
    return next(createError(401, 'Unauthorized'));
  }
  const user_id = user.id;
  const page = req.query.page as string || '1';
  const per_page = req.query.per_page as string || '10';
  
  // Convert string query parameters to numbers
  const pageNumber = parseInt(page, 10) || 1;
  const perPageNumber = parseInt(per_page, 10) || 10;

  // Check if the current user is an admin
  try {
    const currentUser = await prisma.staff.findUnique({
      where: { id: user_id },
      select: { role: true }
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return next(createError(403, 'Only admins can view all teachers'));
    }
  } catch (err) {
    return next(err);
  }

  try {

    // Get total count
    const teacherCount = await prisma.staff.count({
      where: { role: 'TEACHER' }
    });

    // Get teachers with pagination
    const teachers = await prisma.staff.findMany({
      where: { role: 'TEACHER' },
      skip: (pageNumber - 1) * perPageNumber,
      take: perPageNumber,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        created_at: true,
        courses: {
          select: {
            course_code: true,
            grade: true,
            matric_no: true
          },
          take: 1, // Get the first course for section info
          orderBy: {
            created_at: 'desc'
          }
        },
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform the data to include section, grade, matric_no at the top level
    const transformedTeachers = teachers.map(teacher => ({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      name: teacher.name,
      email: teacher.email,
      role: 'TEACHER',
      created_at: teacher.created_at,
      section: teacher.courses[0]?.course_code || null,
      grade: teacher.courses[0]?.grade || null,
      matric_no: teacher.courses[0]?.matric_no || null,
    }));

    const meta = {
      total_items: teacherCount,
      total_pages: Math.ceil(teacherCount / perPageNumber) || 1,
      page: pageNumber,
      per_page: perPageNumber
    };

    return createSuccess(res, 200, 'Teachers retrieved successfully', { teachers: transformedTeachers, meta });
  } catch (err) {
    return next(err);
  }
};

// Get a single teacher (admin only)
export const getTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = req.user as CustomJwtPayload;
  if (!user || !user.id) {
    return next(createError(401, 'Unauthorized'));
  }
  const user_id = user.id;

  // Check if the current user is an admin
  try {
    const currentUser = await prisma.staff.findUnique({
      where: { id: user_id },
      select: { role: true }
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return next(createError(403, 'Only admins can view teacher details'));
    }
  } catch (err) {
    return next(err);
  }

  if (!id) {
    return next(createError(400, 'Teacher ID is required'));
  }

  try {
    // Find teacher by ID first, then check role
    const teacher = await prisma.staff.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        students: {
          select: {
            id: true,
            name: true,
            matric_no: true,
            grade: true,
            created_at: true
          }
        }
      }
    });

    if (!teacher) {
      return next(createError(404, 'Teacher not found'));
    }

    // Verify it's actually a teacher
    if (teacher.role !== 'TEACHER') {
      return next(createError(404, 'Teacher not found'));
    }

    return createSuccess(res, 200, 'Teacher retrieved successfully', { teacher });
  } catch (err) {
    return next(err);
  }
};

// Update a teacher (admin only)
export const updateTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { id, firstName, lastName, email, password, section, grade, matric_no } = req.body;
  const user = req.user as CustomJwtPayload;
  if (!user || !user.id) {
    return next(createError(401, 'Unauthorized'));
  }
  const user_id = user.id;

  // Check if the current user is an admin
  try {
    const currentUser = await prisma.staff.findUnique({
      where: { id: user_id },
      select: { role: true }
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return next(createError(403, 'Only admins can update teacher accounts'));
    }
  } catch (err) {
    return next(err);
  }

  if (!id) {
    return next(createError(400, 'Teacher ID is required'));
  }

  // Validate input
  if (!firstName && !lastName && !email && !password && !section && !grade && !matric_no) {
    return next(createError(400, 'At least one field must be provided for update'));
  }

  try {
    // Check if teacher exists
    const existingTeacher = await prisma.staff.findUnique({
      where: { id }
    });

    if (!existingTeacher) {
      return next(createError(404, 'Teacher not found'));
    }

    // Verify it's actually a teacher
    if (existingTeacher.role !== 'TEACHER') {
      return next(createError(404, 'Teacher not found'));
    }

    // Check if email is being changed and if it's already in use
    if (email && email !== existingTeacher.email) {
      const emailInUse = await prisma.staff.findUnique({
        where: { email }
      });

      if (emailInUse) {
        return next(createError(409, 'This email is already in use by another user'));
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (password) updateData.password = await hashPassword(password);

    // Update name if first or last name is provided
    if (firstName || lastName) {
      const updatedFirstName = firstName || existingTeacher.firstName;
      const updatedLastName = lastName || existingTeacher.lastName;
      updateData.name = `${updatedFirstName} ${updatedLastName}`;
    }

    // Update the teacher
    const updatedTeacher = await prisma.staff.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        created_at: true
      }
    });

    // If section details are provided, update or create the course
    if (section || grade || matric_no) {
      try {
        // Check uniqueness for matric_no
        if (matric_no !== undefined) {
          const existingMatric = await prisma.course.findFirst({
            where: { matric_no, staff_id: { not: id } }
          });

          if (existingMatric) {
            return next(createError(409, 'Teacher ID already exists'));
          }
        }

        // Check uniqueness for section
        if (section) {
          const existingSection = await prisma.course.findFirst({
            where: { course_code: section, staff_id: { not: id } }
          });

          if (existingSection) {
            return next(createError(409, 'Section already exists'));
          }
        }

        const existingCourse = await prisma.course.findFirst({
          where: { staff_id: id },
          orderBy: { created_at: 'desc' }
        });

        const courseData: any = {};
        if (section) courseData.course_code = section;
        if (grade) courseData.grade = grade;
        if (matric_no !== undefined) courseData.matric_no = matric_no;

        if (existingCourse) {
          // Update existing course
          await prisma.course.update({
            where: { id: existingCourse.id },
            data: courseData
          });
        } else if (section && grade) {
          // Create new course if section and grade are provided
          await prisma.course.create({
            data: {
              staff_id: id,
              course_name: updatedTeacher.name,
              course_code: section,
              grade,
              matric_no: matric_no || null,
              created_at: new Date()
            }
          });
        }
      } catch (courseErr) {
        // If course update fails, log but don't fail the teacher update
        console.error('Failed to update course for teacher:', courseErr);
      }
    }

    return createSuccess(res, 200, 'Teacher updated successfully', { teacher: updatedTeacher });
  } catch (err) {
    return next(err);
  }
};

// Delete a teacher (admin only)
export const deleteTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user = req.user as CustomJwtPayload;
  if (!user || !user.id) {
    return next(createError(401, 'Unauthorized'));
  }
  const user_id = user.id;

  // Check if the current user is an admin
  try {
    const currentUser = await prisma.staff.findUnique({
      where: { id: user_id },
      select: { role: true }
    });

    if (!currentUser || currentUser.role !== 'ADMIN') {
      return next(createError(403, 'Only admins can delete teacher accounts'));
    }
  } catch (err) {
    return next(err);
  }

  if (!id) {
    return next(createError(400, 'Teacher ID is required'));
  }

  try {
    // Check if teacher exists
    const existingTeacher = await prisma.staff.findUnique({
      where: { id }
    });
    
    if (!existingTeacher) {
      return next(createError(404, 'Teacher not found'));
    }

    // Verify it's actually a teacher
    if (existingTeacher.role !== 'TEACHER') {
      return next(createError(404, 'Teacher not found'));
    }

    // Get counts of associated records for warning
    const [studentCount, courseCount, attendanceCount, auditLogCount, tokenCount] = await Promise.all([
      prisma.student.count({ where: { staff_id: id } }),
      prisma.course.count({ where: { staff_id: id } }),
      prisma.attendance.count({ where: { staff_id: id } }),
      prisma.auditLog.count({ where: { staff_id: id } }),
      prisma.token.count({ where: { staff_id: id } })
    ]);

    // Delete all associated records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete student attendance records first
      await tx.studentAttendance.deleteMany({
        where: {
          attendance: {
            staff_id: id
          }
        }
      });

      // Delete attendance records
      await tx.attendance.deleteMany({
        where: { staff_id: id }
      });

      // Delete student-course relationships
      await tx.studentCourse.deleteMany({
        where: {
          course: {
            staff_id: id
          }
        }
      });

      // Delete fingerprints of students
      await tx.fingerprint.deleteMany({
        where: {
          student: {
            staff_id: id
          }
        }
      });

      // Delete students
      await tx.student.deleteMany({
        where: { staff_id: id }
      });

      // Delete courses
      await tx.course.deleteMany({
        where: { staff_id: id }
      });

      // Delete audit logs
      await tx.auditLog.deleteMany({
        where: { staff_id: id }
      });

      // Delete tokens
      await tx.token.deleteMany({
        where: { staff_id: id }
      });

      // Finally delete the teacher
      await tx.staff.delete({
        where: { id }
      });
    });

    return createSuccess(res, 200, 'Teacher and all associated records deleted successfully', {
      deletedRecords: {
        students: studentCount,
        courses: courseCount,
        attendances: attendanceCount,
        auditLogs: auditLogCount,
        tokens: tokenCount
      }
    });

    return createSuccess(res, 200, 'Teacher deleted successfully', {});
  } catch (err) {
    return next(err);
  }
};