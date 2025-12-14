import createError from 'http-errors';
import { hashPassword } from '../helpers/password.helper';
import { prisma } from '../db/prisma-client';
import type { Staff, Role } from '@prisma/client';
import { createAuditLog } from './audit.service';
import { isSectionValidForGrade, isSectionAlreadyAssigned } from '../config/sections.config';

export interface NewTeacher {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: Role;
  section?: string;
  grade?: string;
  matric_no?: string;
}

export interface TeacherReturn {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: string;
  created_at: Date;
  profilePicture?: string;
  section?: string;
  grade?: string;
  matric_no?: string;
  approval_status?: string;
}

export const addTeacherToDb = async (newTeacher: NewTeacher): Promise<TeacherReturn> => {
  const { firstName, lastName, email, password, role = 'TEACHER', section, grade, matric_no } = newTeacher;

  // Check for existing teacher/staff with that email
  const existingStaff = await prisma.staff.findUnique({
    where: { email },
  });

  if (existingStaff) {
    throw createError(406, 'Teacher with this email already exists');
  }

  // Validate section if provided
  if (section && grade) {
    // Check if section is valid for the grade
    if (!isSectionValidForGrade(section, grade)) {
      throw createError(400, `Section ${section} is not valid for Grade ${grade}`);
    }

    // Check if section is already assigned to another teacher (globally unique)
    const isSectionTaken = await isSectionAlreadyAssigned(section, grade);
    if (isSectionTaken) {
      throw createError(409, `Section ${section} is already assigned to another teacher`);
    }
  }

  try {
    const hashedPassword = await hashPassword(password);
    const teacherData = {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      email,
      password: hashedPassword,
      role: role || 'TEACHER' as Role,
      section,
      grade,
      matric_no,
      created_at: new Date(),
    };

    const savedTeacher = await prisma.staff.create({
      data: teacherData,
    });

    const { id, firstName: fname, lastName: lname, name, email: teacherEmail, role: teacherRole, created_at, profilePicture, section: teacherSection, grade: teacherGrade, matric_no: teacherMatricNo } = savedTeacher;

    return {
      id,
      firstName: fname,
      lastName: lname,
      name,
      email: teacherEmail,
      role: teacherRole,
      created_at,
      profilePicture: profilePicture || undefined,
      section: teacherSection || undefined,
      grade: teacherGrade || undefined,
      matric_no: teacherMatricNo || undefined,
    };
  } catch (err) {
    throw err;
  }
};

export const getAssignedSectionsForGrade = async (grade: string): Promise<string[]> => {
  try {
    const assignedTeachers = await prisma.staff.findMany({
      where: {
        grade,
        section: { not: null },
        role: 'TEACHER',
        approval_status: 'APPROVED'
      },
      select: {
        section: true
      }
    });

    return assignedTeachers.map(teacher => teacher.section || '').filter(section => section !== '');
  } catch (err) {
    throw err;
  }
};

export const getAllAssignedSections = async (): Promise<string[]> => {
  try {
    const assignedTeachers = await prisma.staff.findMany({
      where: {
        section: { not: null },
        role: 'TEACHER',
        approval_status: { in: ['APPROVED', 'PENDING'] }
      },
      select: {
        section: true
      }
    });

    return assignedTeachers.map(teacher => teacher.section || '').filter(section => section !== '');
  } catch (err) {
    throw err;
  }
};

export const getTeachersFromDb = async (page: number = 1, perPage: number = 10): Promise<{ teachers: TeacherReturn[]; total: number; totalPages: number }> => {
  try {
    const skip = (page - 1) * perPage;

    const [teachers, total] = await Promise.all([
      prisma.staff.findMany({
        where: {
          role: 'TEACHER',
          approval_status: 'APPROVED' as any
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          role: true,
          created_at: true,
          profilePicture: true,
          section: true,
          grade: true,
          matric_no: true,
          approval_status: true as any,
        },
        skip,
        take: perPage,
        orderBy: { created_at: 'desc' },
      }),
      prisma.staff.count({
        where: {
          role: 'TEACHER',
          approval_status: 'APPROVED' as any
        },
      }),
    ]);

    const totalPages = Math.ceil(total / perPage);

    return {
      teachers: teachers.map(teacher => ({
        ...teacher,
        profilePicture: teacher.profilePicture || undefined,
        section: teacher.section || undefined,
        grade: teacher.grade || undefined,
        matric_no: teacher.matric_no || undefined,
        approval_status: (teacher as any).approval_status || 'APPROVED', // Default legacy teachers to APPROVED
      })),
      total,
      totalPages,
    };
  } catch (err) {
    throw err;
  }
};

