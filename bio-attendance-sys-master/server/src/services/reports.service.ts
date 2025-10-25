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
      studentAttendances.forEach((sa: { student: { grade: string }; section: string }) => {
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

export interface StudentAttendanceReportData {
  date: string;
  student_id: string;
  student_name: string;
  matric_no: string;
  grade: string;
  section: string;
  status: 'present' | 'absent';
  time_type: 'IN' | 'OUT' | null;
  created_at: string;
}

export interface StudentAttendanceSummary {
  student_id: string;
  student_name: string;
  matric_no: string;
  grade: string;
  section: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  attendance_rate: number;
  period_start: string;
  period_end: string;
}

export const getStudentAttendanceReports = async (
  staff_id: string,
  filters: { student_id?: string; startDate?: string; endDate?: string; dateRange?: string }
): Promise<StudentAttendanceReportData[]> => {
  try {
    // Calculate date range
    let startDateStr: string | undefined;
    let endDateStr: string | undefined;

    if (filters.startDate && filters.endDate) {
      startDateStr = filters.startDate;
      endDateStr = filters.endDate;
    } else if (filters.dateRange) {
      const now = new Date();
      switch (filters.dateRange) {
        case 'today':
          startDateStr = now.toISOString().split('T')[0];
          endDateStr = now.toISOString().split('T')[0];
          break;
        case '7days':
          startDateStr = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '30days':
          startDateStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case '90days':
          startDateStr = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case 'month':
          startDateStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          endDateStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
          break;
        default:
          break;
      }
    }

    // Get all attendances for the staff within date range
    const attendances = await prisma.attendance.findMany({
      where: {
        staff_id,
        ...(startDateStr && { date: { gte: startDateStr } }),
        ...(endDateStr && { date: { lte: endDateStr } }),
      },
      include: {
        students: {
          include: {
            student: true,
          },
        },
      },
    });

    const reportData: StudentAttendanceReportData[] = [];

    // Get all students for this staff to include absent days
    const allStudents = await prisma.student.findMany({
      where: { staff_id },
      include: {
        courses: true,
      },
    });

    // Create a map of attendance dates
    const attendanceDates = new Set(attendances.map(a => a.date));

    // For each attendance date, process student attendance
    for (const attendance of attendances) {
      const studentAttendances = attendance.students;

      // Create a map of present students for this date
      const presentStudentsMap = new Map<string, any>();
      studentAttendances.forEach((sa: any) => {
        presentStudentsMap.set(sa.student_id, sa);
      });

      // For each student, check if they were present or absent
      for (const student of allStudents) {
        const studentAttendance = presentStudentsMap.get(student.id);

        if (studentAttendance) {
          // Student was present
          reportData.push({
            date: attendance.date,
            student_id: student.id,
            student_name: student.name,
            matric_no: student.matric_no,
            grade: student.grade,
            section: studentAttendance.section,
            status: 'present',
            time_type: studentAttendance.time_type,
            created_at: studentAttendance.created_at.toISOString(),
          });
        } else {
          // Student was absent - only include if they should have been present (filter by student_id if specified)
          if (!filters.student_id || student.id === filters.student_id) {
            reportData.push({
              date: attendance.date,
              student_id: student.id,
              student_name: student.name,
              matric_no: student.matric_no,
              grade: student.grade,
              section: '', // No section for absent students
              status: 'absent',
              time_type: null,
              created_at: attendance.created_at.toISOString(),
            });
          }
        }
      }
    }

    // Apply student filter
    let filteredData = reportData;
    if (filters.student_id) {
      filteredData = reportData.filter(item => item.student_id === filters.student_id);
    }

    // Sort by date descending
    return filteredData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (err) {
    throw err;
  }
};

export const getStudentAttendanceSummary = async (
  staff_id: string,
  filters: { student_id?: string; startDate?: string; endDate?: string; dateRange?: string }
): Promise<StudentAttendanceSummary[]> => {
  try {
    const reportData = await getStudentAttendanceReports(staff_id, filters);

    // Group by student
    const studentGroups = reportData.reduce((acc: Record<string, StudentAttendanceReportData[]>, item) => {
      if (!acc[item.student_id]) acc[item.student_id] = [];
      acc[item.student_id].push(item);
      return acc;
    }, {});

    const summaries: StudentAttendanceSummary[] = [];

    for (const [studentId, records] of Object.entries(studentGroups)) {
      const student = records[0]; // Get student info from first record
      const totalDays = records.length;
      const presentDays = records.filter(r => r.status === 'present').length;
      const absentDays = records.filter(r => r.status === 'absent').length;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      // Calculate period
      const dates = records.map(r => new Date(r.date));
      const periodStart = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString().split('T')[0];
      const periodEnd = new Date(Math.max(...dates.map(d => d.getTime()))).toISOString().split('T')[0];

      summaries.push({
        student_id: studentId,
        student_name: student.student_name,
        matric_no: student.matric_no,
        grade: student.grade,
        section: student.section,
        total_days: totalDays,
        present_days: presentDays,
        absent_days: absentDays,
        attendance_rate: Math.round(attendanceRate * 100) / 100,
        period_start: periodStart,
        period_end: periodEnd,
      });
    }

    return summaries.sort((a, b) => a.student_name.localeCompare(b.student_name));
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
