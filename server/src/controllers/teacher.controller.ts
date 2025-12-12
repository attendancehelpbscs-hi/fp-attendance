import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import bcrypt from 'bcrypt';
import { getTeachersFromDb, getTeacherById, createTeacher, updateTeacher, deleteTeacher, getPendingTeachersFromDb, approveTeacher } from '../services/teacher.service';

interface PaginationMeta {
  total_items: number;
  total_pages: number;
  page: number;
  per_page: number;
}

export const getTeachers = async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, per_page = 10 } = req.query;

  try {
    const result = await getTeachersFromDb(Number(page), Number(per_page));

    const meta: PaginationMeta = {
      total_items: result.totalCount,
      total_pages: result.totalPages,
      page: result.currentPage,
      per_page: result.perPage,
    };

    return res.status(200).json({
      success: true,
      message: 'Teachers fetched successfully',
      data: { teachers: result.teachers, meta }
    });
  } catch (err) {
    next(err);
  }
};

export const getTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) return next(new createError.BadRequest('Teacher ID is required'));

  try {
    const teacher = await getTeacherById(id);

    if (!teacher) return next(new createError.NotFound('Teacher not found'));

    return res.status(200).json({
      success: true,
      message: 'Teacher fetched successfully',
      data: { teacher }
    });
  } catch (err) {
    next(err);
  }
};

export const addTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, section } = req.body;

  if (!name || !email || !password) {
    return next(new createError.BadRequest('Name, email, and password are required'));
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    const teacher = await createTeacher({
      name,
      email,
      password: hashedPassword,
      section
    });

    return res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: { teacher }
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return next(new createError.Conflict('Email already exists'));
    }
    next(err);
  }
};

export const editTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, email, section } = req.body;

  if (!id) return next(new createError.BadRequest('Teacher ID is required'));

  try {
    const teacher = await updateTeacher(id, { name, email, section });

    return res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
      data: { teacher }
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return next(new createError.NotFound('Teacher not found'));
    }
    if (err.code === 'P2002') {
      return next(new createError.Conflict('Email already exists'));
    }
    next(err);
  }
};

export const removeTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) return next(new createError.BadRequest('Teacher ID is required'));

  try {
    await deleteTeacher(id);

    return res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return next(new createError.NotFound('Teacher not found'));
    }
    next(err);
  }
};

export const getPendingTeachers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const teachers = await getPendingTeachersFromDb();

    return res.status(200).json({
      success: true,
      message: 'Pending teachers fetched successfully',
      teachers
    });
  } catch (err) {
    next(err);
  }
};

export const approveOrRejectTeacher = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { action, reason } = req.body;

  if (!id) return next(new createError.BadRequest('Teacher ID is required'));
  if (!action || !['approve', 'reject'].includes(action)) {
    return next(new createError.BadRequest('Valid action (approve/reject) is required'));
  }

  try {
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const teacher = await approveTeacher(id, status, reason);

    return res.status(200).json({
      success: true,
      message: `Teacher ${action}d successfully`,
      data: { teacher }
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return next(new createError.NotFound('Teacher not found'));
    }
    next(err);
  }
};