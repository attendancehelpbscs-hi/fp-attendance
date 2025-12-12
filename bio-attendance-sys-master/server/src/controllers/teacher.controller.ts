import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { createSuccess } from '../helpers/http.helper';
import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import type { PaginationMeta } from '../interfaces/helper.interface';
import type { Role } from '@prisma/client';
import { addTeacherToDb, getTeachersFromDb, getTeacherByIdFromDb, updateTeacherInDb, deleteTeacherFromDb, importTeachersFromCsv, getAssignedSectionsForGrade as getAssignedSectionsForGradeService, getAllAssignedSections as getAllAssignedSectionsService } from '../services/teacher.service';
import multer from 'multer';
import { createAuditLog } from '../services/audit.service';
import { sendTeacherApprovalEmail, sendTeacherRejectionEmail, sendTeacherWelcomeEmail } from '../helpers/email.helper';

// Configure multer for file uploads
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

export const addTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { firstName, lastName, email, password, role, section, grade, matric_no } = req.body as {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: string;
    section?: string;
    grade?: string;
    matric_no?: string;
  };

  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Only admins can add teachers
  if (currentUser.role !== 'ADMIN') {
    return next(new createError.Forbidden('Access denied. Only admins can add teachers.'));
  }

  try {
    const newTeacher = await addTeacherToDb({
      firstName,
      lastName,
      email,
      password,
      role: (role as Role) || 'TEACHER',
      section,
      grade,
      matric_no,
    });

    // Audit log
    await createAuditLog(user_id, 'TEACHER_CREATED', `Teacher ${newTeacher.email} created by admin`);

    return createSuccess(res, 201, 'Teacher created successfully', { teacher: newTeacher });
  } catch (err) {
    return next(err);
  }
};

export const getAssignedSectionsForGrade = async (req: Request, res: Response, next: NextFunction) => {
  const { grade } = req.params;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!grade) return next(new createError.BadRequest('Grade is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Only admins can check assigned sections
  if (currentUser.role !== 'ADMIN') {
    return next(new createError.Forbidden('Access denied. Only admins can check assigned sections.'));
  }

  try {
    const assignedSections = await getAssignedSectionsForGradeService(grade);
    return createSuccess(res, 200, 'Assigned sections fetched successfully', { sections: assignedSections });
  } catch (err) {
    return next(err);
  }
};

export const getAllAssignedSections = async (req: Request, res: Response, next: NextFunction) => {
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Only admins can check assigned sections
  if (currentUser.role !== 'ADMIN') {
    return next(new createError.Forbidden('Access denied. Only admins can check assigned sections.'));
  }

  try {
    const assignedSections = await getAllAssignedSectionsService();
    return createSuccess(res, 200, 'All assigned sections fetched successfully', { sections: assignedSections });
  } catch (err) {
    return next(err);
  }
};

export const getPublicAssignedSections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignedSections = await getAllAssignedSectionsService();
    return createSuccess(res, 200, 'Assigned sections fetched successfully', { sections: assignedSections });
  } catch (err) {
    return next(err);
  }
};

export const getTeachers = async (req: Request, res: Response, next: NextFunction) => {
  console.log('🔍 getTeachers called!', { query: req.query, user: req.user }); // ← ADD THIS LINE
  const { page, per_page } = req.query;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Only admins can view teachers
  if (currentUser.role !== 'ADMIN') {
    return next(new createError.Forbidden('Access denied. Only admins can view teachers.'));
  }

  const pageNum = Number(page) || 1;
  const perPageNum = Number(per_page) || 10;

  try {
    const { teachers, total, totalPages } = await getTeachersFromDb(pageNum, perPageNum);

    const meta: PaginationMeta = {
      total_items: total,
      total_pages: totalPages,
      page: pageNum,
      per_page: perPageNum,
    };

    return createSuccess(res, 200, 'Teachers fetched successfully', { teachers, meta });
  } catch (err) {
    return next(err);
  }
};

