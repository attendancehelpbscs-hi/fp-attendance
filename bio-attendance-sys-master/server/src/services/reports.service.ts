import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import { markAbsentForUnmarkedDays } from './attendance.service';
import { AttendanceStatus, TimeType, SessionType } from '@prisma/client';
import { isLateArrival } from '../helpers/general.helper';

type Filters = any;

const getLateOptions = async (staff_id: string | null) => {
  if (!staff_id) {
    // For admin, use default settings or return null
    return { lateTime: null, gracePeriodMinutes: null, pmSettings: { enabled: false, time: null } };
  }
  const staffSettings = await prisma.staff.findUnique({
    where: { id: staff_id },
    select: {
      school_start_time: true,
      grace_period_minutes: true,
      pm_late_cutoff_enabled: true,
      pm_late_cutoff_time: true
    }
  });
  return {
    lateTime: staffSettings?.school_start_time,
    gracePeriodMinutes: staffSettings?.grace_period_minutes,
    pmSettings: {
      enabled: staffSettings?.pm_late_cutoff_enabled ?? false,
      time: staffSettings?.pm_late_cutoff_time ?? null
    }
  };
};

export const getAttendanceReports = async (staff_id: string | null, filters: Filters) => {
  try {
    const where: any = staff_id ? { student: { staff_id } } : {};
    if (filters.grade) {
      if (!where.student) where.student = {};
      where.student.grade = filters.grade;
    }
    if (filters.section) where.section = filters.section;

    if (filters.dateRange && filters.dateRange !== 'all') {
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (filters.dateRange.includes(' - ')) {
        [startDate, endDate] = filters.dateRange.split(' - ');
      } else {
        const now = new Date();
        endDate = now.toISOString().split('T')[0];
        if (filters.dateRange === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = sevenDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '14days') {
          const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          startDate = fourteenDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          startDate = thirtyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '60days') {
          const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          startDate = sixtyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '90days') {
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          startDate = ninetyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '180days') {
          const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          startDate = oneEightyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '365days') {
          const threeSixtyFiveDaysAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          startDate = threeSixtyFiveDaysAgo.toISOString().split('T')[0];
        } else {
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

    const lateOptions = await getLateOptions(staff_id);
    const studentAttendances = await prisma.studentAttendance.findMany({
      where,
      include: {
        student: true,
        attendance: true,
      },
    });

    const groupedData: Record<string, { presentStudents: Set<string>, absentStudents: Set<string>, lateStudents: Set<string> }> = {};

    studentAttendances.forEach(sa => {
      if (filters.session && filters.session !== 'all' && sa.session_type !== filters.session) {
        return;
      }
      const dateStr = sa.attendance.date;
      const key = `${dateStr}|${sa.student.grade}|${sa.section}`;
      if (!groupedData[key]) {
        groupedData[key] = { presentStudents: new Set(), absentStudents: new Set(), lateStudents: new Set() };
      }
      if ((sa.time_type === 'IN' || sa.time_type === 'OUT') && sa.status === 'present') {
        groupedData[key].presentStudents.add(sa.student_id);
        if (sa.time_type === 'IN' && isLateArrival(sa.created_at, sa.session_type as SessionType, sa.time_type as TimeType, lateOptions)) {
          groupedData[key].lateStudents.add(sa.student_id);
        }
      }
      if (sa.status === 'absent' && (!filters.session || filters.session === 'all' || sa.session_type === filters.session)) {
        groupedData[key].absentStudents.add(sa.student_id);
      }
    });

    let results = Object.entries(groupedData).map(([key, data]) => {
      const [date, grade, section] = key.split('|');
      const present = data.presentStudents.size;
      const absent = data.absentStudents.size;
      const late = data.lateStudents.size;
      const total = present + absent;
      const rate = total > 0 ? (present / total) * 100 : 0;
      return {
        date,
        grade,
        section,
        present,
        absent,
        late,
        rate: Math.round(rate * 100) / 100,
      };
    });

    if (filters.session) {
      results = results.map(r => ({ ...r, session_type: filters.session }));
    }

    const page = filters.page || 1;
    const per_page = filters.per_page || 10;
    const totalItems = results.length;
    const totalPages = Math.ceil(totalItems / per_page) || 1;
    const startIndex = (page - 1) * per_page;
    const endIndex = startIndex + per_page;
    results = results.slice(startIndex, endIndex);

    return {
      reports: results,
      meta: {
        total_items: totalItems,
        total_pages: totalPages,
        page,
        per_page,
      },
    };
  } catch (err) {
    throw err;
  }
};

export const getAttendanceSummary = async (staff_id: string | null, filters: Filters) => {
  try {
    const reportsData = await getAttendanceReports(staff_id, filters);
    const reports = reportsData?.reports || [];
    const totalStudents = reports.reduce((sum: number, report: any) => sum + report.present + report.absent, 0);
    const averageRate = reports.length > 0 ? reports.reduce((sum: number, report: any) => sum + report.rate, 0) / reports.length : 0;
    const lowAttendanceCount = reports.filter((r: any) => r.rate < 75).length;
    const perfectAttendanceCount = reports.filter((r: any) => r.rate === 100).length;
    const lateCount = reports.reduce((sum: number, report: any) => sum + (report.late || 0), 0);
    return {
      totalStudents,
      averageRate,
      lowAttendanceCount,
      perfectAttendanceCount,
      lateCount,
    };
  } catch (err) {
    throw err;
  }
};

export const getUniqueGradesAndSections = async (staff_id: string | null) => {
  try {
    const grades = await prisma.student.findMany({ where: staff_id ? { staff_id } : {}, select: { grade: true }, distinct: ['grade'] });
    const sections = await prisma.studentAttendance.findMany({ where: staff_id ? { student: { staff_id } } : {}, select: { section: true }, distinct: ['section'] });
    return { grades: grades.map(g => g.grade).sort(), sections: sections.map(s => s.section).sort() };
  } catch (err) {
    throw err;
  }
};

export const getGradeSectionCombinations = async (staff_id: string | null) => {
  try {
    // Get all unique grade-section combinations that actually exist in attendance records
    const gradeSectionCombinations = await prisma.studentAttendance.findMany({
      where: staff_id ? { student: { staff_id } } : {},
      select: {
        student: { select: { grade: true } },
        section: true
      },
      distinct: ['student_id', 'section'] // Ensure unique combinations per student-section
    });

    // Group by grade and collect unique sections
    const gradeSections: Record<string, Set<string>> = {};
    gradeSectionCombinations.forEach(item => {
      const grade = item.student.grade;
      const section = item.section;
      if (!gradeSections[grade]) {
        gradeSections[grade] = new Set();
      }
      gradeSections[grade].add(section);
    });

    // Convert to the format expected by frontend
    const result: Array<{ grade: string; sections: string[] }> = [];
    Object.keys(gradeSections).sort().forEach(grade => {
      result.push({
        grade,
        sections: Array.from(gradeSections[grade]).sort()
      });
    });

    return result;
  } catch (err) {
    throw err;
  }
};

export const getPreviousPeriodReports = async (staff_id: string | null, filters: Filters) => {
  try {
    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const previousFilters = { ...filters, dateRange: `${previousMonth.toISOString().split('T')[0]} - ${previousMonthEnd.toISOString().split('T')[0]}` };
    return await getAttendanceSummary(staff_id, previousFilters);
  } catch (err) {
    throw err;
  }
};

export const getStudentAttendanceReports = async (staff_id: string | null, filters: Filters) => {
  try {
    const where: any = staff_id ? { student: { staff_id } } : {};
    if (filters.student_id) where.student_id = filters.student_id;
    if (filters.grade) {
      if (!where.student) where.student = {};
      where.student.grade = filters.grade;
    }
    if (filters.section) where.section = filters.section;
    if (filters.session && filters.session !== 'all') where.session_type = filters.session;
    if (filters.dateRange && filters.dateRange !== 'all') {
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (filters.dateRange.includes(' - ')) {
        [startDate, endDate] = filters.dateRange.split(' - ');
      } else {
        const now = new Date();
        endDate = now.toISOString().split('T')[0];
        if (filters.dateRange === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = sevenDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '14days') {
          const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          startDate = fourteenDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          startDate = thirtyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '60days') {
          const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          startDate = sixtyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '90days') {
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          startDate = ninetyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '180days') {
          const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          startDate = oneEightyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '365days') {
          const threeSixtyFiveDaysAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          startDate = threeSixtyFiveDaysAgo.toISOString().split('T')[0];
        } else {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = sevenDaysAgo.toISOString().split('T')[0];
        }
      }
      where.attendance = { date: { gte: startDate, lte: endDate } };
    } else if (filters.startDate && filters.endDate) {
      where.attendance = { date: { gte: filters.startDate, lte: filters.endDate } };
    }

    const page = filters.page || 1;
    const per_page = filters.per_page || 10;
    const skip = (page - 1) * per_page;

    // Get all records as separate logs for IN/OUT
    const allStudentAttendances = await prisma.studentAttendance.findMany({
      where,
      include: { student: true, attendance: true },
      orderBy: { created_at: 'desc' },
    });

    // Group records by student_id, date, and session_type to separate AM/PM sessions
    const groupedRecords: Record<string, any> = {};
    const lateOptions = await getLateOptions(staff_id);

    allStudentAttendances.forEach(sa => {
      const key = `${sa.student_id}-${sa.attendance.date}-${sa.session_type}`;
      if (!groupedRecords[key]) {
        groupedRecords[key] = {
          student_id: sa.student_id,
          student_name: sa.student.name,
          matric_no: sa.student.matric_no,
          grade: sa.student.grade,
          date: sa.attendance.date,
          status: 'absent',
          time_type: null,
          section: sa.section,
          session_type: sa.session_type,
          created_at: null,
          checkin_time: null,
          checkout_time: null,
          hasPresent: false,
          isLate: false,
        };
      }

      if (sa.status === 'present') {
        groupedRecords[key].hasPresent = true;
        if (sa.time_type === 'IN') {
          const late = isLateArrival(sa.created_at, sa.session_type as SessionType, sa.time_type as TimeType, lateOptions);
          groupedRecords[key].isLate = groupedRecords[key].isLate || late;
          groupedRecords[key].status = late ? 'late' : 'present';
          groupedRecords[key].time_type = 'IN';
          groupedRecords[key].created_at = sa.created_at;
          groupedRecords[key].checkin_time = sa.created_at;
        } else if (!groupedRecords[key].isLate) {
          groupedRecords[key].status = 'departure';
          groupedRecords[key].time_type = 'OUT';
          groupedRecords[key].created_at = sa.created_at;
          groupedRecords[key].checkout_time = sa.created_at;
        } else {
          groupedRecords[key].checkout_time = sa.created_at;
        }
      }
    });

    const records = Object.values(groupedRecords);

    return records;
  } catch (err) {
    throw err;
  }
};

export const getStudentAttendanceSummary = async (staff_id: string | null, filters: Filters) => {
  try {
    const reports = await getStudentAttendanceReports(staff_id, filters);
    const totalDays = reports.length;
    const presentDays = reports.filter((r: any) => (r.status === 'present' || r.status === 'late') && r.time_type === 'IN').length;
    const lateDays = reports.filter((r: any) => r.status === 'late' && r.time_type === 'IN').length;
    const absentDays = reports.filter((r: any) => r.status === 'absent').length;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    return { totalDays, presentDays, lateDays, absentDays, attendanceRate };
  } catch (err) {
    throw err;
  }
};

export const getSectionsForGrade = async (staff_id: string | null, grade: string) => {
  try {
    const studentCourses = await prisma.studentCourse.findMany({
      where: staff_id ? { student: { staff_id, grade } } : { student: { grade } },
      select: { course: { select: { course_code: true } } },
      distinct: ['course_id'],
    });
    return studentCourses.map(sc => sc.course.course_code).sort();
  } catch (err) {
    throw err;
  }
};

export const getStudentsForGradeAndSection = async (staff_id: string | null, grade: string, section: string) => {
  try {
    // Get students who have attendance records in the specified grade and section
    const attendanceRecords = await prisma.studentAttendance.findMany({
      where: staff_id ? { student: { staff_id, grade }, section } : { student: { grade }, section },
      include: { student: { select: { id: true, name: true, matric_no: true, grade: true } } },
      distinct: ['student_id'],
    });
    return attendanceRecords.map(record => ({ ...record.student, section }));
  } catch (err) {
    throw err;
  }
};

export const getStudentDetailedReport = async (staff_id: string, student_id: string) => {
  try {
    const student = await prisma.student.findFirst({ where: { id: student_id, staff_id }, select: { id: true, name: true, matric_no: true, grade: true } });
    if (!student) throw createError.NotFound('Student not found');
    const attendanceRecords = await prisma.studentAttendance.findMany({ where: { student_id }, include: { attendance: true }, orderBy: { created_at: 'desc' } });
    const lateOptions = await getLateOptions(staff_id);

    const groupedRecords: Record<string, any> = {};
    attendanceRecords.forEach(record => {
      const date = record.attendance.date;
      if (!groupedRecords[date]) {
        groupedRecords[date] = {
          date,
          status: 'absent',
          time_type: null,
          section: record.section,
          created_at: null,
          checkin_time: null,
          checkout_time: null,
          isLate: false,
        };
      }

      if (record.time_type === 'IN' && record.status === 'present') {
        const late = isLateArrival(record.created_at, record.session_type as SessionType, record.time_type as TimeType, lateOptions);
        groupedRecords[date].checkin_time = record.created_at.toISOString();
        groupedRecords[date].status = late ? 'late' : 'present';
        groupedRecords[date].created_at = record.created_at.toISOString();
        groupedRecords[date].isLate = groupedRecords[date].isLate || late;
      } else if (record.time_type === 'OUT') {
        groupedRecords[date].checkout_time = record.created_at.toISOString();
        if (!groupedRecords[date].isLate) {
          groupedRecords[date].status = 'departure';
        }
      }
    });

    const records = Object.values(groupedRecords);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyRecords = records.filter((r: any) => new Date(r.date) >= weekStart);
    const weeklyPresent = weeklyRecords.filter((r: any) => (r.status === 'present' || r.status === 'late')).length;
    const weeklyLate = weeklyRecords.filter((r: any) => r.status === 'late').length;
    const weeklyAbsent = weeklyRecords.filter((r: any) => r.status === 'absent').length;
    const weeklySummary = { total_days: weeklyRecords.length, present_days: weeklyPresent, late_days: weeklyLate, absent_days: weeklyAbsent };
    const monthlyRecords = records.filter((r: any) => { const recordDate = new Date(r.date); return recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth; });
    const monthlyPresent = monthlyRecords.filter((r: any) => (r.status === 'present' || r.status === 'late')).length;
    const monthlyLate = monthlyRecords.filter((r: any) => r.status === 'late').length;
    const monthlyAbsent = monthlyRecords.filter((r: any) => r.status === 'absent').length;
    const monthlySummary = { total_days: monthlyRecords.length, present_days: monthlyPresent, late_days: monthlyLate, absent_days: monthlyAbsent };
    const yearlyRecords = records.filter((r: any) => new Date(r.date).getFullYear() === currentYear);
    const yearlyPresent = yearlyRecords.filter((r: any) => (r.status === 'present' || r.status === 'late')).length;
    const yearlyLate = yearlyRecords.filter((r: any) => r.status === 'late').length;
    const yearlyAbsent = yearlyRecords.filter((r: any) => r.status === 'absent').length;
    const yearlySummary = { total_days: yearlyRecords.length, present_days: yearlyPresent, late_days: yearlyLate, absent_days: yearlyAbsent };
    return { student, attendanceRecords: records, summaries: { weekly: weeklySummary, monthly: monthlySummary, yearly: yearlySummary } };
  } catch (err) {
    throw err;
  }
};

export const getDashboardStats = async (staff_id: string | null, session?: string) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Ensure absent records are created for unmarked students (only for teachers, not admin)
    if (staff_id) {
      await markAbsentForUnmarkedDays(staff_id, endDate);
    }

    // Total students should not be filtered by session - we want all students
    const totalStudentsWhereClause: any = staff_id ? { staff_id } : {};
    const totalStudents = await prisma.student.count({
      where: totalStudentsWhereClause
    });

    const presentWhereClause: any = {
      student: staff_id ? { staff_id } : {},
      attendance: { date: endDate },
      status: AttendanceStatus.present,
      time_type: { in: [TimeType.IN, TimeType.OUT] },
      ...(session ? { session_type: session as SessionType } : {})
    };

    const presentRecords = await prisma.studentAttendance.findMany({
      where: presentWhereClause,
      select: { student_id: true },
      distinct: ['student_id']
    });
    const presentToday = presentRecords.length;

    // Query absent records with session_type filter when session is specified
    const absentWhereClause: any = {
      student: staff_id ? { staff_id } : {},
      attendance: { date: endDate },
      status: AttendanceStatus.absent,
      ...(session ? { session_type: session as SessionType } : {})
    };

    const absentRecords = await prisma.studentAttendance.findMany({
      where: absentWhereClause,
      select: { student_id: true },
      distinct: ['student_id']
    });
    const absentToday = absentRecords.length;
    const attendanceRate = presentToday + absentToday > 0 ? parseFloat(((presentToday / (presentToday + absentToday)) * 100).toFixed(1)) : 0;

    // Get grades
    const gradeRows = await prisma.student.findMany({
      where: staff_id ? { staff_id } : {},
      select: { grade: true },
      distinct: ['grade']
    });
    const grades = gradeRows.map(g => g.grade).sort((a, b) => parseInt(a) - parseInt(b));

    // Build grade stats for today
    const gradeStatsFormatted = [];
    for (const grade of grades) {
      const totalStudentsForGradeWhereClause: any = staff_id ? { staff_id, grade } : { grade };
      const totalStudentsForGrade = await prisma.student.count({
        where: totalStudentsForGradeWhereClause
      });

      const presentRecordsForGradeWhereClause: any = {
        student: staff_id ? { staff_id, grade } : { grade },
        attendance: { date: endDate },
        status: AttendanceStatus.present,
        time_type: { in: [TimeType.IN, TimeType.OUT] },
        ...(session ? { session_type: session as SessionType } : {})
      };
      const presentRecordsForGrade = await prisma.studentAttendance.findMany({
        where: presentRecordsForGradeWhereClause,
        select: { student_id: true },
        distinct: ['student_id']
      });
      const presentStudents = presentRecordsForGrade.length;

      // Query absent records with session_type filter when session is specified
      const absentWhereClauseForGrade: any = {
        student: staff_id ? { staff_id, grade } : { grade },
        attendance: { date: endDate },
        status: AttendanceStatus.absent,
        ...(session ? { session_type: session as SessionType } : {})
      };

      const absentRecordsForGrade = await prisma.studentAttendance.findMany({
        where: absentWhereClauseForGrade,
        select: { student_id: true },
        distinct: ['student_id']
      });
      const absentStudents = absentRecordsForGrade.length;
      const attendanceRateForGrade = presentStudents + absentStudents > 0 ? parseFloat(((presentStudents / (presentStudents + absentStudents)) * 100).toFixed(1)) : 0;

      gradeStatsFormatted.push({
        grade,
        data: [{
          date: endDate,
          totalStudents: totalStudentsForGrade,
          presentStudents,
          absentStudents,
          attendanceRate: attendanceRateForGrade
        }]
      });
    }

    return {
      totalStudents,
      presentToday,
      absentToday,
      attendanceRate,
      gradeStats: gradeStatsFormatted
    };
  } catch (err) {
    throw err;
  }
};

export const getCheckInTimeAnalysis = async (staff_id: string, filters: Filters) => {
  try {
    const where: any = { time_type: { not: 'OUT' } };

    // Apply grade filter
    if (filters.grade) {
      if (!where.student) where.student = {};
      where.student.grade = filters.grade;
    }

    // Apply section filter
    if (filters.section) where.section = filters.section;

    // Apply session filter
    if (filters.session && filters.session !== 'all') where.session_type = filters.session;

    // Apply date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      let startDate: string | undefined;
      let endDate: string | undefined;
      if (filters.dateRange.includes(' - ')) {
        [startDate, endDate] = filters.dateRange.split(' - ');
      } else {
        const now = new Date();
        endDate = now.toISOString().split('T')[0];
        if (filters.dateRange === '7days') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = sevenDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '14days') {
          const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          startDate = fourteenDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '30days') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          startDate = thirtyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '60days') {
          const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
          startDate = sixtyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '90days') {
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          startDate = ninetyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '180days') {
          const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          startDate = oneEightyDaysAgo.toISOString().split('T')[0];
        } else if (filters.dateRange === '365days') {
          const threeSixtyFiveDaysAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          startDate = threeSixtyFiveDaysAgo.toISOString().split('T')[0];
        } else {
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

    const checkInRecords = await prisma.studentAttendance.findMany({ where, include: { student: true, attendance: true } });
    const timeRanges: Record<string, number> = {};
    checkInRecords.forEach(record => {
      if (!record.created_at) return;
      const createdAt = new Date(record.created_at);
      if (isNaN(createdAt.getTime())) return;
      const hours = createdAt.getHours();
      const minutes = createdAt.getMinutes();
      if (hours < 6 || hours >= 11) return;
      const intervalStart = Math.floor((hours * 60 + minutes) / 30) * 30;
      const intervalEnd = intervalStart + 30;
      const startHour = Math.floor(intervalStart / 60);
      const startMin = intervalStart % 60;
      const endHour = Math.floor(intervalEnd / 60);
      const endMin = intervalEnd % 60;
      const rangeKey = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}–${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} ${(startHour >= 12 || (startHour === 11 && startMin >= 30)) ? 'PM' : 'AM'}`;
      if (!timeRanges[rangeKey]) timeRanges[rangeKey] = 0;
      timeRanges[rangeKey] += 1;
    });
    const chartData = Object.entries(timeRanges).map(([range, count]) => ({ timeRange: range, count })).sort((a, b) => { const aTime = a.timeRange.split('–')[0]; const bTime = b.timeRange.split('–')[0]; return aTime.localeCompare(bTime); });
    if (chartData.length === 0) return [];
    return chartData;
  } catch (err) {
    throw err;
  }
};

export const getStudentsByStatus = async (staff_id: string, date: string, grade: string, section: string, status: 'present' | 'absent' | 'late', session?: string) => {
  try {
    console.log('getStudentsByStatus params:', { staff_id, date, grade, section, status });
    console.log('Searching for attendance with date criteria:', { staff_id, date });
    let attendance = await prisma.attendance.findFirst({ where: { staff_id, date }, orderBy: { created_at: 'desc' } });
    console.log('Found attendance record:', attendance);
    if (!attendance) {
      console.log('No attendance record found for date, creating one:', date);
      attendance = await prisma.attendance.create({
        data: {
          staff_id,
          name: `Daily Attendance - ${date}`,
          date,
          created_at: new Date(),
        },
      });
    }
    await markAbsentForUnmarkedDays(staff_id, date);
    const normalize = (v: any) => (v === null || v === undefined) ? '' : String(v).trim().toUpperCase();
    try {
      const debugByAttendanceId = await prisma.studentAttendance.findMany({ where: { attendance_id: attendance.id }, include: { student: { select: { id: true, name: true, matric_no: true, grade: true, staff_id: true } }, attendance: true } });
      console.log('Debug: studentAttendance rows (by attendance_id):', attendance.id, debugByAttendanceId.map(r => ({ student_id: r.student_id, time_type: r.time_type, status: r.status, section: r.section, created_at: r.created_at, attendance_id: r.attendance_id, attendance_date: r.attendance?.date, student: r.student })));
      const debugByAttendanceDate = await prisma.studentAttendance.findMany({ where: { attendance: { date } }, include: { student: { select: { id: true, name: true, matric_no: true, grade: true, staff_id: true } }, attendance: true } });
      console.log('Debug: studentAttendance rows (by attendance.date):', date, debugByAttendanceDate.map(r => ({ student_id: r.student_id, time_type: r.time_type, status: r.status, section: r.section, created_at: r.created_at, attendance_id: r.attendance_id, attendance_date: r.attendance?.date, student: r.student })));
    } catch (dbgErr) {
      console.error('Debug fetch error:', dbgErr);
    }
    const allAttendanceRecords = await prisma.studentAttendance.findMany({
      where: {
        attendance: { date, staff_id },
        ...(session ? { session_type: session as SessionType } : {})
      },
      include: { student: { include: { courses: { include: { course: true } } } }, attendance: true }
    });
    console.log('All attendance records for this date:', allAttendanceRecords.length);
    const filteredRecords = allAttendanceRecords.filter(rec => {
      const st = rec.student;
      if (!st) return false;
      if (String(st.staff_id) !== String(staff_id)) return false;
      if (normalize(st.grade) !== normalize(grade)) return false;
      const hasSectionCourse = Array.isArray(st.courses) && st.courses.some((sc: any) => normalize(sc?.course?.course_code) === normalize(section));
      return hasSectionCourse;
    });
    console.log('Filtered records by grade/section:', filteredRecords.length);
    if (status === 'present') {
      // Group records by student and session to separate AM/PM
      const studentSessionMap: Record<string, any> = {};
      filteredRecords.forEach(rec => {
        if (rec.status === 'present') {
          const studentId = rec.student.id;
          const session = rec.session_type || 'AM';
          const key = `${studentId}-${session}`;
          if (!studentSessionMap[key]) {
            studentSessionMap[key] = {
              id: rec.student.id,
              name: rec.student.name,
              matric_no: rec.student.matric_no,
              grade: rec.student.grade,
              section: rec.section,
              checkin_time: null,
              checkout_time: null,
              time_type: session,
            };
          }

          if (rec.time_type === 'IN') {
            studentSessionMap[key].checkin_time = rec.created_at ? rec.created_at.toISOString() : null;
          } else if (rec.time_type === 'OUT') {
            studentSessionMap[key].checkout_time = rec.created_at ? rec.created_at.toISOString() : null;
          }
        }
      });

      const result = Object.values(studentSessionMap).filter(student => student.checkin_time);
      console.log('Present students count:', result.length);
      console.log('Returning present students:', result);
      return { students: result };
    } else if (status === 'late') {
      // Group records by student and session to separate AM/PM, but only include late students
      const studentSessionMap: Record<string, any> = {};
      const lateOptions = await getLateOptions(staff_id);

      filteredRecords.forEach(rec => {
        if (rec.status === 'present' && rec.time_type === 'IN') {
          const isLate = isLateArrival(rec.created_at, rec.session_type as SessionType, rec.time_type as TimeType, lateOptions);
          if (isLate) {
            const studentId = rec.student.id;
            const session = rec.session_type || 'AM';
            const key = `${studentId}-${session}`;
            if (!studentSessionMap[key]) {
              studentSessionMap[key] = {
                id: rec.student.id,
                name: rec.student.name,
                matric_no: rec.student.matric_no,
                grade: rec.student.grade,
                section: rec.section,
                checkin_time: rec.created_at ? rec.created_at.toISOString() : null,
                checkout_time: null,
                time_type: session,
              };
            }

            // Check for checkout time
            const checkoutRec = filteredRecords.find(r => r.student_id === studentId && r.session_type === session && r.time_type === 'OUT');
            if (checkoutRec) {
              studentSessionMap[key].checkout_time = checkoutRec.created_at ? checkoutRec.created_at.toISOString() : null;
            }
          }
        }
      });

      const result = Object.values(studentSessionMap);
      console.log('Late students count:', result.length);
      console.log('Returning late students:', result);
      return { students: result };
    } else {
      const allStudents = await getStudentsForGradeAndSection(staff_id, grade, section);
      console.log('Total students in section:', allStudents.length);
      const presentStudentIds = new Set(filteredRecords.filter(rec => rec.status === 'present').map(rec => rec.student_id));
      console.log('Present student IDs count:', presentStudentIds.size);
      const result = allStudents.filter(student => !presentStudentIds.has(student.id)).map(student => ({ id: student.id, name: student.name, matric_no: student.matric_no, grade: student.grade, section: student.section, checkin_time: null, checkout_time: null }));
      console.log('Returning absent students:', result);
      return { students: result };
    }
  } catch (err) {
    console.error('Error in getStudentsByStatus:', err);
    throw err;
  }
};

export const getMonthlyAttendanceSummary = async (staff_id: string | null, filters: Filters) => {
  try {
    const year = filters.year || new Date().getFullYear();

    // Get total students count for the selected grade/section
    let totalStudents = 0;
    if (filters.grade && filters.section) {
      // Count students who have courses with the specified grade and section
      const studentsWithCourses = await prisma.student.findMany({
        where: staff_id ? { staff_id } : {},
        include: {
          courses: {
            include: {
              course: true
            }
          }
        }
      });

      const filteredStudents = studentsWithCourses.filter(student =>
        student.grade === filters.grade &&
        student.courses.some(sc => sc.course?.course_code === filters.section)
      );

      totalStudents = filteredStudents.length;
    } else if (filters.grade) {
      // Count students by grade only
      const studentWhere: any = staff_id ? { staff_id } : {};
      studentWhere.grade = filters.grade;
      totalStudents = await prisma.student.count({ where: studentWhere });
    } else {
      // Count all students
      const studentWhere: any = staff_id ? { staff_id } : {};
      totalStudents = await prisma.student.count({ where: studentWhere });
    }

    // Get holidays for the year to exclude from school days
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: `${year}-01-01`,
          lte: `${year}-12-31`,
        },
      },
      select: { date: true },
    });
    const holidayDates = new Set(holidays.map(h => h.date));

    // Generate monthly summary data
    const monthlySummaries = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
      const month = monthIndex + 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const daysInMonth = new Date(year, month, 0).getDate();

      // Calculate school days (weekdays excluding holidays)
      let schoolDays = 0;
      const days = [];
      const firstDay = new Date(year, month - 1, 1);
      const firstDayOfWeek = firstDay.getDay();
      for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(null);
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidayDates.has(dateStr);

        if (!isWeekend && !isHoliday) {
          schoolDays++;
        }

        days.push({
          date: dateStr,
          isWeekend,
          isHoliday,
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
        });
      }

      monthlySummaries.push({
        month: monthNames[monthIndex],
        monthKey,
        totalStudents,
        schoolDays,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        absencePercentage: 0,
        latePercentage: 0,
        days,
      });
    }

    // Fetch real attendance data
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const where: any = staff_id ? { student: { staff_id } } : {};
      if (filters.grade) {
        if (!where.student) where.student = {};
        where.student.grade = filters.grade;
      }
      if (filters.section) where.section = filters.section;

      where.attendance = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };

      const lateOptions = await getLateOptions(staff_id);
      const studentAttendances = await prisma.studentAttendance.findMany({
        where,
        include: {
          student: true,
          attendance: true,
        },
      });

      // Group attendance data by date
      const attendanceByDate: Record<string, { present: Set<string>; absent: Set<string>; late: Set<string> }> = {};

      studentAttendances.forEach(sa => {
        if (filters.session && sa.session_type !== filters.session) {
          return;
        }

        const dateStr = sa.attendance.date;

        if (!attendanceByDate[dateStr]) {
          attendanceByDate[dateStr] = { present: new Set(), absent: new Set(), late: new Set() };
        }

        if ((sa.time_type === 'IN' || sa.time_type === 'OUT') && sa.status === 'present') {
          attendanceByDate[dateStr].present.add(sa.student_id);
          if (sa.time_type === 'IN' && isLateArrival(sa.created_at, sa.session_type as SessionType, sa.time_type as TimeType, lateOptions)) {
            attendanceByDate[dateStr].late.add(sa.student_id);
          }
        }
        if (sa.status === 'absent') {
          attendanceByDate[dateStr].absent.add(sa.student_id);
        }
      });

      // Update monthly summaries with real data
      monthlySummaries.forEach(monthData => {
        let monthPresentDays = 0;
        let monthAbsentDays = 0;
        let monthLateDays = 0;

        // Update daily data and aggregate
        monthData.days.forEach(dayData => {
          if (!dayData) return;
          const dayAttendance = attendanceByDate[dayData.date];
          if (dayAttendance) {
            dayData.present = dayAttendance.present.size;
            dayData.absent = dayAttendance.absent.size;
            dayData.late = dayAttendance.late.size;
            dayData.total = dayData.present + dayData.absent;

            // Count school days with attendance
            if (!dayData.isWeekend && !dayData.isHoliday) {
              if (dayData.present > 0) monthPresentDays++;
              if (dayData.absent > 0) monthAbsentDays++;
              if (dayData.late > 0) monthLateDays++;
            }
          }
        });

        monthData.presentDays = monthPresentDays;
        monthData.absentDays = monthAbsentDays;
        monthData.lateDays = monthLateDays;

        // Calculate percentages based on total attendance records across the month
        const allDayAttendances = monthData.days.filter((d): d is NonNullable<typeof d> => d !== null && !d.isWeekend && !d.isHoliday);
        const totalPresent = allDayAttendances.reduce((sum, d) => sum + d.present, 0);
        const totalAbsent = allDayAttendances.reduce((sum, d) => sum + d.absent, 0);
        const totalLate = allDayAttendances.reduce((sum, d) => sum + d.late, 0);
        const totalAttendanceRecords = totalPresent + totalAbsent;

        monthData.absencePercentage = totalAttendanceRecords > 0 ? (totalAbsent / totalAttendanceRecords) * 100 : 0;
        monthData.latePercentage = totalAttendanceRecords > 0 ? (totalLate / totalAttendanceRecords) * 100 : 0;
      });

    } catch (dbError) {
      console.error('Database query failed for monthly summary:', dbError);
    }

    return {
      year,
      totalStudents,
      monthlySummaries,
    };
  } catch (err) {
    throw err;
  }
};

export const getCheckInTimeDistribution = async (staff_id: string | null, filters?: Filters) => {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Build the query to fetch attendance records for today
    const whereClause: any = {
      attendance: {
        date: today
      },
      time_type: 'IN',
      status: 'present'
    };
    
    // Filter by staff if specified
    if (staff_id) {
      whereClause.student = { staff_id };
    }
    
    // Apply additional filters if provided
    if (filters) {
      if (filters.grade) {
        if (!whereClause.student) whereClause.student = {};
        whereClause.student.grade = filters.grade;
      }
      if (filters.section) whereClause.section = filters.section;
      if (filters.session && filters.session !== 'all') whereClause.session_type = filters.session;
    }
    
    // Fetch check-in records
    const checkInRecords = await prisma.studentAttendance.findMany({
      where: whereClause,
      include: {
        student: true,
        attendance: true
      }
    });
    
    // Initialize distribution for hours 6-11 AM
    const distribution: Array<{hour: string, count: number}> = [];
    for (let i = 6; i <= 11; i++) {
      distribution.push({ hour: `${i}:00`, count: 0 });
    }
    
    // Process each record to count check-ins by hour
    checkInRecords.forEach(record => {
      if (!record.created_at) return;
      
      const checkInTime = new Date(record.created_at);
      const hour = checkInTime.getHours();
      
      // Only count records between 6 AM and 11 AM
      if (hour >= 6 && hour <= 11) {
        distribution[hour - 6].count += 1;
      }
    });
    
    return distribution;
  } catch (error) {
    console.error('Error fetching check-in time distribution:', error);
    // Return empty array if there's an error
    return [];
  }
};

export const markStudentAttendance = async (staff_id: string, student_id: string, dates: string[], status: AttendanceStatus, section: string) => {
  try {
    const student = await prisma.student.findFirst({ where: { id: student_id, staff_id } });
    if (!student) throw createError.NotFound('Student not found');
    const results: any[] = [];
    for (const date of dates) {
      let attendance = await prisma.attendance.findFirst({ where: { staff_id, date } });
      if (!attendance) {
        attendance = await prisma.attendance.create({ data: { staff_id, name: `Manual Attendance - ${date}`, date, created_at: new Date() } });
      }

      // If marking present, remove any existing absent records for this student on the same date
      if (status === 'present') {
        await prisma.studentAttendance.deleteMany({
          where: {
            student_id,
            attendance: { date },
            status: 'absent',
          },
        });
      }

      const existingRecord = await prisma.studentAttendance.findFirst({ where: { student_id, attendance_id: attendance.id } });
      if (existingRecord) {
        const updatedRecord = await prisma.studentAttendance.update({ where: { id: existingRecord.id }, data: { status: status as AttendanceStatus, section, time_type: 'IN' } });
        results.push(updatedRecord);
      } else {
        const newRecord = await prisma.studentAttendance.create({ data: { student_id, attendance_id: attendance.id, status: status as AttendanceStatus, section, time_type: 'IN' } });
        results.push(newRecord);
      }
    }
    return results;
  } catch (err) {
    throw err;
  }
};
