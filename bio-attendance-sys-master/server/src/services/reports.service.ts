import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import type { StudentAttendance } from '@prisma/client';

export const getAttendanceReports = async (staff_id: string, filters: { grade?: string; section?: string; dateRange?: string }) => {
  try {
    const where: any = {
      staff_id,
    };

    if (filters.grade) where.grade = filters.grade;
    if (filters.section) where.section = filters.section;

    // Handle dateRange if provided
    if (filters.dateRange) {
      const [startDate, endDate] = filters.dateRange.split(' - ');
      where.attendances = {
        some: {
          attendance: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      };
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        attendances: {
          include: {
            attendance: true,
          },
        },
      },
    });

    return students.map(student => ({
      student_id: student.id,
      name: student.name,
      matric_no: student.matric_no,
      grade: student.grade,
      attendances: student.attendances.map(sa => ({
        date: sa.attendance.date,
        status: sa.status,
        time_type: sa.time_type,
        section: sa.section,
        created_at: sa.created_at,
      })),
    }));
  } catch (err) {
    throw err;
  }
};

export const getAttendanceSummary = async (staff_id: string, filters: { grade?: string; section?: string; dateRange?: string }) => {
  try {
    const reports = await getAttendanceReports(staff_id, filters);

    const totalStudents = reports.length;
    const totalAttendances = reports.reduce((sum, report) => sum + report.attendances.length, 0);
    const averageAttendance = totalStudents > 0 ? totalAttendances / totalStudents : 0;

    return {
      totalStudents,
      totalAttendances,
      averageAttendance,
    };
  } catch (err) {
    throw err;
  }
};

export const getUniqueGradesAndSections = async (staff_id: string) => {
  try {
    const grades = await prisma.student.findMany({
      where: { staff_id },
      select: { grade: true },
      distinct: ['grade'],
    });

    const sections = await prisma.studentAttendance.findMany({
      where: {
        student: { staff_id },
      },
      select: { section: true },
      distinct: ['section'],
    });

    return {
      grades: grades.map(g => g.grade).sort(),
      sections: sections.map(s => s.section).sort(),
    };
  } catch (err) {
    throw err;
  }
};

export const getPreviousPeriodReports = async (staff_id: string, filters: { grade?: string; section?: string; dateRange?: string }) => {
  try {
    // Assuming previous period is the previous month
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const previousFilters = {
      ...filters,
      dateRange: `${previousMonth.toISOString().split('T')[0]} - ${previousMonthEnd.toISOString().split('T')[0]}`,
    };

    return await getAttendanceSummary(staff_id, previousFilters);
  } catch (err) {
    throw err;
  }
};