export const getTeacherById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!id) return next(new createError.BadRequest('Teacher ID is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Only admins can view teacher details
  if (currentUser.role !== 'ADMIN') {
    return next(new createError.Forbidden('Access denied. Only admins can view teacher details.'));
  }

  try {
    const teacher = await getTeacherByIdFromDb(id);

    if (!teacher) {
      return next(new createError.NotFound('Teacher not found'));
    }

    return createSuccess(res, 200, 'Teacher fetched successfully', { teacher });
  } catch (err) {
    return next(err);
  }
};

export const updateTeacherById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const updateData = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    role?: Role;
    section?: string;
    grade?: string;
    matric_no?: string;
  };

  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!id) return next(new createError.BadRequest('Teacher ID is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Only admins can update teachers
  if (currentUser.role !== 'ADMIN') {
    return next(new createError.Forbidden('Access denied. Only admins can update teachers.'));
  }

  try {
    const updatedTeacher = await updateTeacherInDb(id, updateData);

    // Audit log
    await createAuditLog(user_id, 'TEACHER_UPDATED', `Teacher ${updatedTeacher.email} updated by admin`);

    return createSuccess(res, 200, 'Teacher updated successfully', { teacher: updatedTeacher });
  } catch (err) {
    return next(err);
  }
};

export const deleteTeacherById = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { password } = req.body;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!id) return next(new createError.BadRequest('Teacher ID is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Only admins can delete teachers
  if (currentUser.role !== 'ADMIN') {
    return next(new createError.Forbidden('Access denied. Only admins can delete teachers.'));
  }

  try {
    // Check if teacher exists
    const teacher = await getTeacherByIdFromDb(id);
    if (!teacher) {
      return next(new createError.NotFound('Teacher not found'));
    }

    // Verify teacher's password before deletion
    if (!password) {
      return next(new createError.BadRequest('Teacher password is required for deletion confirmation'));
    }

    // Get teacher's stored password hash
    const teacherRecord = await prisma.staff.findUnique({
      where: { id },
      select: { password: true, email: true }
    });

    if (!teacherRecord) {
      return next(new createError.NotFound('Teacher not found'));
    }

    // Verify password
    const { validatePassword } = await import('../helpers/password.helper');
    const isPasswordValid = await validatePassword(password, teacherRecord.password);

    if (!isPasswordValid) {
      return next(new createError.BadRequest('Invalid teacher password. Deletion cancelled.'));
    }

    await deleteTeacherFromDb(id);

    // Audit log
    await createAuditLog(user_id, 'TEACHER_DELETED', `Teacher ${teacher.email} deleted by admin after password verification`);

    return createSuccess(res, 200, 'Teacher deleted successfully', { deleted: true });
  } catch (err) {
    return next(err);
  }
};

// Approve or reject teacher registration
export const approveOrRejectTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { action, reason } = req.body; // action: 'approve' | 'reject', reason: optional string
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!id) return next(new createError.BadRequest('Teacher ID is required'));
  if (!action || !['approve', 'reject'].includes(action)) {
    return next(new createError.BadRequest('Action must be either "approve" or "reject"'));
  }

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Only admins can approve/reject teachers
  if (currentUser.role !== 'ADMIN') {
    return next(new createError.Forbidden('Access denied. Only admins can approve or reject teachers.'));
  }

  try {
    // Check if teacher exists
    const teacher = await getTeacherByIdFromDb(id);
    if (!teacher) {
      return next(new createError.NotFound('Teacher not found'));
    }

    // Check if teacher is in pending status
    const teacherRecord = await prisma.staff.findUnique({
      where: { id },
      select: { approval_status: true as any, email: true, firstName: true, lastName: true }
    });

    if (!teacherRecord) {
      return next(new createError.NotFound('Teacher not found'));
    }

    if ((teacherRecord as any).approval_status !== 'PENDING') {
      return next(new createError.BadRequest('Teacher is not in pending status'));
    }

    if (action === 'approve') {
      // Update teacher status to APPROVED
      await prisma.staff.update({
        where: { id },
        data: { approval_status: 'APPROVED' as any }
      });

      // Audit log
      await createAuditLog(user_id, 'TEACHER_APPROVED',
        `Teacher ${teacher.email} approved by admin`);

      // Send approval email
      const teacherName = `${teacherRecord.firstName} ${teacherRecord.lastName}`;
      sendTeacherApprovalEmail(teacherRecord.email, teacherName).catch(err => {
        console.error('Failed to send teacher approval email:', err);
      });

      return createSuccess(res, 200, 'Teacher approved successfully', {
        teacherId: id,
        action: 'approve',
        status: 'APPROVED'
      });
    } else {
      // For rejection, delete the teacher entirely
      await deleteTeacherFromDb(id);

      // Audit log
      await createAuditLog(user_id, 'TEACHER_REJECTED_DELETED',
        `Teacher ${teacher.email} rejected and deleted by admin${reason ? `. Reason: ${reason}` : ''}`);

      // Send rejection email
      const teacherName = `${teacherRecord.firstName} ${teacherRecord.lastName}`;
      sendTeacherRejectionEmail(teacherRecord.email, teacherName, reason).catch(err => {
        console.error('Failed to send teacher rejection email:', err);
      });

      return createSuccess(res, 200, 'Teacher rejected and removed successfully', {
        teacherId: id,
        action: 'reject',
        status: 'DELETED',
        reason
      });
    }
  } catch (err) {
    return next(err);
  }
};

