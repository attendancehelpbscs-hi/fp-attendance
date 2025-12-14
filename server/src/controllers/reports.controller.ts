import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { createSuccess } from '../helpers/http.helper';
import createError from 'http-errors';
import { getAttendanceReports, getAttendanceSummary, getUniqueGradesAndSections, getGradeSectionCombinations, getPreviousPeriodReports, getStudentAttendanceReports, getStudentAttendanceSummary, getSectionsForGrade, getStudentsForGradeAndSection, getStudentDetailedReport, getDashboardStats, getCheckInTimeAnalysis, getStudentsByStatus, markStudentAttendance, getMonthlyAttendanceSummary, getCheckInTimeDistribution } from '../services/reports.service';
import { generateSF2Data } from '../services/sf2-export.service';
import { generateSF2Excel } from '../services/sf2-excel.service';
import { generateSF2PDF } from '../services/sf2-pdf.service';
import { generateMonthlySummaryExcel } from '../services/monthly-summary-excel.service';
import { generateMonthlySummaryPDF } from '../services/monthly-summary-pdf.service';
import { prisma } from '../db/prisma-client';

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, dateRange, startDate, endDate, page, per_page, session } = req.query;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    const filters = {
      grade: grade as string,
      section: section as string,
      dateRange: dateRange as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      per_page: per_page ? parseInt(per_page as string, 10) : 10,
      session: session as string,
    };

    // For admin users, pass null to get reports for all students; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const reportsData = await getAttendanceReports(effectiveStaffId, filters);
    const summary = await getAttendanceSummary(effectiveStaffId, filters);
    const previousPeriodSummary = await getPreviousPeriodReports(effectiveStaffId, filters);

    return createSuccess(res, 200, 'Reports fetched successfully', {
      reports: reportsData.reports,
      summary,
      previousPeriodSummary,
      meta: reportsData.meta,
    });
  } catch (err) {
    return next(err);
  }
};

export const getSF2ReportController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, month, year, schoolId, schoolName, schoolYear, schoolHeadName, region, division, district } = req.query;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    const parsedMonth = parseInt(month as string, 10);
    const parsedYear = parseInt(year as string, 10);
    const resolvedSchoolYear = (schoolYear as string) || `${parsedYear}-${parsedYear + 1}`;

    // For admin users, pass null to get SF2 data for all students; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const sf2Data = await generateSF2Data(
      effectiveStaffId,
      grade as string,
      section as string,
      parsedMonth,
      parsedYear,
      (schoolId as string) || '000000',
      (schoolName as string) || 'School Name',
      resolvedSchoolYear,
      (schoolHeadName as string) || 'Principal/School Head',
      region as string,
      division as string,
      district as string
    );

    return createSuccess(res, 200, 'SF2 data generated successfully', sf2Data);
  } catch (err) {
    return next(err);
  }
};

export const getGradesAndSections = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const user_id = (req.user as JwtPayload).id;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    // For admin users, pass null to get all grade-section combinations; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const data = await getGradeSectionCombinations(effectiveStaffId);

    return createSuccess(res, 200, 'Grades and sections fetched successfully', data);
  } catch (err) {
    return next(err);
  }
};

export const getStudentReports = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { student_id, grade, section, startDate, endDate, dateRange, page, per_page, session } = req.query;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    const filters = {
      student_id: student_id as string,
      grade: grade as string,
      section: section as string,
      startDate: startDate as string,
      endDate: endDate as string,
      dateRange: dateRange as string,
      page: page ? parseInt(page as string, 10) : 1,
      per_page: per_page ? parseInt(per_page as string, 10) : 10,
      session: session as string,
    };

    // For admin users, pass null to get reports for all students; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const reports = await getStudentAttendanceReports(effectiveStaffId, filters);
    const summary = await getStudentAttendanceSummary(effectiveStaffId, filters);

    // Calculate pagination metadata
    const totalItems = reports.length; // This is approximate since we're not counting total without pagination
    const totalPages = Math.ceil(totalItems / filters.per_page);
    const meta = {
      total_items: totalItems,
      total_pages: totalPages,
      page: filters.page,
      per_page: filters.per_page,
    };

    return createSuccess(res, 200, 'Student reports fetched successfully', {
      reports,
      summary,
      meta,
    });
  } catch (err) {
    return next(err);
  }
};

export const getSectionsForGradeController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id, grade } = req.params;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (!grade) return next(new createError.BadRequest('Grade is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    // For admin users, pass null to get sections for all students; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const sections = await getSectionsForGrade(effectiveStaffId, grade);
    return createSuccess(res, 200, 'Sections fetched successfully', { sections });
  } catch (err) {
    return next(err);
  }
};

