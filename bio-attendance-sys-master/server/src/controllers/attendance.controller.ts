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
  const { per_page, page } = req.query;
  if (!attendance_id) return next(new createError.BadRequest('Attendance ID is required'));
  if (!per_page || !page) return next(new createError.BadRequest('Pagination info is required'));
  try {
    const attendanceList = await fetchAttendanceStudents(attendance_id);
    const totalItems = attendanceList.length;
    const totalPages = Math.ceil(totalItems / Number(per_page)) || 1;
    const startIndex = (Number(page) - 1) * Number(per_page);
    const endIndex = startIndex + Number(per_page);
    const paginatedList = attendanceList.slice(startIndex, endIndex);

    const meta = {
      total_items: totalItems,
      total_pages: totalPages,
      page: Number(page),
      per_page: Number(per_page),
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
  const { attendance_id, student_id, time_type, section } = req.body as { attendance_id: string; student_id: string; time_type: 'IN' | 'OUT'; section: string };
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

    // Get staff settings for attendance rules
    const staff = await prisma.staff.findUnique({
      where: { id: user_id },
      select: { grace_period_minutes: true, school_start_time: true, late_threshold_hours: true }
    });

    if (!staff) return next(new createError.NotFound('Staff not found'));

    // Determine status based on current time and settings
    const currentTime = new Date();
    const { determineAttendanceStatus } = await import('../services/attendance.service');
    const status = determineAttendanceStatus(currentTime, staff.school_start_time, staff.grace_period_minutes, staff.late_threshold_hours);

    await markStudentAttendance({ attendance_id, student_id, time_type, section, status });
    return createSuccess(res, 200, 'Attendance created successfully', {
      marked: true,
      status,
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
