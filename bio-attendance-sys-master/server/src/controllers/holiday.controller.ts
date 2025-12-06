import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { createSuccess } from '../helpers/http.helper';
import createError from 'http-errors';
import {
  getHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from '../services/holiday.service';
import { prisma } from '../db/prisma-client';

export const getAllHolidays = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const holidays = await getHolidays();
    return createSuccess(res, 200, 'Holidays fetched successfully', { holidays });
  } catch (err) {
    return next(err);
  }
};

export const getHoliday = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!id) return next(new createError.BadRequest('Holiday ID is required'));

  try {
    const holiday = await getHolidayById(id);
    return createSuccess(res, 200, 'Holiday fetched successfully', { holiday });
  } catch (err) {
    return next(err);
  }
};

export const addHoliday = async (req: Request, res: Response, next: NextFunction) => {
  const { date, name, type } = req.body as { date: string; name: string; type?: string };
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!date || !name) return next(new createError.BadRequest('Date and name are required'));

  // Check if user is admin or teacher
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'TEACHER')) {
    return next(new createError.Forbidden('Only admins and teachers can manage holidays'));
  }

  try {
    const holiday = await createHoliday({ date, name, type });
    return createSuccess(res, 201, 'Holiday created successfully', { holiday });
  } catch (err) {
    return next(err);
  }
};

export const editHoliday = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { date, name, type } = req.body as { date?: string; name?: string; type?: string };
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!id) return next(new createError.BadRequest('Holiday ID is required'));

  // Check if user is admin or teacher
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'TEACHER')) {
    return next(new createError.Forbidden('Only admins and teachers can manage holidays'));
  }

  try {
    const holiday = await updateHoliday(id, { date, name, type });
    return createSuccess(res, 200, 'Holiday updated successfully', { holiday });
  } catch (err) {
    return next(err);
  }
};

export const removeHoliday = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!id) return next(new createError.BadRequest('Holiday ID is required'));

  // Check if user is admin or teacher
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'TEACHER')) {
    return next(new createError.Forbidden('Only admins and teachers can manage holidays'));
  }

  try {
    await deleteHoliday(id);
    return createSuccess(res, 200, 'Holiday deleted successfully', { deleted: true });
  } catch (err) {
    return next(err);
  }
};