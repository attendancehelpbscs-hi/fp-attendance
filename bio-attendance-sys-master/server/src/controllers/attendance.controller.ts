import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { createSuccess } from '../helpers/http.helper';
import createError from 'http-errors';
import {
  removeAttendanceFromDb,
  saveAttendanceToDb,
  updateAttendanceInDb,
  fetchOneAttendance,
  removeAllStudentAttendance,
} from '../services/attendance.service';
import { prisma } from '../db/prisma-client';
import type { Attendance, StudentAttendance } from '@prisma/client';
import type { PaginationMeta } from '../interfaces/helper.interface';
import { markStudentAttendance, fetchAttendanceStudents, checkIfStudentIsMarked } from '../services/attendance.service';

export const getAttendances = async (req: Request, res: Response, next: NextFunction) => {
  // get attendances that belongs to single staff
  const { staff_id } = req.params;
  const { per_page, page } = req.query;
  const user_id = (req.user as JwtPayload).id;
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (staff_id !== user_id) return next(new createError.Forbidden('Access denied'));
  if (!per_page || !page) return next(new createError.BadRequest('Pagination info is required'));
  try {
    const attendanceCount = await prisma.attendance.count({
      where: {
        staff_id,
      },
    });
    const attendances = await prisma.attendance.findMany({
      where: {
        staff_id,
      },
      skip: (Number(page) - 1) * Number(per_page),
      take: (Number(page) - 1) * Number(per_page) + Number(per_page),
      orderBy: {
        created_at: 'desc',
      },

    });
    const meta: PaginationMeta = {
      total_items: attendanceCount,
      total_pages: Math.ceil(attendanceCount / Number(per_page)) || 1,
      page: Number(page),
      per_page: Number(per_page),
    };

    return createSuccess(res, 200, 'Attendance fetched successfully', { attendances, meta });
  } catch (err) {
    return next(err);
  }
};

export const getAttendanceList = async (req: Request, res: Response, next: NextFunction) => {
  const { attendance_id } = req.params;
  if (!attendance_id) return next(new createError.BadRequest('Attendance ID is required'));
  try {
    const attendanceList = await fetchAttendanceStudents(attendance_id);
    return createSuccess(res, 200, 'Attendance fetched successfully', { attendanceList });
  } catch (err) {
    return next(err);
  }
};

export const getSingleAttendance = async (req: Request, res: Response, next: NextFunction) => {
  // get attendances that belongs to single staff
  const { id } = req.params;
  if (!id) return next(new createError.BadRequest('Attendance ID is required'));
  try {
    const attendance = await fetchOneAttendance(id);
    return createSuccess(res, 200, 'Attendance fetched successfully', { attendance });
  } catch (err) {
    return next(err);
  }
};

export const addStudentToAttendance = async (req: Request, res: Response, next: NextFunction) => {
  // create attendance
  const { attendance_id, student_id, time_type, section } = req.body as { attendance_id: string; student_id: string; time_type: 'IN' | 'OUT'; section: string };

  if (!attendance_id || !student_id || !time_type || !section) return next(new createError.BadRequest('Attendance ID, student ID, time type, and section are required'));

  try {
    const courseExists = await checkIfStudentIsMarked({ attendance_id, student_id });
    if (courseExists) {
      return next(
        createError(
          400,
          ...[
            {
              message: 'Student has already been marked.',
              errorType: 'STUDENT_ALREADY_MARKED',
            },
          ],
        ),
      );
    }
    await markStudentAttendance({ attendance_id, student_id, time_type, section });
    return createSuccess(res, 200, 'Attendance created successfully', {
      marked: true,
    });
  } catch (err) {
    return next(err);
  }
};

export const createAttendance = async (req: Request, res: Response, next: NextFunction) => {
  // create attendance
  const { name, date, staff_id } = req.body as Pick<Attendance, 'name' | 'date' | 'staff_id'>;
  const user_id = (req.user as JwtPayload).id;

  if (staff_id !== user_id) {
    return next(createError(403, 'Access denied'));
  }

  try {
    const newAttendance = { staff_id, name, date, created_at: new Date() };
    const savedAttendance = await saveAttendanceToDb(newAttendance);
    const attendanceToSend = await fetchOneAttendance(savedAttendance.id);
    return createSuccess(res, 200, 'Attendance created successfully', {
      attendance: attendanceToSend,
    });
  } catch (err) {
    return next(err);
  }
};

export const updateAttendance = async (req: Request, res: Response, next: NextFunction) => {
  // update attendance
  const { id } = req.params;
  if (!id) return next(createError(400, 'No attendance ID provided'));
  const newUpdate = req.body as Partial<Attendance>;
  try {
    const updatedAttendance = await updateAttendanceInDb(id, newUpdate);
    return createSuccess(res, 200, 'Attendance updated successfully', { attendance: updatedAttendance });
  } catch (err) {
    return next(err);
  }
};

export const deleteAttendance = async (req: Request, res: Response, next: NextFunction) => {
  // delete attendance
  const { id } = req.params;
  if (!id) return next(createError(400, 'No attendance ID provided'));
  try {
    await removeAllStudentAttendance(id);
    await removeAttendanceFromDb(id);
    return createSuccess(res, 200, 'Attendance deleted successfully', { deleted: true });
  } catch (err) {
    return next(err);
  }
};
