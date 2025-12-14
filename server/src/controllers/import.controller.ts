import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import { createSuccess } from '../helpers/http.helper';
import type { JwtPayload } from 'jsonwebtoken';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

type StudentCSVRow = Record<string, any>;
type TeacherCSVRow = Record<string, any>;

interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

interface NormalizedStudentRow {
  rowNumber: number;
  name: string;
  matricNo: string;
  grade: string;
  sectionCode?: string;
  raw: StudentCSVRow;
}

interface NormalizedTeacherRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role?: string;
  matric_no?: string;
  section?: string;
  grade?: string;
  raw: TeacherCSVRow;
}

const parseCsvFile = (filePath: string): Promise<Record<string, any>[]> => {
  return new Promise((resolve, reject) => {
    const rows: Record<string, any>[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data: Record<string, any>) => rows.push(data))
      .on('end', () => resolve(rows))
      .on('error', (error) => reject(error));
  });
};

const getCellValue = (value: ExcelJS.CellValue): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') {
      return value.text;
    }
    if ('result' in value && value.result !== undefined) {
      return String(value.result);
    }
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join('');
    }
  }
  return String(value);
};

const parseExcelFile = async (filePath: string): Promise<Record<string, any>[]> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = getCellValue(cell.value).trim();
  });
  const rows: Record<string, any>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    const rowData: Record<string, any> = {};
    headers.forEach((header, index) => {
      if (!header) {
        return;
      }
      rowData[header] = getCellValue(row.getCell(index + 1).value).trim();
    });
    if (Object.values(rowData).some((value) => value !== '')) {
      rows.push(rowData);
    }
  });
  return rows;
};

const formatNumberValue = (value: string): string => {
  const num = Number(value);
  if (!isNaN(num)) {
    return num.toString();
  }
  return value;
};

const getValueFromRow = (row: StudentCSVRow, keys: string[]): string => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      const value = String(row[key]).trim();
      if (value) {
        return formatNumberValue(value);
      }
    }
  }
  return '';
};

const normalizeGradeValue = (grade: string): string => {
  if (!grade) {
    return '';
  }
  const digits = grade.match(/\d+/);
  if (digits && digits[0]) {
    return digits[0];
  }
  return grade;
};

const normalizeRows = (rows: StudentCSVRow[]): NormalizedStudentRow[] => {
  const normalized: NormalizedStudentRow[] = [];
  rows.forEach((row, index) => {
    const name = getValueFromRow(row, ['name', 'Name']).toUpperCase();
    const matricNo = getValueFromRow(row, ['matric_no', 'Matric No', 'matric', 'Matric', 'LRN', 'lrn', 'id_number', 'ID Number', 'student_id', 'Student ID']);
    const grade = normalizeGradeValue(getValueFromRow(row, ['grade', 'Grade']));
    const sectionCodeValue = getValueFromRow(row, ['section', 'Section', 'section_code', 'Section Code', 'course_code', 'Course Code']);
    if (!name && !matricNo && !grade && !sectionCodeValue) {
      return;
    }
    const normalizedRow: NormalizedStudentRow = {
      rowNumber: index + 1,
      name,
      matricNo,
      grade,
      raw: row,
    };
    if (sectionCodeValue) {
      normalizedRow.sectionCode = sectionCodeValue;
    }
    normalized.push(normalizedRow);
  });
  return normalized;
};

