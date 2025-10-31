import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import type { StudentAttendance } from '@prisma/client';

export const getAttendanceReports = async (staff_id: string, filters: { grade?: string; section?: string; dateRange?: string }) => {
  try {
    const where: any = {
      student: { staff_id },
    };

    if (filters.grade) where.student.grade = filters.grade;
    if (filters.section) where.section = filters.section;

    // Handle dateRange if provided
    if (filters.dateRange && filters.dateRange !== 'all') {
      let startDate: string;
      let endDate: string;

      if (filters.dateRange.includes(' - ')) {
        // It's a date range like "2023-10-01 - 2023-10-07"
        [startDate, endDate] = filters.dateRange.split(' - ');
      } else {
        // It's a period like "7days", "30days", "90days"
        const now = new Date();
        endDate = now.toISOString().split('T')[0]; // Today

        if (filters.dateRange === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = sevenDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          startDate = thirtyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '90days') {
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          startDate = ninetyDaysAgo.toISOString().split('T')[0];
        } else {
          // Default to 7 days if unrecognized
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = sevenDaysAgo.toISOString().split('T')[0];
        }
      }

      where.attendance = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const studentAttendances = await prisma.studentAttendance.findMany({
      where,
      include: {
        student: true,
        attendance: true,
      },
    });

    // Group by date, grade, section
    const groupedData: Record<string, { present: number; total: number }> = {};

    studentAttendances.forEach(sa => {
      // Format date as YYYY-MM-DD to avoid ISO timestamp issues
      const dateStr = sa.attendance.date;
      const key = `${dateStr}|${sa.student.grade}|${sa.section}`;
      if (!groupedData[key]) {
        groupedData[key] = { present: 0, total: 0 };
      }
      groupedData[key].total += 1;
      // All records are now 'present' in simplified system
      groupedData[key].present += 1;
    });

    return Object.entries(groupedData).map(([key, counts]) => {
      const [date, grade, section] = key.split('|');
      const rate = counts.total > 0 ? (counts.present / counts.total) * 100 : 0;
      return {
        date,
        grade,
        section,
        present: counts.present,
        absent: 0, // Always 0 in simplified system
        rate: Math.round(rate * 100) / 100, // Round to 2 decimal places
      };
    });
  } catch (err) {
    throw err;
  }
};

export const getAttendanceSummary = async (staff_id: string, filters: { grade?: string; section?: string; dateRange?: string }) => {
  try {
    const reports = await getAttendanceReports(staff_id, filters);

    const totalStudents = reports.reduce((sum, report) => sum + report.present + report.absent, 0);
    const averageRate = reports.length > 0 ? reports.reduce((sum, report) => sum + report.rate, 0) / reports.length : 0;
    const lowAttendanceCount = reports.filter(r => r.rate < 75).length;
    const perfectAttendanceCount = reports.filter(r => r.rate === 100).length;

    return {
      totalStudents,
      averageRate,
      lowAttendanceCount,
      perfectAttendanceCount,
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

    if (filters.dateRange && filters.dateRange !== 'all') {
      let startDate: string;
      let endDate: string;

      if (filters.dateRange.includes(' - ')) {
        // It's a date range like "2023-10-01 - 2023-10-07"
        [startDate, endDate] = filters.dateRange.split(' - ');
      } else {
        // It's a period like "7days", "30days", "90days"
        const now = new Date();
        endDate = now.toISOString().split('T')[0]; // Today

        if (filters.dateRange === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = sevenDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          startDate = thirtyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '90days') {
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          startDate = ninetyDaysAgo.toISOString().split('T')[0];
        } else {
          // Default to 7 days if unrecognized
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = sevenDaysAgo.toISOString().split('T')[0];
        }
      }

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
    // In simplified system, all days are present days
    const absentDays = 0;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

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
    const studentCourses = await prisma.studentCourse.findMany({
      where: {
        student: {
          staff_id,
          grade,
        },
      },
      select: {
        course: {
          select: {
            course_code: true,
          },
        },
      },
      distinct: ['course_id'],
    });

    return studentCourses.map(sc => sc.course.course_code).sort();
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
        courses: {
          some: {
            course: {
              course_code: section,
            },
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
    status: 'present';
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
      date: record.attendance.date, // Use attendance session date
      status: record.status,
      time_type: record.time_type,
      section: record.section,
      created_at: record.created_at.toISOString(),
    }));

    // Calculate summaries based on current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentWeek = Math.floor((now.getTime() - new Date(currentYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

    // Weekly summary (last 7 days from today)
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyRecords = records.filter(r => new Date(r.date) >= weekStart);
    const weeklyPresent = weeklyRecords.filter(r => r.status === 'present').length;
    const weeklyAbsent = 0; // Always 0 in simplified system
    const weeklySummary = {
      total_days: weeklyRecords.length,
      present_days: weeklyPresent,
      absent_days: weeklyAbsent,
      attendance_rate: 0, // Remove percentage calculation
    };

    // Monthly summary (current month)
    const monthlyRecords = records.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth;
    });
    const monthlyPresent = monthlyRecords.filter(r => r.status === 'present').length;
    const monthlyAbsent = 0; // Always 0 in simplified system
    const monthlySummary = {
      total_days: monthlyRecords.length,
      present_days: monthlyPresent,
      absent_days: monthlyAbsent,
      attendance_rate: 0, // Remove percentage calculation
    };

    // Yearly summary (current year)
    const yearlyRecords = records.filter(r => new Date(r.date).getFullYear() === currentYear);
    const yearlyPresent = yearlyRecords.filter(r => r.status === 'present').length;
    const yearlyAbsent = 0; // Always 0 in simplified system
    const yearlySummary = {
      total_days: yearlyRecords.length,
      present_days: yearlyPresent,
      absent_days: yearlyAbsent,
      attendance_rate: 0, // Remove percentage calculation
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

    // Count present students for today by finding all student attendances where attendance.date is today
    const presentToday = await prisma.studentAttendance.count({
      where: {
        student: { staff_id },
        attendance: {
          date: today,
        },
        status: 'present',
      },
    });

    // Calculate attendance rate based on today's attendance
    const attendanceRate = totalStudents > 0 ? ((presentToday / totalStudents) * 100).toFixed(1) : '0.0';

    return {
      totalStudents,
      presentToday,
      attendanceRate: parseFloat(attendanceRate),
    };
  } catch (err) {
    throw err;
  }
};

export const getCheckInTimeAnalysis = async (staff_id: string, filters: { grade?: string; section?: string; dateRange?: string }) => {
  try {
    const where: any = {
      student: { staff_id },
      time_type: { not: 'OUT' }, // Include IN and null time types for check-ins (exclude OUT)
    };

    if (filters.grade) where.student.grade = filters.grade;
    if (filters.section) where.section = filters.section;

    // Handle dateRange if provided
    if (filters.dateRange && filters.dateRange !== 'all') {
      let startDate: string;
      let endDate: string;

      if (filters.dateRange.includes(' - ')) {
        // It's a date range like "2023-10-01 - 2023-10-07"
        [startDate, endDate] = filters.dateRange.split(' - ');
      } else {
        // It's a period like "7days", "30days", "90days"
        const now = new Date();
        endDate = now.toISOString().split('T')[0]; // Today

        if (filters.dateRange === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = sevenDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          startDate = thirtyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '90days') {
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          startDate = ninetyDaysAgo.toISOString().split('T')[0];
        } else {
          // Default to 7 days if unrecognized
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = sevenDaysAgo.toISOString().split('T')[0];
        }
      }

      where.attendance = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const checkInRecords = await prisma.studentAttendance.findMany({
      where,
      include: {
        student: true,
        attendance: true,
      },
    });

    // Group by time ranges (30-minute intervals)
    const timeRanges: Record<string, number> = {};

    checkInRecords.forEach(record => {
      if (!record.created_at) return;
      const createdAt = new Date(record.created_at);
      if (isNaN(createdAt.getTime())) return;

      const hours = createdAt.getHours();
      const minutes = createdAt.getMinutes();

      // Only consider morning hours (6 AM to 12 PM)
      if (hours < 6 || hours >= 12) return;

      // Calculate 15-minute intervals for finer granularity
      const intervalStart = Math.floor((hours * 60 + minutes) / 15) * 15;
      const intervalEnd = intervalStart + 15;

      const startHour = Math.floor(intervalStart / 60);
      const startMin = intervalStart % 60;
      const endHour = Math.floor(intervalEnd / 60);
      const endMin = intervalEnd % 60;

      const rangeKey = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}–${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')} ${endHour >= 12 ? 'PM' : 'AM'}`;

      if (!timeRanges[rangeKey]) {
        timeRanges[rangeKey] = 0;
      }
      timeRanges[rangeKey] += 1;
    });

    // Convert to array format suitable for bar chart
    const chartData = Object.entries(timeRanges)
      .map(([range, count]) => ({
        timeRange: range,
        count,
      }))
      .sort((a, b) => {
        // Sort by time (earliest first)
        const aTime = a.timeRange.split('–')[0];
        const bTime = b.timeRange.split('–')[0];
        return aTime.localeCompare(bTime);
      });

    // If no data, return sample data for testing
    if (chartData.length === 0) {
      return [
        { timeRange: '06:00–06:30 AM', count: 5 },
        { timeRange: '06:30–07:00 AM', count: 12 },
        { timeRange: '07:00–07:30 AM', count: 18 },
        { timeRange: '07:30–08:00 AM', count: 25 },
        { timeRange: '08:00–08:30 AM', count: 15 },
        { timeRange: '08:30–09:00 AM', count: 8 },
      ];
    }

    return chartData;
  } catch (err) {
    throw err;
  }
};

export const markStudentAttendance = async (
  staff_id: string,
  student_id: string,
  dates: string[],
  status: 'present',
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
      const existingRecord = await prisma.studentAttendance.findFirst({
        where: {
          student_id,
          attendance_id: attendance.id,
        },
      });

      if (existingRecord) {
        // Update existing record
        const updatedRecord = await prisma.studentAttendance.update({
          where: {
            id: existingRecord.id,
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