export const getStudentsForGradeAndSectionController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id, grade, section } = req.params;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (!grade) return next(new createError.BadRequest('Grade is required'));
  if (!section) return next(new createError.BadRequest('Section is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    // For admin users, pass null to get students for all staff; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const students = await getStudentsForGradeAndSection(effectiveStaffId, grade, section);
    return createSuccess(res, 200, 'Students fetched successfully', { students });
  } catch (err) {
    return next(err);
  }
};

export const getStudentDetailedReportController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id, student_id } = req.params;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (!student_id) return next(new createError.BadRequest('Student ID is required'));

  try {
    const report = await getStudentDetailedReport(staff_id, student_id);
    return createSuccess(res, 200, 'Student detailed report fetched successfully', report);
  } catch (err) {
    return next(err);
  }
};

export const getDashboardStatsController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { session } = req.query;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    // For admin users, pass null to get stats for all students; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const stats = await getDashboardStats(effectiveStaffId, session as string);
    return createSuccess(res, 200, 'Dashboard stats fetched successfully', stats);
  } catch (err) {
    return next(err);
  }
};

export const getCheckInTimeAnalysisController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, dateRange, startDate, endDate, session } = req.query;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  try {
    const filters = {
      grade: grade as string,
      section: section as string,
      dateRange: dateRange as string,
      startDate: startDate as string,
      endDate: endDate as string,
      session: session as string,
    };

    const data = await getCheckInTimeAnalysis(staff_id, filters);
    return createSuccess(res, 200, 'Check-in time analysis fetched successfully', { data });
  } catch (err) {
    return next(err);
  }
};

export const getCheckInTimeDistributionController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, session } = req.query;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    const filters = {
      grade: grade as string,
      section: section as string,
      session: session as string,
    };

    // For admin users, pass null to get data for all students; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const distribution = await getCheckInTimeDistribution(effectiveStaffId, filters);
    return createSuccess(res, 200, 'Check-in time distribution fetched successfully', { distribution });
  } catch (err) {
    return next(err);
  }
};

export const getStudentsByStatusController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { date, grade, section, status, session } = req.query;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (!date) return next(new createError.BadRequest('Date is required'));
  if (!grade) return next(new createError.BadRequest('Grade is required'));
  if (!section) return next(new createError.BadRequest('Section is required'));
  if (!status || !['present', 'absent', 'late'].includes(status as string)) return next(new createError.BadRequest('Valid status (present, absent, or late) is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    // For admin users, pass null to get students for all staff; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const students = await getStudentsByStatus(effectiveStaffId, date as string, grade as string, section as string, status as 'present' | 'absent' | 'late', session as string);
    return createSuccess(res, 200, 'Students fetched successfully', { students });
  } catch (err) {
    return next(err);
  }
};

export const getMonthlyAttendanceSummaryController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { staff_id } = req.params;
    const { grade, section, year, session } = req.query;
    const user_id = (req.user as JwtPayload)?.id;

    if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
    if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

    // Get the current user's role
    const currentUser = await prisma.staff.findUnique({
      where: { id: user_id },
      select: { role: true }
    });

    if (!currentUser) {
      return next(new createError.Unauthorized('User not found'));
    }

    // Check if the user is an admin or the owner of the resource
    if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
      return next(new createError.Forbidden('Access denied'));
    }

    const filters = {
      grade: grade as string,
      section: section as string,
      year: year ? parseInt(year as string, 10) : new Date().getFullYear(),
      session: session as string,
    };

    // For admin users, pass null to get all attendance data; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const summaryData = await getMonthlyAttendanceSummary(effectiveStaffId, filters);

    return createSuccess(res, 200, 'Monthly attendance summary fetched successfully', summaryData);
  } catch (err) {
    console.error('Monthly summary error:', err);
    return next(err);
  }
};

export const markStudentAttendanceController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id, student_id } = req.params;
  const { dates, status, section } = req.body;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (!student_id) return next(new createError.BadRequest('Student ID is required'));
  if (!dates || !Array.isArray(dates) || dates.length === 0) return next(new createError.BadRequest('Dates array is required'));
  if (!status || !['present', 'absent'].includes(status)) return next(new createError.BadRequest('Valid status (present or absent) is required'));
  if (!section) return next(new createError.BadRequest('Section is required'));

  try {
  const results = await markStudentAttendance(staff_id, student_id, dates, status as 'present' | 'absent', section);
    return createSuccess(res, 200, 'Student attendance marked successfully', { marked: results.length });
  } catch (err) {
    return next(err);
  }
};