export const importStudentsFromCSV = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  const user_id = (req.user as JwtPayload).id;
  let uploadedPath: string | undefined;
  try {
    const currentUser = await prisma.staff.findUnique({
      where: { id: user_id },
      select: { role: true },
    });
    if (!currentUser || currentUser.role !== 'TEACHER') {
      return next(createError(403, 'Only teachers can import students'));
    }
    if (!req.file) {
      return next(createError(400, 'No file uploaded'));
    }
    uploadedPath = req.file.path;
    const extension = path.extname(req.file.originalname).toLowerCase();
    let rawRows: StudentCSVRow[] = [];
    if (extension === '.csv') {
      rawRows = await parseCsvFile(uploadedPath);
    } else if (extension === '.xlsx' || extension === '.xls') {
      rawRows = await parseExcelFile(uploadedPath);
    } else {
      return next(createError(400, 'Unsupported file format'));
    }
    if (!rawRows.length) {
      return next(createError(400, 'Uploaded file is empty'));
    }
    const normalizedRows = normalizeRows(rawRows);
    if (!normalizedRows.length) {
      return createSuccess(res, 200, 'Students imported successfully', {
        imported: 0,
        errors: rawRows.length,
        errorDetails: rawRows.map((row, index) => ({ row: index + 1, data: row, error: 'Missing required fields (name, ID, grade)' })),
      });
    }
    const errors: Array<{ row: number; data: StudentCSVRow; error: string }> = [];
    const seenMatric = new Set<string>();
    const candidateRows: NormalizedStudentRow[] = [];
    normalizedRows.forEach((row) => {
      if (!row.name || !row.matricNo || !row.grade) {
        errors.push({ row: row.rowNumber, data: row.raw, error: 'Missing required fields (name, ID, grade)' });
        return;
      }
      const key = row.matricNo.toLowerCase();
      if (seenMatric.has(key)) {
        errors.push({ row: row.rowNumber, data: row.raw, error: 'Duplicate ID in file' });
        return;
      }
      seenMatric.add(key);
      candidateRows.push(row);
    });
    if (!candidateRows.length) {
      return createSuccess(res, 200, 'Students imported successfully', {
        imported: 0,
        errors: errors.length,
        errorDetails: errors,
      });
    }
    const existingStudents = await prisma.student.findMany({
      where: { matric_no: { in: candidateRows.map((row) => row.matricNo) } },
      select: { matric_no: true },
    });
    const existingSet = new Set(existingStudents.map((student) => student.matric_no.toLowerCase()));
    const teacherCourses = await prisma.course.findMany({
      where: { staff_id: user_id },
      select: { id: true, course_code: true, grade: true },
    });
    const courseMap = new Map(teacherCourses.map((course) => [course.course_code.toLowerCase(), course]));
    const rowsToPersist: Array<{ row: NormalizedStudentRow; courseId?: string }> = [];
    candidateRows.forEach((row) => {
      if (existingSet.has(row.matricNo.toLowerCase())) {
        errors.push({ row: row.rowNumber, data: row.raw, error: 'Student with this ID already exists' });
        return;
      }
      if (row.sectionCode) {
        const course = courseMap.get(row.sectionCode.toLowerCase());
        if (!course) {
          errors.push({ row: row.rowNumber, data: row.raw, error: 'Section not found for current teacher' });
          return;
        }
        if (course.grade !== row.grade) {
          errors.push({ row: row.rowNumber, data: row.raw, error: 'Section grade does not match student grade' });
          return;
        }
        rowsToPersist.push({ row, courseId: course.id });
        return;
      }
      rowsToPersist.push({ row });
    });
    if (!rowsToPersist.length) {
      return createSuccess(res, 200, 'Students imported successfully', {
        imported: 0,
        errors: errors.length,
        errorDetails: errors,
      });
    }
    await prisma.$transaction(
      rowsToPersist.map((entry) =>
        prisma.student.create({
          data: {
            name: entry.row.name,
            matric_no: entry.row.matricNo,
            grade: entry.row.grade,
            staff_id: user_id,
            created_at: new Date(),
            courses: entry.courseId
              ? {
                  create: [
                    {
                      course: {
                        connect: { id: entry.courseId },
                      },
                    },
                  ],
                }
              : undefined,
          },
        }),
      ),
    );
    return createSuccess(res, 200, 'Students imported successfully', {
      imported: rowsToPersist.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (err) {
    return next(err);
  } finally {
    if (uploadedPath && fs.existsSync(uploadedPath)) {
      fs.unlinkSync(uploadedPath);
    }
  }
};

export const getCSVTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templatePath = path.join(__dirname, '../../templates/student-import-template.csv');
    if (!fs.existsSync(templatePath)) {
      return next(createError(404, 'CSV template not found'));
    }
    res.download(templatePath, 'student_import_template.csv', (err) => {
      if (err) {
        return next(err);
      }
    });
  } catch (err) {
    return next(err);
  }
};