export const getTeacherByIdFromDb = async (id: string): Promise<TeacherReturn | null> => {
  try {
    const teacher = await prisma.staff.findFirst({
      where: { id, role: 'TEACHER' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        profilePicture: true,
        section: true,
        grade: true,
        matric_no: true,
        approval_status: true as any,
      },
    });

    if (!teacher) return null;

    return {
      ...teacher,
      profilePicture: teacher.profilePicture || undefined,
      section: teacher.section || undefined,
      grade: teacher.grade || undefined,
      matric_no: teacher.matric_no || undefined,
    };
  } catch (err) {
    throw err;
  }
};

export const updateTeacherInDb = async (id: string, updateData: Partial<NewTeacher>): Promise<TeacherReturn> => {
  try {
    const dataToUpdate: any = {};

    if (updateData.firstName) dataToUpdate.firstName = updateData.firstName;
    if (updateData.lastName) {
      dataToUpdate.lastName = updateData.lastName;
      // Update full name if first or last name is being updated
      const teacher = await prisma.staff.findUnique({ where: { id } });
      if (teacher) {
        dataToUpdate.name = `${updateData.firstName || teacher.firstName} ${updateData.lastName}`;
      }
    }
    if (updateData.email) dataToUpdate.email = updateData.email;
    if (updateData.password) dataToUpdate.password = await hashPassword(updateData.password);
    if (updateData.role) dataToUpdate.role = updateData.role;

    // Validate section if being updated
    if (updateData.section !== undefined || updateData.grade !== undefined) {
      // Get current teacher data to check what's changing
      const currentTeacher = await prisma.staff.findUnique({
        where: { id },
        select: { section: true, grade: true }
      });

      const newSection = updateData.section !== undefined ? updateData.section : currentTeacher?.section;
      const newGrade = updateData.grade !== undefined ? updateData.grade : currentTeacher?.grade;

      if (newSection && newGrade) {
        // Check if section is valid for the grade
        if (!isSectionValidForGrade(newSection, newGrade)) {
          throw createError(400, `Section ${newSection} is not valid for Grade ${newGrade}`);
        }

        // Check if section is already assigned to another teacher (globally unique)
        const isSectionTaken = await isSectionAlreadyAssigned(newSection, newGrade, id);
        if (isSectionTaken) {
          throw createError(409, `Section ${newSection} is already assigned to another teacher`);
        }
      }
    }

    if (updateData.section !== undefined) dataToUpdate.section = updateData.section;
    if (updateData.grade !== undefined) dataToUpdate.grade = updateData.grade;
    if (updateData.matric_no !== undefined) dataToUpdate.matric_no = updateData.matric_no;

    const updatedTeacher = await prisma.staff.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        profilePicture: true,
        section: true,
        grade: true,
        matric_no: true,
        approval_status: true as any,
      },
    });

    return {
      ...updatedTeacher,
      profilePicture: updatedTeacher.profilePicture || undefined,
      section: updatedTeacher.section || undefined,
      grade: updatedTeacher.grade || undefined,
      matric_no: updatedTeacher.matric_no || undefined,
    };
  } catch (err) {
    throw err;
  }
};

