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
    // Get all attendances for the staff
    const attendances = await prisma.attendance.findMany({
      where: { staff_id },
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

    for (const attendance of attendances) {
      const date = attendance.date;
      const studentAttendances = attendance.students;

      // Group by grade and section
      const gradeSectionGroups: Record<string, { present: number; absent: number; total: number }> = {};

      // Get all students in the system for this staff to calculate absent
      const allStudents = await prisma.student.findMany({
        where: { staff_id },
      });

      // Initialize groups for all grades and sections
      const gradeSectionMap: Record<string, number> = {};
      allStudents.forEach(student => {
        const key = `${student.grade}-${student.grade}`; // Using grade as section
        if (!gradeSectionMap[key]) {
          gradeSectionMap[key] = 0;
        }
        gradeSectionMap[key]++;
      });

      // Initialize groups
      Object.keys(gradeSectionMap).forEach(key => {
        const [grade, section] = key.split('-');
        gradeSectionGroups[`${grade}-${section}`] = {
          present: 0,
          absent: gradeSectionMap[key],
          total: gradeSectionMap[key],
        };
      });

      // Count present students
      studentAttendances.forEach(sa => {
        const student = sa.student;
        const key = `${student.grade}-${student.grade}`; // Using grade as section
        if (gradeSectionGroups[key]) {
          gradeSectionGroups[key].present++;
          gradeSectionGroups[key].absent--;
        }
      });

      // Create report entries
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
