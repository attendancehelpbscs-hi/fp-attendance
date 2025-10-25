import createError from 'http-errors';
import { prisma } from '../db/prisma-client';

export interface AttendanceReportData {
  date: string;
  grade: string;
  section: string;
  present: number;
  absent: number;
  rate: number;
}

export interface AttendanceSummary {
  totalStudents: number;
  averageRate: number;
  lowAttendanceCount: number;
  perfectAttendanceCount: number;
}

export const getAttendanceReports = async (staff_id: string, filters: { grade?: string; section?: string; dateRange?: string }): Promise<AttendanceReportData[]> => {
  try {
    // Calculate date range
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (filters.dateRange) {
      const now = new Date();
      switch (filters.dateRange) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          break;
      }
    }

    // Get all unique grade-section combinations for this staff
    const allStudentAttendancesForStaff = await prisma.studentAttendance.findMany({
      where: {
        student: { staff_id },
      },
      include: {
        student: true,
      },
    });

    // Group students by grade and section to get all possible combinations
    const gradeSectionMap: Record<string, number> = {};
    allStudentAttendancesForStaff.forEach((sa: { student: { grade: string }; section: string }) => {
      const student = sa.student;
      const section = sa.section;
      const key = `${student.grade}-${section}`;
      if (!gradeSectionMap[key]) {
        gradeSectionMap[key] = 0;
      }
      gradeSectionMap[key]++;
    });

    // Get all attendances for the staff within date range
    const attendances = await prisma.attendance.findMany({
      where: {
        staff_id,
        ...(startDate && { date: { gte: startDate.toISOString().split('T')[0] } }),
        ...(endDate && { date: { lte: endDate.toISOString().split('T')[0] } }),
      },
      include: {
        students: {
          include: {
            student: true,
          },
        },
      },
    });

    // Process data to create reports
    const reportData: AttendanceReportData[] = [];

    // If no attendances exist, create entries for all grade-sections with 0 attendance
    if (attendances.length === 0) {
      Object.keys(gradeSectionMap).forEach(key => {
        const [grade, section] = key.split('-');
        const total = gradeSectionMap[key];

        // Apply filters
        if (filters.grade && grade !== filters.grade) return;
        if (filters.section && section !== filters.section) return;

        reportData.push({
          date: new Date().toISOString().split('T')[0], // Use current date for empty reports
          grade,
          section,
          present: 0,
          absent: total,
          rate: 0,
        });
      });
      return reportData;
    }

    // Group attendances by date
    const attendancesByDate: Record<string, any> = {};
    attendances.forEach(attendance => {
      attendancesByDate[attendance.date] = attendance;
    });

    // For each date in the range, create reports
    const dateRange = Object.keys(attendancesByDate);
    if (dateRange.length === 0) {
      // If no attendances in range, use all possible dates or current date
      const currentDate = new Date().toISOString().split('T')[0];
      dateRange.push(currentDate);
    }

    for (const date of dateRange) {
      const attendance = attendancesByDate[date];
      const studentAttendances = attendance ? attendance.students : [];

      // Initialize groups for all grade-sections
      const gradeSectionGroups: Record<string, { present: number; absent: number; total: number }> = {};
      Object.keys(gradeSectionMap).forEach(key => {
        const [grade, section] = key.split('-');
        gradeSectionGroups[`${grade}-${section}`] = {
          present: 0,
          absent: gradeSectionMap[key],
          total: gradeSectionMap[key],
        };
      });

      // Count present students by grade and section from StudentAttendance
      studentAttendances.forEach(sa => {
        const student = sa.student;
        const section = sa.section;
        const key = `${student.grade}-${section}`;
        if (gradeSectionGroups[key]) {
          gradeSectionGroups[key].present++;
          gradeSectionGroups[key].absent--;
        }
      });

      // Create report entries for all grade-sections
      Object.keys(gradeSectionGroups).forEach(key => {
        const [grade, section] = key.split('-');
        const group = gradeSectionGroups[key];
        const rate = group.total > 0 ? (group.present / group.total) * 100 : 0;

        // Apply filters
        if (filters.grade && grade !== filters.grade) return;
        if (filters.section && section !== filters.section) return;

        reportData.push({
          date,
          grade,
          section,
          present: group.present,
          absent: group.absent,
          rate: Math.round(rate * 100) / 100,
        });
      });
    }

    return reportData;
  } catch (err) {
    throw err;
  }
};

