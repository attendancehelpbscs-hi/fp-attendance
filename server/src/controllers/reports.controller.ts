import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import { markAbsentForUnmarkedDays } from '../services/attendance.service';
import { generateMonthlySummaryExcel } from '../services/monthly-summary-excel.service';
import { generateMonthlySummaryPDF } from '../services/monthly-summary-pdf.service';
import { generateStudentReportExcel } from '../services/student-report-excel.service';
import { generateStudentReportPDF } from '../services/student-report-pdf.service';

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

export const exportMonthlySummaryExcel = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, year, session } = req.query as { grade?: string; section?: string; year?: string; session?: string };

  console.log('exportMonthlySummaryExcel called with staff_id:', staff_id, 'query:', { grade, section, year, session });

  if (!staff_id || staff_id.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Staff ID is required for export'
    });
  }

  try {
    // Get the monthly summary data
    const summaryData = await getMonthlyAttendanceSummaryData(staff_id, {
      grade,
      section,
      year: year ? parseInt(year) : new Date().getFullYear(),
      session
    });

    const buffer = await generateMonthlySummaryExcel(summaryData);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=monthly-attendance-summary-${year || new Date().getFullYear()}.xlsx`);

    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Error in exportMonthlySummaryExcel:', err);
    next(err);
  }
};

export const exportMonthlySummaryPDF = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, year, session } = req.query as { grade?: string; section?: string; year?: string; session?: string };

  if (!staff_id || staff_id.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Staff ID is required for export'
    });
  }

  try {
    // Get the monthly summary data
    const summaryData = await getMonthlyAttendanceSummaryData(staff_id, {
      grade,
      section,
      year: year ? parseInt(year) : new Date().getFullYear(),
      session
    });

    const buffer = await generateMonthlySummaryPDF(summaryData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=monthly-attendance-summary-${year || new Date().getFullYear()}.pdf`);

    return res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
};

export const exportStudentReportExcel = async (req: Request, res: Response, next: NextFunction) => {
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

    const reportData = {
      student,
      attendanceRecords: records
    };

    const buffer = await generateStudentReportExcel(reportData);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=student-attendance-report-${student.name.replace(/\s+/g, '-')}.xlsx`);

    return res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
};

export const exportStudentReportPDF = async (req: Request, res: Response, next: NextFunction) => {
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

    const reportData = {
      student,
      attendanceRecords: records
    };

    const buffer = await generateStudentReportPDF(reportData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=student-attendance-report-${student.name.replace(/\s+/g, '-')}.pdf`);

    return res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
};

// Helper function to get monthly attendance summary data
const getMonthlyAttendanceSummaryData = async (staffId: string, options: { grade?: string; section?: string; year: number; session?: string }) => {
  const { grade, section, year, session } = options;

  // Get students based on filters
  const studentWhere: any = { staff_id: staffId };
  if (grade) studentWhere.grade = grade;

  const students = await prisma.student.findMany({
    where: studentWhere,
    include: {
      courses: {
        include: { course: true }
      }
    }
  });

  // Filter by section if specified
  let filteredStudents = students;
  if (section) {
    filteredStudents = students.filter((s: any) =>
      s.courses.some((c: any) => c.course.course_code === section)
    );
  }

  const totalStudents = filteredStudents.length;

  // Generate monthly summaries for the year
  const monthlySummaries = [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  for (let month = 1; month <= 12; month++) {
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // Get school days for this month (weekdays)
    const schoolDays = [];
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        schoolDays.push(d.toISOString().split('T')[0]);
      }
    }

    // Get attendance data for this month
    const attendanceData = await prisma.studentAttendance.findMany({
      where: {
        student_id: { in: filteredStudents.map((s: any) => s.id) },
        attendance: {
          date: {
            gte: monthStart.toISOString().split('T')[0],
            lte: monthEnd.toISOString().split('T')[0]
          }
        },
        ...(session && session !== 'all' ? { session_type: session as any } : {})
      },
      include: {
        attendance: true,
        student: true
      }
    });

    // Calculate statistics
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;

    // Process daily data
    const days = [];
    for (const dateStr of schoolDays) {
      const dayAttendances = attendanceData.filter((a: any) => a.attendance.date === dateStr);
      const present = dayAttendances.filter((a: any) => a.status === 'present').length;
      const absent = filteredStudents.length - present;
      const late = dayAttendances.filter((a: any) => a.status === 'present' && a.time_type === 'IN' && a.created_at.getHours() >= 8).length;

      presentDays += present;
      absentDays += absent;
      lateDays += late;

      days.push({
        date: dateStr,
        isWeekend: false,
        isHoliday: false, // TODO: Check holidays
        present,
        absent,
        late,
        total: filteredStudents.length
      });
    }

    const absencePercentage = schoolDays.length > 0 ? (absentDays / (totalStudents * schoolDays.length)) * 100 : 0;
    const latePercentage = schoolDays.length > 0 ? (lateDays / (totalStudents * schoolDays.length)) * 100 : 0;

    monthlySummaries.push({
      month: monthNames[month - 1],
      monthKey: month.toString(),
      totalStudents,
      schoolDays: schoolDays.length,
      presentDays,
      absentDays,
      lateDays,
      absencePercentage,
      latePercentage,
      days
    });
  }

  return {
    year,
    totalStudents,
    monthlySummaries
  };
};