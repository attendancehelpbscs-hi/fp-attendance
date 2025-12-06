import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import { markAbsentForUnmarkedDays } from '../services/attendance.service';

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { startDate, endDate, grade, section } = req.query as { startDate?: string; endDate?: string; grade?: string; section?: string };

  try {
    // Mark absents for the date range
    if (staff_id) {
      const dates = [];
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
        }
      } else if (endDate) {
        dates.push(endDate);
      }

      for (const date of dates) {
        await markAbsentForUnmarkedDays(staff_id, date);
      }
    }

    // Get attendance data
    const where: any = { student: { staff_id } };
    if (startDate && endDate) {
      where.attendance = {
        date: {
          gte: startDate,
          lte: endDate
        }
      };
    } else if (endDate) {
      where.attendance = { date: endDate };
    }

    if (grade) {
      where.student = { ...where.student, grade };
    }

    const studentAttendances = await prisma.studentAttendance.findMany({
      where,
      include: {
        student: true,
        attendance: true,
      },
      orderBy: { created_at: 'desc' }
    });

    // Process the data
    const reports = studentAttendances.map((sa: any) => ({
      student_id: sa.student_id,
      student_name: sa.student.name,
      matric_no: sa.student.matric_no,
      grade: sa.student.grade,
      section: sa.section,
      date: sa.attendance.date,
      status: sa.status,
      time_type: sa.time_type,
      created_at: sa.created_at
    }));

    return res.status(200).json({
      success: true,
      message: 'Reports fetched successfully',
      data: reports
    });
  } catch (err) {
    next(err);
  }
};

export const getStudentReports = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id, student_id } = req.params;
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  try {
    // Mark absents for the date range
    if (staff_id) {
      const dates = [];
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
        }
      } else if (endDate) {
        dates.push(endDate);
      }

      for (const date of dates) {
        await markAbsentForUnmarkedDays(staff_id, date);
      }
    }

    const student = await prisma.student.findUnique({
      where: { id: student_id },
      select: { id: true, name: true, matric_no: true, grade: true }
    });

    if (!student) throw createError.NotFound('Student not found');

    const where: any = { student_id };
    if (startDate && endDate) {
      where.attendance = {
        date: {
          gte: startDate,
          lte: endDate
        }
      };
    } else if (endDate) {
      where.attendance = { date: endDate };
    }

    const attendanceRecords = await prisma.studentAttendance.findMany({
      where,
      include: { attendance: true },
      orderBy: { created_at: 'desc' }
    });

    const records = attendanceRecords.map((record: any) => ({
      date: record.attendance.date,
      status: record.status,
      time_type: record.time_type,
      section: record.section,
      created_at: record.created_at
    }));

    return res.status(200).json({
      success: true,
      message: 'Student reports fetched successfully',
      data: {
        student,
        attendanceRecords: records
      }
    });
  } catch (err) {
    next(err);
  }
};