import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { JwtPayload } from 'jsonwebtoken';
import { prisma } from '../db/prisma-client';
import {
  fetchOneAttendance,
  saveAttendanceToDb,
  markStudentAttendance,
  manualMarkStudentAttendance,
  removeAllStudentAttendance,
  checkIfStudentIsMarked,
  checkIfStudentIsPresent,
  fetchAttendanceStudents,
  removeAttendanceFromDb,
  updateAttendanceInDb,
  markAbsentForUnmarkedDays
} from '../services/attendance.service';

interface PaginationMeta {
  total_items: number;
  total_pages: number;
  page: number;
  per_page: number;
}

export const getAttendances = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { per_page, page } = req.query;
  const currentUser = (req as any).user;

  try {
    // For admin users, fetch all attendances; for teachers, only their own
    const whereClause = currentUser.role === 'ADMIN' ? {} : { staff_id };

    const attendanceCount = await prisma.attendance.count({
      where: whereClause,
    });

    const perPage = Number(per_page) || 10;
    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      skip: (Number(page) - 1) * perPage,
      take: perPage,
    });

    const meta: PaginationMeta = {
      total_items: attendanceCount,
      total_pages: Math.ceil(attendanceCount / perPage) || 1,
      page: Number(page),
      per_page: perPage,
    };

    return res.status(200).json({
      success: true,
      message: 'Attendance fetched successfully',
      data: { attendances, meta }
    });
  } catch (err) {
    next(err);
  }
};

export const getAttendanceList = async (req: Request, res: Response, next: NextFunction) => {
  const { attendance_id } = req.params;
  const { per_page, page } = req.query;
  if (!attendance_id) return next(new createError.BadRequest('Attendance ID is required'));
  if (!page) return next(new createError.BadRequest('Page is required'));
  try {
    const attendanceSession = await prisma.attendance.findUnique({ where: { id: attendance_id }, select: { staff_id: true } });
    if (!attendanceSession) return next(new createError.NotFound('Attendance not found'));
    const staffSettings = await prisma.staff.findUnique({ where: { id: attendanceSession.staff_id }, select: { school_start_time: true, grace_period_minutes: true } });
    const lateOptions = { lateTime: staffSettings?.school_start_time, gracePeriodMinutes: staffSettings?.grace_period_minutes };
    const attendanceList = await fetchAttendanceStudents(attendance_id);
    const annotatedList = attendanceList.map(record => ({
      ...record,
      lateOptions,
    }));

    const perPage = Number(per_page) || 10;
    const startIndex = (Number(page) - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedList = annotatedList.slice(startIndex, endIndex);

    const meta: PaginationMeta = {
      total_items: annotatedList.length,
      total_pages: Math.ceil(annotatedList.length / perPage) || 1,
      page: Number(page),
      per_page: perPage,
    };

    return res.status(200).json({
      success: true,
      message: 'Attendance fetched successfully',
      data: { attendanceList: paginatedList, meta }
    });
  } catch (err) {
    next(err);
  }
};

export const getSingleAttendance = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const attendance = await fetchOneAttendance(id);
    return res.status(200).json({
      success: true,
      message: 'Attendance fetched successfully',
      data: { attendance }
    });
  } catch (err) {
    next(err);
  }
};

export const addStudentToAttendance = async (req: Request, res: Response, next: NextFunction) => {
  const { attendance_id, student_id, time_type, section, status, session_type } = req.body as { attendance_id: string; student_id: string; time_type: 'IN' | 'OUT'; section: string; status?: 'present' | 'absent'; session_type?: 'AM' | 'PM' };
  const user_id = (req as any).user?.id;

  if (!attendance_id || !student_id || !time_type || !section) return next(new createError.BadRequest('Attendance ID, student ID, time type, and section are required'));

  try {
    const attendance = await fetchOneAttendance(attendance_id);
    if (attendance.staff_id !== user_id) return next(new createError.Forbidden('Access denied'));

    const finalStatus = status || 'present';

    await markStudentAttendance({ attendance_id, student_id, time_type, section, status: finalStatus, session_type });
    return res.status(200).json({
      success: true,
      message: 'Attendance created successfully',
    });
  } catch (err) {
    next(err);
  }
};

export const manualMarkAttendance = async (req: Request, res: Response, next: NextFunction) => {
  const { student_ids, attendance_id, dates, section } = req.body as { student_ids: string[]; attendance_id: string; dates: string[]; section?: string };
  const user_id = (req.user as JwtPayload)?.id;

  if (!student_ids || !attendance_id || !dates) return next(new createError.BadRequest('Student IDs, attendance ID, and dates are required'));
  if (!Array.isArray(student_ids) || student_ids.length === 0) return next(new createError.BadRequest('Student IDs must be a non-empty array'));

  try {
    const attendance = await fetchOneAttendance(attendance_id);
    if (attendance.staff_id !== user_id) return next(new createError.Forbidden('Access denied'));

    const markedRecords = await manualMarkStudentAttendance({ student_ids, attendance_id, status: 'absent', dates, section });
    return res.status(200).json({
      success: true,
      message: 'Manual attendance marked successfully',
      data: {
        marked: markedRecords.length,
        skipped: student_ids.length * dates.length - markedRecords.length
      }
    });
  } catch (err) {
    next(err);
  }
};

export const createAttendance = async (req: Request, res: Response, next: NextFunction) => {
  const { name, date, staff_id } = req.body as Pick<any, 'name' | 'date' | 'staff_id'>;
  const user_id = (req.user as JwtPayload)?.id;
  const currentUser = (req as any).user as JwtPayload;

  if (!name || !date || !staff_id) return next(new createError.BadRequest('Name, date, and staff ID are required'));

  const newAttendance = {
    name,
    date,
    staff_id,
    created_at: new Date()
  };

  // Allow admin to create attendance for any staff, teachers only for themselves
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    const savedAttendance = await saveAttendanceToDb(newAttendance);
    const attendanceToSend = await fetchOneAttendance(savedAttendance.id);
    return res.status(200).json({
      success: true,
      message: 'Attendance created successfully',
      data: {
        attendance: attendanceToSend,
      }
    });
  } catch (err) {
    next(err);
  }
};

export const updateAttendance = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!id) return next(createError(400, 'No attendance ID provided'));
  const newUpdate = req.body as Partial<any>;

  try {
    const updatedAttendance = await updateAttendanceInDb(id, newUpdate);
    return res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: { attendance: updatedAttendance }
    });
  } catch (err) {
    next(err);
  }
};

export const deleteAttendance = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  if (!id) return next(createError(400, 'No attendance ID provided'));
  try {
    await removeAttendanceFromDb(id);
    return res.status(200).json({
      success: true,
      message: 'Attendance deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

export const markAbsentForUnmarkedDaysController = async (req: Request, res: Response, next: NextFunction) => {
  const { date } = req.body;
  const user_id = (req.user as JwtPayload)?.id;

  if (!date) return next(new createError.BadRequest('Date is required'));

  try {
    await markAbsentForUnmarkedDays(user_id, date);
    return res.status(200).json({
      success: true,
      message: 'Absent marking completed successfully'
    });
  } catch (err) {
    next(err);
  }
};