export const importTeachersFromCSV = async (req: RequestWithFile, res: Response, next: NextFunction) => {
  const user_id = (req.user as JwtPayload).id;
  let uploadedPath: string | undefined;
  try {
    const currentUser = await prisma.staff.findUnique({
      where: { id: user_id },
      select: { role: true },
    });
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return next(createError(403, 'Only admins can import teachers'));
    }
    if (!req.file) {
      return next(createError(400, 'No file uploaded'));
    }
    uploadedPath = req.file.path;
    const extension = path.extname(req.file.originalname).toLowerCase();
    let rawRows: TeacherCSVRow[] = [];
    if (extension === '.csv') {
      rawRows = await parseCsvFile(uploadedPath);
    } else if (extension === '.xlsx' || extension === '.xls') {
      rawRows = await parseExcelFile(uploadedPath);
    } else {
      return next(createError(400, 'Unsupported file format'));
    }
    if (!rawRows.length) {
      return next(createError(400, 'Uploaded file is empty'));
    }
    const normalizedRows: NormalizedTeacherRow[] = [];
    rawRows.forEach((row, index) => {
      const firstName = getValueFromRow(row, ['firstName', 'first_name', 'FirstName', 'First Name']).toUpperCase();
      const lastName = getValueFromRow(row, ['lastName', 'last_name', 'LastName', 'Last Name']).toUpperCase();
      const email = getValueFromRow(row, ['email', 'Email', 'emailAddress', 'Email Address']);
      const password = getValueFromRow(row, ['password', 'Password', 'pass', 'Pass']);
      const role = getValueFromRow(row, ['role', 'Role']);
      const matric_no = getValueFromRow(row, ['matric_no', 'matric', 'teacher_id', 'Teacher ID', 'id', 'ID']);
      const section = getValueFromRow(row, ['section', 'Section']).toUpperCase();
      const grade = getValueFromRow(row, ['grade', 'Grade']);

      if (!firstName || !lastName || !email) {
        return;
      }

      normalizedRows.push({
        rowNumber: index + 1,
        firstName,
        lastName,
        email,
        password: password || 'changeme123', // Default password if not provided
        role: role || 'TEACHER', // Default role if not provided
        matric_no: matric_no || undefined,
        section: section || undefined,
        grade: grade || undefined,
        raw: row,
      });
    });
    
    if (!normalizedRows.length) {
      return createSuccess(res, 200, 'Teachers imported successfully', {
        imported: 0,
        errors: rawRows.length,
        errorDetails: rawRows.map((row, index) => ({ row: index + 1, data: row, error: 'Missing required fields (first name, last name, email, role, matric_no, section, grade)' })),
      });
    }
    
    const errors: Array<{ row: number; data: TeacherCSVRow; error: string }> = [];
    const seenEmail = new Set<string>();
    const candidateRows: NormalizedTeacherRow[] = [];
    
    normalizedRows.forEach((row) => {
      if (!row.firstName || !row.lastName || !row.email || !row.role || !row.matric_no || !row.section || !row.grade) {
        errors.push({ row: row.rowNumber, data: row.raw, error: 'Missing required fields (first name, last name, email, role, matric_no, section, grade)' });
        return;
      }

      // Validate role
      const validRoles = ['TEACHER', 'ADMIN'];
      const role = row.role.toUpperCase();
      if (!validRoles.includes(role)) {
        errors.push({ row: row.rowNumber, data: row.raw, error: 'Invalid role. Must be "TEACHER" or "ADMIN"' });
        return;
      }
      row.role = role;

      const email = row.email.toLowerCase();
      if (seenEmail.has(email)) {
        errors.push({ row: row.rowNumber, data: row.raw, error: 'Duplicate email in file' });
        return;
      }

      seenEmail.add(email);
      candidateRows.push(row);
    });
    
    if (!candidateRows.length) {
      return createSuccess(res, 200, 'Teachers imported successfully', {
        imported: 0,
        errors: errors.length,
        errorDetails: errors,
      });
    }
    
    const existingTeachers = await prisma.staff.findMany({
      where: {
        email: { in: candidateRows.map((row) => row.email.toLowerCase()) }
      },
      select: { email: true },
    });
    
    const existingEmailSet = new Set(existingTeachers.map((teacher) => teacher.email.toLowerCase()));
    const rowsToPersist: NormalizedTeacherRow[] = [];
    
    candidateRows.forEach((row) => {
      if (existingEmailSet.has(row.email.toLowerCase())) {
        errors.push({ row: row.rowNumber, data: row.raw, error: 'Teacher with this email already exists' });
        return;
      }
      rowsToPersist.push(row);
    });
    
    if (!rowsToPersist.length) {
      return createSuccess(res, 200, 'Teachers imported successfully', {
        imported: 0,
        errors: errors.length,
        errorDetails: errors,
      });
    }
    
    // Hash passwords for all teachers
    const { hashPassword } = await import('../helpers/password.helper');
    
    // Pre-hash all passwords
    const rowsWithHashedPasswords = await Promise.all(
      rowsToPersist.map(async (row) => ({
        ...row,
        hashedPassword: await hashPassword(row.password || 'changeme123')
      }))
    );
    
    await prisma.$transaction(
      rowsWithHashedPasswords.map((row) => {
        const fullName = `${row.firstName} ${row.lastName}`;
        const teacherData: any = {
          firstName: row.firstName,
          lastName: row.lastName,
          name: fullName,
          email: row.email,
          password: row.hashedPassword,
          role: (row.role || 'TEACHER').toUpperCase(),
          created_at: new Date(),
        };

        // If section and grade are provided, create a course for the teacher
        if (row.section && row.grade) {
          teacherData.courses = {
            create: [
              {
                course_name: fullName,
                course_code: row.section,
                grade: row.grade,
                matric_no: row.matric_no || null,
                created_at: new Date(),
              },
            ],
          };
        }

        return prisma.staff.create({
          data: teacherData,
        });
      })
    );
    
    return createSuccess(res, 200, 'Teachers imported successfully', {
      imported: rowsToPersist.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (err) {
    return next(err);
  } finally {
    if (uploadedPath && fs.existsSync(uploadedPath)) {
      fs.unlinkSync(uploadedPath);
    }
  }
};