export const getStudentAttendanceReports = async (staff_id: string, filters: { student_id?: string; startDate?: string; endDate?: string; dateRange?: string }) => {
  try {
    const where: any = {
      student: { staff_id },
    };

    if (filters.student_id) where.student_id = filters.student_id;

    if (filters.dateRange) {
      const [startDate, endDate] = filters.dateRange.split(' - ');
      where.attendance = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    } else if (filters.startDate && filters.endDate) {
      where.attendance = {
        date: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      };
    }

    const studentAttendances = await prisma.studentAttendance.findMany({
      where,
      include: {
        student: true,
        attendance: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return studentAttendances.map(sa => ({
      student_id: sa.student_id,
      student_name: sa.student.name,
      matric_no: sa.student.matric_no,
      grade: sa.student.grade,
      date: sa.attendance.date,
      status: sa.status,
      time_type: sa.time_type,
      section: sa.section,
      created_at: sa.created_at,
    }));
  } catch (err) {
    throw err;
  }
};

export const getStudentAttendanceSummary = async (staff_id: string, filters: { student_id?: string; startDate?: string; endDate?: string; dateRange?: string }) => {
  try {
    const reports = await getStudentAttendanceReports(staff_id, filters);

    const totalDays = reports.length;
    const presentDays = reports.filter(r => r.status === 'present').length;
    const lateDays = reports.filter(r => r.status === 'late').length;
    const absentDays = reports.filter(r => r.status === 'absent').length;
    const attendanceRate = totalDays > 0 ? ((presentDays + lateDays) / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      attendanceRate,
    };
  } catch (err) {
    throw err;
  }
};

export const getSectionsForGrade = async (staff_id: string, grade: string): Promise<string[]> => {
  try {
    const studentAttendances = await prisma.studentAttendance.findMany({
      where: {
        student: {
          staff_id,
          grade,
        },
      },
      select: {
        section: true,
      },
      distinct: ['section'],
    });

    return studentAttendances.map(sa => sa.section).sort();
  } catch (err) {
    throw err;
  }
};

export const getStudentsForGradeAndSection = async (staff_id: string, grade: string, section: string): Promise<{ id: string; name: string; matric_no: string; grade: string; section: string }[]> => {
  try {
    const students = await prisma.student.findMany({
      where: {
        staff_id,
        grade,
        attendances: {
          some: {
            section,
          },
        },
      },
      select: {
        id: true,
        name: true,
        matric_no: true,
        grade: true,
      },
    });

    // Add section to each student
    return students.map(student => ({
      ...student,
      section,
    }));
  } catch (err) {
    throw err;
  }
};

export interface StudentDetailedReport {
  student: {
    id: string;
    name: string;
    matric_no: string;
    grade: string;
  };
  attendanceRecords: {
    date: string;
    status: 'present' | 'late' | 'absent';
    time_type: 'IN' | 'OUT' | null;
    section: string;
    created_at: string;
  }[];
  summaries: {
    weekly: {
      total_days: number;
      present_days: number;
      absent_days: number;
      attendance_rate: number;
    };
    monthly: {
      total_days: number;
      present_days: number;
      absent_days: number;
      attendance_rate: number;
    };
    yearly: {
      total_days: number;
      present_days: number;
      absent_days: number;
      attendance_rate: number;
    };
  };
}

export const getStudentDetailedReport = async (staff_id: string, student_id: string): Promise<StudentDetailedReport> => {
  try {
    // Get student info
    const student = await prisma.student.findFirst({
      where: {
        id: student_id,
        staff_id,
      },
      select: {
        id: true,
        name: true,
        matric_no: true,
        grade: true,
      },
    });

    if (!student) {
      throw createError.NotFound('Student not found');
    }

    // Get all attendance records for this student
    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: {
        student_id,
      },
      include: {
        attendance: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Transform records
    const records = attendanceRecords.map(record => ({
      date: record.attendance.date,
      status: record.status,
      time_type: record.time_type,
      section: record.section,
      created_at: record.created_at.toISOString(),
    }));

    // Calculate summaries
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentWeek = Math.floor((now.getTime() - new Date(currentYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

    // Weekly summary (last 7 days)
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyRecords = records.filter(r => new Date(r.date) >= weekStart);
    const weeklyPresent = weeklyRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const weeklyAbsent = weeklyRecords.filter(r => r.status === 'absent').length;
    const weeklySummary = {
      total_days: weeklyRecords.length,
      present_days: weeklyPresent,
      absent_days: weeklyAbsent,
      attendance_rate: weeklyRecords.length > 0 ? (weeklyPresent / weeklyRecords.length) * 100 : 0,
    };

    // Monthly summary (current month)
    const monthlyRecords = records.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth;
    });
    const monthlyPresent = monthlyRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const monthlyAbsent = monthlyRecords.filter(r => r.status === 'absent').length;
    const monthlySummary = {
      total_days: monthlyRecords.length,
      present_days: monthlyPresent,
      absent_days: monthlyAbsent,
      attendance_rate: monthlyRecords.length > 0 ? (monthlyPresent / monthlyRecords.length) * 100 : 0,
    };

    // Yearly summary (current year)
    const yearlyRecords = records.filter(r => new Date(r.date).getFullYear() === currentYear);
    const yearlyPresent = yearlyRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const yearlyAbsent = yearlyRecords.filter(r => r.status === 'absent').length;
    const yearlySummary = {
      total_days: yearlyRecords.length,
      present_days: yearlyPresent,
      absent_days: yearlyAbsent,
      attendance_rate: yearlyRecords.length > 0 ? (yearlyPresent / yearlyRecords.length) * 100 : 0,
    };

    return {
      student,
      attendanceRecords: records,
      summaries: {
        weekly: weeklySummary,
        monthly: monthlySummary,
        yearly: yearlySummary,
      },
    };
  } catch (err) {
    throw err;
  }
};

export const getDashboardStats = async (staff_id: string) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    // Get total students for this staff
    const totalStudents = await prisma.student.count({
      where: { staff_id },
    });

    // Get today's attendance record
    const todayAttendance = await prisma.attendance.findFirst({
      where: {
        staff_id,
        date: today,
      },
    });

    let presentToday = 0;
    let absentToday = 0;

    if (todayAttendance) {
      // Count present students (present or late)
      presentToday = await prisma.studentAttendance.count({
        where: {
          attendance_id: todayAttendance.id,
          status: { in: ['present', 'late'] },
        },
      });

      // Absent students = total students - present students
      absentToday = totalStudents - presentToday;
    } else {
      // No attendance record for today, all students are absent
      absentToday = totalStudents;
    }

    // Calculate attendance rate
    const attendanceRate = totalStudents > 0 ? ((presentToday / totalStudents) * 100).toFixed(1) : '0.0';

    return {
      totalStudents,
      presentToday,
      absentToday,
      attendanceRate: parseFloat(attendanceRate),
    };
  } catch (err) {
    throw err;
  }
};

export const markStudentAttendance = async (
  staff_id: string,
  student_id: string,
  dates: string[],
  status: 'late' | 'absent',
  section: string
) => {
  try {
    // Verify student belongs to staff
    const student = await prisma.student.findFirst({
      where: {
        id: student_id,
        staff_id,
      },
    });

    if (!student) {
      throw createError.NotFound('Student not found');
    }

    const results = [];

    for (const date of dates) {
      // Check if attendance record exists for this date
      let attendance = await prisma.attendance.findFirst({
        where: {
          staff_id,
          date,
        },
      });

      // Create attendance record if it doesn't exist
      if (!attendance) {
        attendance = await prisma.attendance.create({
          data: {
            staff_id,
            name: `Manual Attendance - ${date}`,
            date,
            created_at: new Date(),
          },
        });
      }

      // Check if student attendance record exists
      const existingRecord = await prisma.studentAttendance.findUnique({
        where: {
          student_id_attendance_id: {
            student_id,
            attendance_id: attendance.id,
          },
        },
      });

      if (existingRecord) {
        // Update existing record
        const updatedRecord = await prisma.studentAttendance.update({
          where: {
            student_id_attendance_id: {
              student_id,
              attendance_id: attendance.id,
            },
          },
          data: {
            status,
            section,
            time_type: 'IN', // Manual marking defaults to IN
          },
        });
        results.push(updatedRecord);
      } else {
        // Create new record
        const newRecord = await prisma.studentAttendance.create({
          data: {
            student_id,
            attendance_id: attendance.id,
            status,
            section,
            time_type: 'IN', // Manual marking defaults to IN
          },
        });
        results.push(newRecord);
      }
    }

    return results;
  } catch (err) {
    throw err;
  }
};