export const deleteTeacherFromDb = async (id: string): Promise<boolean> => {
  try {
    // Delete related records in correct order to avoid foreign key constraints
    // First, delete student attendances (junction table)
    await prisma.studentAttendance.deleteMany({
      where: {
        attendance: {
          staff_id: id
        }
      }
    });

    // Delete student-course enrollments for courses taught by this teacher
    await prisma.studentCourse.deleteMany({
      where: {
        course: {
          staff_id: id
        }
      }
    });

    // Delete fingerprints for students of this teacher
    await prisma.fingerprint.deleteMany({
      where: {
        student: {
          staff_id: id
        }
      }
    });

    // Delete students assigned to this teacher
    await prisma.student.deleteMany({
      where: { staff_id: id },
    });

    // Delete courses taught by this teacher
    await prisma.course.deleteMany({
      where: { staff_id: id },
    });

    // Delete attendances created by this teacher
    await prisma.attendance.deleteMany({
      where: { staff_id: id },
    });

    // Delete audit logs
    await prisma.auditLog.deleteMany({
      where: { staff_id: id },
    });

    // Delete tokens
    await prisma.token.deleteMany({
      where: { staff_id: id },
    });

    // Finally delete the staff record
    await prisma.staff.delete({
      where: { id },
    });

    return true;
  } catch (err) {
    throw err;
  }
};

export const importTeachersFromCsv = async (csvData: string): Promise<{ imported: number; errors: string[] }> => {
  const errors: string[] = [];
  let imported = 0;

  try {
    // Parse CSV data
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const requiredHeaders = ['firstname', 'lastname', 'email', 'password'];

    // Validate headers
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const values = line.split(',').map(v => v.trim());
        const rowData: any = {};

        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });

        // Convert firstname, lastname, and section to uppercase
        if (rowData.firstname) rowData.firstname = rowData.firstname.toUpperCase();
        if (rowData.lastname) rowData.lastname = rowData.lastname.toUpperCase();
        if (rowData.section) rowData.section = rowData.section.toUpperCase();

        // Validate required fields
        if (!rowData.firstname || !rowData.lastname || !rowData.email || !rowData.password) {
          errors.push(`Row ${i + 1}: Missing required fields (firstName, lastName, email, password)`);
          continue;
        }

        // Validate role field - must be "teacher" (case insensitive)
        if (rowData.role && rowData.role.toLowerCase() !== 'teacher') {
          errors.push(`Row ${i + 1}: Invalid role "${rowData.role}". Only "teacher" role is allowed for CSV import.`);
          continue;
        }

        // Validate grade field - must be 1-6
        if (rowData.grade) {
          const gradeNum = parseInt(rowData.grade);
          if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 6) {
            errors.push(`Row ${i + 1}: Invalid grade "${rowData.grade}". Grade must be a number between 1 and 6.`);
            continue;
          }
        }

        // Validate matric_no field - must contain only numbers
        if (rowData.matric_no && !/^\d+$/.test(rowData.matric_no)) {
          errors.push(`Row ${i + 1}: Invalid matriculation number "${rowData.matric_no}". It must contain only numbers.`);
          continue;
        }

        // Check for existing teacher
        const existingTeacher = await prisma.staff.findUnique({
          where: { email: rowData.email },
        });

        if (existingTeacher) {
          errors.push(`Row ${i + 1}: Teacher with email ${rowData.email} already exists`);
          continue;
        }

        // Validate section if provided
        if (rowData.section && rowData.grade) {
          // Check if section is valid for the grade
          if (!isSectionValidForGrade(rowData.section, rowData.grade)) {
            errors.push(`Row ${i + 1}: Section ${rowData.section} is not valid for Grade ${rowData.grade}`);
            continue;
          }

          // Check if section is already assigned to another teacher for the same grade
          const isSectionTaken = await isSectionAlreadyAssigned(rowData.section, rowData.grade);
          if (isSectionTaken) {
            errors.push(`Row ${i + 1}: Section ${rowData.section} for Grade ${rowData.grade} is already assigned to another teacher`);
            continue;
          }
        }

        // Create teacher
        const teacherData: NewTeacher = {
          firstName: rowData.firstname,
          lastName: rowData.lastname,
          email: rowData.email,
          password: rowData.password,
          role: 'TEACHER',
          section: rowData.section || undefined,
          grade: rowData.grade || undefined,
          matric_no: rowData.matric_no || undefined,
        };

        await addTeacherToDb(teacherData);
        imported++;

        // Audit log
        await createAuditLog('system', 'TEACHER_IMPORTED', `Teacher ${rowData.email} imported via CSV`);

      } catch (rowError: any) {
        errors.push(`Row ${i + 1}: ${rowError.message}`);
      }
    }

    return { imported, errors };
  } catch (err: any) {
    throw new Error(`Import failed: ${err.message}`);
  }
};