// Get pending teacher approvals
export const getPendingTeachers = async (req: Request, res: Response, next: NextFunction) => {
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Only admins can view pending teachers
  if (currentUser.role !== 'ADMIN') {
    return next(new createError.Forbidden('Access denied. Only admins can view pending teachers.'));
  }

  try {
    const pendingTeachers = await prisma.staff.findMany({
      where: {
        role: 'TEACHER',
        approval_status: 'PENDING' as any
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        approval_status: true as any,
        section: true,
        grade: true,
        matric_no: true,
        created_at: true
      },
      orderBy: { created_at: 'desc' }
    });

    // Add cache-control headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return createSuccess(res, 200, 'Pending teachers fetched successfully', { teachers: pendingTeachers });
  } catch (err) {
    return next(err);
  }
};

export const importTeachers = [
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    const user_id = (req.user as JwtPayload)?.id;

    if (!user_id) return next(new createError.Unauthorized('User not authenticated'));

    // Get the current user's role
    const currentUser = await prisma.staff.findUnique({
      where: { id: user_id },
      select: { role: true }
    });

    if (!currentUser) {
      return next(new createError.Unauthorized('User not found'));
    }

    // Only admins can import teachers
    if (currentUser.role !== 'ADMIN') {
      return next(new createError.Forbidden('Access denied. Only admins can import teachers.'));
    }

    if (!req.file) {
      return next(new createError.BadRequest('No file uploaded'));
    }

    try {
      const csvData = req.file.buffer.toString('utf-8');
      const result = await importTeachersFromCsv(csvData);

      // Audit log
      await createAuditLog(user_id, 'TEACHERS_IMPORTED', `${result.imported} teachers imported via CSV by admin`);

      return createSuccess(res, 200, 'Teachers imported successfully', {
        message: `${result.imported} teachers imported successfully`,
        imported: result.imported,
        errors: result.errors,
      });
    } catch (err: any) {
      return next(new createError.BadRequest(err.message));
    }
  },
];

export const sendWelcomeEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!id) return next(new createError.BadRequest('Teacher ID is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Only admins can send welcome emails
  if (currentUser.role !== 'ADMIN') {
    return next(new createError.Forbidden('Access denied. Only admins can send welcome emails.'));
  }

  try {
    // Check if teacher exists
    const teacher = await getTeacherByIdFromDb(id);
    if (!teacher) {
      return next(new createError.NotFound('Teacher not found'));
    }

    // Send welcome email
    sendTeacherWelcomeEmail(teacher.email, teacher.name).catch(err => {
      console.error('Failed to send teacher welcome email:', err);
    });

    // Audit log
    await createAuditLog(user_id, 'WELCOME_EMAIL_SENT', `Welcome email sent to teacher ${teacher.email}`);

    return createSuccess(res, 200, 'Welcome email sent successfully', { teacherId: id });
  } catch (err) {
    return next(err);
  }
};