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
  markStudentAttendance,
  fetchAttendanceStudents,
  checkIfStudentIsMarked,
  manualMarkStudentAttendance,
} from '../services/attendance.service';
import { prisma } from '../db/prisma-client';
import type { Attendance, StudentAttendance } from '@prisma/client';
import type { PaginationMeta } from '../interfaces/helper.interface';

export const getAttendances = async (req: Request, res: Response, next: NextFunction) => {
  // get attendances that belongs to single staff
  const { staff_id } = req.params;
  const { per_page, page } = req.query;
  const user_id = (req.user as JwtPayload).id;
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (staff_id !== user_id) return next(new createError.Forbidden('Access denied'));
  if (!page) return next(new createError.BadRequest('Page is required'));
  try {
    const attendanceCount = await prisma.attendance.count({
      where: {
        staff_id,
      },
    });
    const perPage = Number(per_page) || 10;
    const attendances = await prisma.attendance.findMany({
      where: {
        staff_id,
      },
      skip: (Number(page) - 1) * perPage,
      take: perPage,
      orderBy: {
        created_at: 'desc',
      },

    });
    const meta: PaginationMeta = {
      total_items: attendanceCount,
      total_pages: Math.ceil(attendanceCount / perPage) || 1,
      page: Number(page),
      per_page: perPage,
    };

    return createSuccess(res, 200, 'Attendance fetched successfully', { attendances, meta });
  } catch (err) {
    return next(err);
  }
};

export const getAttendanceList = async (req: Request, res: Response, next: NextFunction) => {
  const { attendance_id } = req.params;
  const { per_page, page } = req.query;
  if (!attendance_id) return next(new createError.BadRequest('Attendance ID is required'));
  if (!page) return next(new createError.BadRequest('Page is required'));
  try {
    const attendanceList = await fetchAttendanceStudents(attendance_id);
    const totalItems = attendanceList.length;
    const perPage = Number(per_page) || 10;
    const totalPages = Math.ceil(totalItems / perPage) || 1;
    const startIndex = (Number(page) - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedList = attendanceList.slice(startIndex, endIndex);

    const meta = {
      total_items: totalItems,
      total_pages: totalPages,
      page: Number(page),
      per_page: perPage,
    };

    return createSuccess(res, 200, 'Attendance fetched successfully', { attendanceList: paginatedList, meta });
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
  const { attendance_id, student_id, time_type, section, status } = req.body as { attendance_id: string; student_id: string; time_type: 'IN' | 'OUT'; section: string; status?: 'present' | 'absent' };
  const user_id = (req.user as JwtPayload).id;

  if (!attendance_id || !student_id || !time_type || !section) return next(new createError.BadRequest('Attendance ID, student ID, time type, and section are required'));

  try {
    const courseExists = await checkIfStudentIsMarked({ attendance_id, student_id, time_type });
    if (courseExists) {
      return next(
        createError(
          400,
          ...[
            {
              message: 'Student has already been marked for this time type.',
              errorType: 'STUDENT_ALREADY_MARKED',
            },
          ],
        ),
      );
    }

    // Use provided status or default to present
    const finalStatus = status || 'present';

    await markStudentAttendance({ attendance_id, student_id, time_type, section, status: finalStatus });
    return createSuccess(res, 200, 'Attendance created successfully', {
      marked: true,
      status: finalStatus,
    });
  } catch (err) {
    return next(err);
  }
};

export const manualMarkAttendance = async (req: Request, res: Response, next: NextFunction) => {
  const { student_ids, attendance_id, dates, section } = req.body as { student_ids: string[]; attendance_id: string; dates: string[]; section?: string };
  const user_id = (req.user as JwtPayload).id;
  const status: 'present' = 'present'; // Always present in simplified system

  if (!student_ids || !attendance_id || !dates) return next(new createError.BadRequest('Student IDs, attendance ID, and dates are required'));
  if (!Array.isArray(student_ids) || student_ids.length === 0) return next(new createError.BadRequest('Student IDs must be a non-empty array'));
  if (!Array.isArray(dates) || dates.length === 0) return next(new createError.BadRequest('Dates must be a non-empty array'));

  try {
    // Verify attendance belongs to the staff member
    const attendance = await fetchOneAttendance(attendance_id);
    if (attendance.staff_id !== user_id) return next(new createError.Forbidden('Access denied'));

    const markedRecords = await manualMarkStudentAttendance({ student_ids, attendance_id, status, dates, section });
    return createSuccess(res, 200, 'Manual attendance marked successfully', {
      marked: markedRecords.length,
      skipped: student_ids.length * dates.length - markedRecords.length,
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



export const markAbsentForUnmarkedDays = async (req: Request, res: Response, next: NextFunction) => {
  const { date } = req.body;
  const user_id = (req.user as JwtPayload).id;

  if (!date) return next(new createError.BadRequest('Date is required'));

  try {
    const { markAbsentForUnmarkedDays: markAbsent } = await import('../services/attendance.service');
    await markAbsent(user_id, date);

    return createSuccess(res, 200, 'Absent marking completed for unmarked days', { processed: true });
  } catch (err) {
    return next(err);
  }
};