export const getAttendanceSummary = async (staff_id: string, filters: { grade?: string; section?: string; dateRange?: string }): Promise<AttendanceSummary> => {
  try {
    const reportData = await getAttendanceReports(staff_id, filters);

    if (reportData.length === 0) {
      return {
        totalStudents: 0,
        averageRate: 0,
        lowAttendanceCount: 0,
        perfectAttendanceCount: 0,
      };
    }

    const totalRate = reportData.reduce((sum, item) => sum + item.rate, 0);
    const averageRate = totalRate / reportData.length;
    const totalStudents = reportData.reduce((sum, item) => sum + item.present + item.absent, 0);
    const lowAttendanceCount = reportData.filter(item => item.rate < 70).length;
    const perfectAttendanceCount = reportData.filter(item => item.rate === 100).length;

    return {
      totalStudents,
      averageRate: Math.round(averageRate * 100) / 100,
      lowAttendanceCount,
      perfectAttendanceCount,
    };
  } catch (err) {
    throw err;
  }
};

export const getPreviousPeriodReports = async (staff_id: string, filters: { grade?: string; section?: string; dateRange?: string }): Promise<AttendanceSummary> => {
  try {
    // Calculate previous period date range
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (filters.dateRange) {
      const now = new Date();
      let periodLength = 0;
      switch (filters.dateRange) {
        case '7days':
          periodLength = 7;
          break;
        case '30days':
          periodLength = 30;
          break;
        case '90days':
          periodLength = 90;
          break;
        default:
          periodLength = 7;
          break;
      }
      // Previous period: from (now - 2*period) to (now - period)
      endDate = new Date(now.getTime() - periodLength * 24 * 60 * 60 * 1000);
      startDate = new Date(now.getTime() - 2 * periodLength * 24 * 60 * 60 * 1000);
    }

    // Get previous period data
    const previousFilters = { ...filters, dateRange: undefined }; // Remove dateRange as we're setting specific dates
    const previousReportData = await getAttendanceReports(staff_id, previousFilters);

    // Filter by date range manually
    const filteredPreviousData = previousReportData.filter(item => {
      const itemDate = new Date(item.date);
      return (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);
    });

    if (filteredPreviousData.length === 0) {
      return {
        totalStudents: 0,
        averageRate: 0,
        lowAttendanceCount: 0,
        perfectAttendanceCount: 0,
      };
    }

    const totalRate = filteredPreviousData.reduce((sum, item) => sum + item.rate, 0);
    const averageRate = totalRate / filteredPreviousData.length;
    const totalStudents = filteredPreviousData.reduce((sum, item) => sum + item.present + item.absent, 0);
    const lowAttendanceCount = filteredPreviousData.filter(item => item.rate < 70).length;
    const perfectAttendanceCount = filteredPreviousData.filter(item => item.rate === 100).length;

    return {
      totalStudents,
      averageRate: Math.round(averageRate * 100) / 100,
      lowAttendanceCount,
      perfectAttendanceCount,
    };
  } catch (err) {
    throw err;
  }
};

export const getUniqueGradesAndSections = async (staff_id: string): Promise<{ grades: string[]; sections: string[] }> => {
  try {
    const studentAttendances = await prisma.studentAttendance.findMany({
      where: {
        student: { staff_id },
      },
      include: {
        student: true,
      },
    });

    const gradesSet = new Set<string>();
    const sectionsSet = new Set<string>();

    studentAttendances.forEach((sa: { student: { grade: string }; section: string }) => {
      gradesSet.add(sa.student.grade);
      sectionsSet.add(sa.section);
    });

    return {
      grades: Array.from(gradesSet).sort(),
      sections: Array.from(sectionsSet).sort(),
    };
  } catch (err) {
    throw err;
  }
};