export const exportSF2ExcelController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, month, year, schoolId, schoolName, schoolYear, schoolHeadName, region, division, district } = req.query;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (!grade) return next(new createError.BadRequest('Grade is required'));
  if (!section) return next(new createError.BadRequest('Section is required'));
  if (!month) return next(new createError.BadRequest('Month is required'));
  if (!year) return next(new createError.BadRequest('Year is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    // For admin users, pass null to get SF2 data for all students; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const sf2Data = await generateSF2Data(
      effectiveStaffId,
      grade as string,
      section as string,
      parseInt(month as string, 10),
      parseInt(year as string, 10),
      (schoolId as string) || '000000',
      (schoolName as string) || 'School Name',
      (schoolYear as string) || `${year}-${parseInt(year as string, 10) + 1}`,
      (schoolHeadName as string) || 'Principal/School Head',
      region as string,
      division as string,
      district as string
    );

    const buffer = await generateSF2Excel(sf2Data);
    const fileName = `SF2_${grade}_${section}_${month}_${year}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
};

export const exportSF2PDFController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, month, year, schoolId, schoolName, schoolYear, schoolHeadName, region, division, district } = req.query;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (!grade) return next(new createError.BadRequest('Grade is required'));
  if (!section) return next(new createError.BadRequest('Section is required'));
  if (!month) return next(new createError.BadRequest('Month is required'));
  if (!year) return next(new createError.BadRequest('Year is required'));

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    // For admin users, pass null to get SF2 data for all students; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const sf2Data = await generateSF2Data(
      effectiveStaffId,
      grade as string,
      section as string,
      parseInt(month as string, 10),
      parseInt(year as string, 10),
      (schoolId as string) || '000000',
      (schoolName as string) || 'School Name',
      (schoolYear as string) || `${year}-${parseInt(year as string, 10) + 1}`,
      (schoolHeadName as string) || 'Principal/School Head',
      region as string,
      division as string,
      district as string
    );

    const buffer = await generateSF2PDF(sf2Data);
    const fileName = `SF2_${grade}_${section}_${month}_${year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
};

export const exportMonthlySummaryExcel = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, year, session } = req.query;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!staff_id || staff_id.trim() === '') {
    return next(new createError.BadRequest('Staff ID is required for export'));
  }

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    const filters = {
      grade: grade as string,
      section: section as string,
      year: year ? parseInt(year as string, 10) : new Date().getFullYear(),
      session: session as string,
    };

    // For admin users, pass null to get all attendance data; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const summaryData = await getMonthlyAttendanceSummary(effectiveStaffId, filters);

    const buffer = await generateMonthlySummaryExcel(summaryData);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=monthly-attendance-summary-${year || new Date().getFullYear()}.xlsx`);

    return res.status(200).send(buffer);
  } catch (err) {
    console.error('Error in exportMonthlySummaryExcel:', err);
    return next(err);
  }
};

export const exportMonthlySummaryPDF = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, year, session } = req.query;
  const user_id = (req.user as JwtPayload)?.id;

  if (!user_id) return next(new createError.Unauthorized('User not authenticated'));
  if (!staff_id || staff_id.trim() === '') {
    return next(new createError.BadRequest('Staff ID is required for export'));
  }

  // Get the current user's role
  const currentUser = await prisma.staff.findUnique({
    where: { id: user_id },
    select: { role: true }
  });

  if (!currentUser) {
    return next(new createError.Unauthorized('User not found'));
  }

  // Check if the user is an admin or the owner of the resource
  if (currentUser.role !== 'ADMIN' && staff_id !== user_id) {
    return next(new createError.Forbidden('Access denied'));
  }

  try {
    const filters = {
      grade: grade as string,
      section: section as string,
      year: year ? parseInt(year as string, 10) : new Date().getFullYear(),
      session: session as string,
    };

    // For admin users, pass null to get all attendance data; for teachers, filter by their staff_id
    const effectiveStaffId = currentUser.role === 'ADMIN' ? null : staff_id;
    const summaryData = await getMonthlyAttendanceSummary(effectiveStaffId, filters);

    const buffer = await generateMonthlySummaryPDF(summaryData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=monthly-attendance-summary-${year || new Date().getFullYear()}.pdf`);

    return res.status(200).send(buffer);
  } catch (err) {
    return next(err);
  }
};
