import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import { markAbsentForUnmarkedDays } from './attendance.service';
import type { AttendanceStatus } from '@prisma/client';

type Filters = any;

export const getAttendanceReports = async (staff_id: string, filters: Filters) => {
  try {
    const where: any = {
      student: { staff_id },
    };
    if (filters.grade) where.student.grade = filters.grade;
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

    const studentAttendances = await prisma.studentAttendance.findMany({
      where,
      include: {
        student: true,
        attendance: true,
      },
    });

    const groupedData: Record<string, { presentStudents: Set<string>, absentStudents: Set<string> }> = {};

    studentAttendances.forEach(sa => {
      const dateStr = sa.attendance.date;
      const key = `${dateStr}|${sa.student.grade}|${sa.section}`;
      if (!groupedData[key]) {
        groupedData[key] = { presentStudents: new Set(), absentStudents: new Set() };
      }
      if (sa.time_type === 'IN' && sa.status === 'present') {
        groupedData[key].presentStudents.add(sa.student_id);
      }
      if (sa.status === 'absent') {
        groupedData[key].absentStudents.add(sa.student_id);
      }
    });

    let results = Object.entries(groupedData).map(([key, data]) => {
      const [date, grade, section] = key.split('|');
      const present = data.presentStudents.size;
      const absent = data.absentStudents.size;
      const total = present + absent;
      const rate = total > 0 ? (present / total) * 100 : 0;
      return {
        date,
        grade,
        section,
        present,
        absent,
        rate: Math.round(rate * 100) / 100,
      };
    });

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

export const getAttendanceSummary = async (staff_id: string, filters: Filters) => {
  try {
    const reportsData = await getAttendanceReports(staff_id, filters);
    const reports = reportsData?.reports || [];
    const totalStudents = reports.reduce((sum: number, report: any) => sum + report.present + report.absent, 0);
    const averageRate = reports.length > 0 ? reports.reduce((sum: number, report: any) => sum + report.rate, 0) / reports.length : 0;
    const lowAttendanceCount = reports.filter((r: any) => r.rate < 75).length;
    const perfectAttendanceCount = reports.filter((r: any) => r.rate === 100).length;
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
    const grades = await prisma.student.findMany({ where: { staff_id }, select: { grade: true }, distinct: ['grade'] });
    const sections = await prisma.studentAttendance.findMany({ where: { student: { staff_id } }, select: { section: true }, distinct: ['section'] });
    return { grades: grades.map(g => g.grade).sort(), sections: sections.map(s => s.section).sort() };
  } catch (err) {
    throw err;
  }
};

export const getGradeSectionCombinations = async (staff_id: string) => {
  try {
    // Get all unique grade-section combinations that actually exist in attendance records
    const gradeSectionCombinations = await prisma.studentAttendance.findMany({
      where: { student: { staff_id } },
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

export const getPreviousPeriodReports = async (staff_id: string, filters: Filters) => {
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

export const getStudentAttendanceReports = async (staff_id: string, filters: Filters) => {
  try {
    const where: any = { student: { staff_id }, time_type: { in: ['IN', 'OUT'] }, status: { not: 'absent' } };
    if (filters.student_id) where.student_id = filters.student_id;
    if (filters.grade) where.student.grade = filters.grade;
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
      skip,
      take: per_page,
    });

    // Map to separate records for each IN/OUT
    const records = allStudentAttendances.map(sa => ({
      student_id: sa.student_id,
      student_name: sa.student.name,
      matric_no: sa.student.matric_no,
      grade: sa.student.grade,
      date: sa.attendance.date,
      status: sa.time_type === 'IN' ? 'present' : sa.time_type === 'OUT' ? 'departure' : sa.status,
      time_type: sa.time_type,
      section: sa.section,
      created_at: sa.created_at,
      checkin_time: sa.time_type === 'IN' ? sa.created_at : null,
      checkout_time: sa.time_type === 'OUT' ? sa.created_at : null,
    }));

    return records;
  } catch (err) {
    throw err;
  }
};

export const getStudentAttendanceSummary = async (staff_id: string, filters: Filters) => {
  try {
    const reports = await getStudentAttendanceReports(staff_id, filters);
    const totalDays = reports.length;
    const presentDays = reports.filter((r: any) => r.status === 'present' && r.time_type === 'IN').length;
    const absentDays = 0;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    return { totalDays, presentDays, absentDays, attendanceRate };
  } catch (err) {
    throw err;
  }
};

export const getSectionsForGrade = async (staff_id: string, grade: string) => {
  try {
    const studentCourses = await prisma.studentCourse.findMany({
      where: { student: { staff_id, grade } },
      select: { course: { select: { course_code: true } } },
      distinct: ['course_id'],
    });
    return studentCourses.map(sc => sc.course.course_code).sort();
  } catch (err) {
    throw err;
  }
};

export const getStudentsForGradeAndSection = async (staff_id: string, grade: string, section: string) => {
  try {
    const students = await prisma.student.findMany({
      where: { staff_id, grade, courses: { some: { course: { course_code: section } } } },
      select: { id: true, name: true, matric_no: true, grade: true },
    });
    return students.map(student => ({ ...student, section }));
  } catch (err) {
    throw err;
  }
};

export const getStudentDetailedReport = async (staff_id: string, student_id: string) => {
  try {
    const student = await prisma.student.findFirst({ where: { id: student_id, staff_id }, select: { id: true, name: true, matric_no: true, grade: true } });
    if (!student) throw createError.NotFound('Student not found');
    const attendanceRecords = await prisma.studentAttendance.findMany({ where: { student_id }, include: { attendance: true }, orderBy: { created_at: 'desc' } });

    // Group records by date to combine IN/OUT
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
        };
      }

      if (record.time_type === 'IN' && record.status === 'present') {
        groupedRecords[date].checkin_time = record.created_at.toISOString();
        groupedRecords[date].status = 'present';
        groupedRecords[date].created_at = record.created_at.toISOString();
      } else if (record.time_type === 'OUT') {
        groupedRecords[date].checkout_time = record.created_at.toISOString();
        groupedRecords[date].status = 'departure';
      }
    });

    const records = Object.values(groupedRecords);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weeklyRecords = records.filter((r: any) => new Date(r.date) >= weekStart);
    const weeklyPresent = weeklyRecords.filter((r: any) => r.status === 'present').length;
    const weeklyAbsent = weeklyRecords.filter((r: any) => r.status === 'absent').length;
    const weeklySummary = { total_days: weeklyRecords.length, present_days: weeklyPresent, absent_days: weeklyAbsent };
    const monthlyRecords = records.filter((r: any) => { const recordDate = new Date(r.date); return recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth; });
    const monthlyPresent = monthlyRecords.filter((r: any) => r.status === 'present').length;
    const monthlyAbsent = monthlyRecords.filter((r: any) => r.status === 'absent').length;
    const monthlySummary = { total_days: monthlyRecords.length, present_days: monthlyPresent, absent_days: monthlyAbsent };
    const yearlyRecords = records.filter((r: any) => new Date(r.date).getFullYear() === currentYear);
    const yearlyPresent = yearlyRecords.filter((r: any) => r.status === 'present').length;
    const yearlyAbsent = yearlyRecords.filter((r: any) => r.status === 'absent').length;
    const yearlySummary = { total_days: yearlyRecords.length, present_days: yearlyPresent, absent_days: yearlyAbsent };
    return { student, attendanceRecords: records, summaries: { weekly: weeklySummary, monthly: monthlySummary, yearly: yearlySummary } };
  } catch (err) {
    throw err;
  }
};

export const getDashboardStats = async (staff_id: string) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Ensure absent records are created for unmarked students
    await markAbsentForUnmarkedDays(staff_id, endDate);

    const totalStudents = await prisma.student.count({ where: { staff_id } });
    const presentRecords = await prisma.studentAttendance.findMany({
      where: {
        student: { staff_id },
        attendance: { date: endDate },
        status: 'present',
        time_type: 'IN'
      },
      select: { student_id: true },
      distinct: ['student_id']
    });
    const presentToday = presentRecords.length;
    const absentRecords = await prisma.studentAttendance.findMany({
      where: {
        student: { staff_id },
        attendance: { date: endDate },
        status: 'absent'
      },
      select: { student_id: true },
      distinct: ['student_id']
    });
    const absentToday = absentRecords.length;
    const attendanceRate = presentToday + absentToday > 0 ? parseFloat(((presentToday / (presentToday + absentToday)) * 100).toFixed(1)) : 0;

    // Get grades
    const gradeRows = await prisma.student.findMany({
      where: { staff_id },
      select: { grade: true },
      distinct: ['grade']
    });
    const grades = gradeRows.map(g => g.grade).sort((a, b) => parseInt(a) - parseInt(b));

    // Build grade stats for today
    const gradeStatsFormatted = [];
    for (const grade of grades) {
      const totalStudentsForGrade = await prisma.student.count({ where: { staff_id, grade } });
      const presentRecordsForGrade = await prisma.studentAttendance.findMany({
        where: {
          student: { staff_id, grade },
          attendance: { date: endDate },
          status: 'present',
          time_type: 'IN'
        },
        select: { student_id: true },
        distinct: ['student_id']
      });
      const presentStudents = presentRecordsForGrade.length;
      const absentRecordsForGrade = await prisma.studentAttendance.findMany({
        where: {
          student: { staff_id, grade },
          attendance: { date: endDate },
          status: 'absent'
        },
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
    const where: any = { student: { staff_id }, time_type: { not: 'OUT' } };
    const checkInRecords = await prisma.studentAttendance.findMany({ where, include: { student: true, attendance: true } });
    const timeRanges: Record<string, number> = {};
    checkInRecords.forEach(record => {
      if (!record.created_at) return;
      const createdAt = new Date(record.created_at);
      if (isNaN(createdAt.getTime())) return;
      const hours = createdAt.getHours();
      const minutes = createdAt.getMinutes();
      if (hours < 6 || hours >= 12) return;
      const intervalStart = Math.floor((hours * 60 + minutes) / 30) * 30;
      const intervalEnd = intervalStart + 30;
      const startHour = Math.floor(intervalStart / 60);
      const startMin = intervalStart % 60;
      const endHour = Math.floor(intervalEnd / 60);
      const endMin = intervalEnd % 60;
      const rangeKey = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}–${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')} ${startHour >= 12 ? 'PM' : 'AM'}`;
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

export const getStudentsByStatus = async (staff_id: string, date: string, grade: string, section: string, status: 'present' | 'absent') => {
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
    const allAttendanceRecords = await prisma.studentAttendance.findMany({ where: { attendance: { date, staff_id } }, include: { student: { include: { courses: { include: { course: true } } } }, attendance: true } });
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
      // Group records by student to combine IN/OUT
      const studentMap: Record<string, any> = {};
      filteredRecords.forEach(rec => {
        if (rec.status === 'present' || rec.time_type === 'IN' || rec.time_type === 'OUT') {
          const studentId = rec.student.id;
          if (!studentMap[studentId]) {
            studentMap[studentId] = {
              id: rec.student.id,
              name: rec.student.name,
              matric_no: rec.student.matric_no,
              checkin_time: null,
              checkout_time: null,
            };
          }

          if (rec.time_type === 'IN' && rec.status === 'present') {
            studentMap[studentId].checkin_time = rec.created_at ? rec.created_at.toISOString() : null;
          } else if (rec.time_type === 'OUT') {
            studentMap[studentId].checkout_time = rec.created_at ? rec.created_at.toISOString() : null;
          }
        }
      });

      const result = Object.values(studentMap);
      console.log('Present students count:', result.length);
      console.log('Returning present students:', result);
      return { students: result };
    } else {
      const allStudents = await getStudentsForGradeAndSection(staff_id, grade, section);
      console.log('Total students in section:', allStudents.length);
      const presentStudentIds = new Set(filteredRecords.filter(rec => rec.status === 'present').map(rec => rec.student_id));
      console.log('Present student IDs count:', presentStudentIds.size);
      const result = allStudents.filter(student => !presentStudentIds.has(student.id)).map(student => ({ id: student.id, name: student.name, matric_no: student.matric_no, checkin_time: null, checkout_time: null }));
      console.log('Returning absent students:', result);
      return { students: result };
    }
  } catch (err) {
    console.error('Error in getStudentsByStatus:', err);
    throw err;
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
