import type { Request, Response, NextFunction } from 'express';
import { createSuccess } from '../helpers/http.helper';
import createError from 'http-errors';
import { getAttendanceReports, getAttendanceSummary, getUniqueGradesAndSections, getPreviousPeriodReports, getStudentAttendanceReports, getStudentAttendanceSummary, getSectionsForGrade, getStudentsForGradeAndSection, getStudentDetailedReport, getDashboardStats, getCheckInTimeAnalysis, getStudentsByStatus, markStudentAttendance } from '../services/reports.service';

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, dateRange, startDate, endDate, page, per_page } = req.query;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  try {
    const filters = {
      grade: grade as string,
      section: section as string,
      dateRange: dateRange as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : 1,
      per_page: per_page ? parseInt(per_page as string, 10) : 10,
    };

    const reportsData = await getAttendanceReports(staff_id, filters);
    const summary = await getAttendanceSummary(staff_id, filters);
    const previousPeriodSummary = await getPreviousPeriodReports(staff_id, filters);

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

export const getGradesAndSections = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  try {
    const data = await getUniqueGradesAndSections(staff_id);

    return createSuccess(res, 200, 'Grades and sections fetched successfully', data);
  } catch (err) {
    return next(err);
  }
};

export const getStudentReports = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { student_id, grade, section, startDate, endDate, dateRange, page, per_page } = req.query;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

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
    };

    const reports = await getStudentAttendanceReports(staff_id, filters);
    const summary = await getStudentAttendanceSummary(staff_id, filters);

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

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (!grade) return next(new createError.BadRequest('Grade is required'));

  try {
    const sections = await getSectionsForGrade(staff_id, grade);
    return createSuccess(res, 200, 'Sections fetched successfully', { sections });
  } catch (err) {
    return next(err);
  }
};

export const getStudentsForGradeAndSectionController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id, grade, section } = req.params;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (!grade) return next(new createError.BadRequest('Grade is required'));
  if (!section) return next(new createError.BadRequest('Section is required'));

  try {
    const students = await getStudentsForGradeAndSection(staff_id, grade, section);
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

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  try {
    const stats = await getDashboardStats(staff_id);
    return createSuccess(res, 200, 'Dashboard stats fetched successfully', stats);
  } catch (err) {
    return next(err);
  }
};

export const getCheckInTimeAnalysisController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, dateRange } = req.query;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  try {
    const filters = {
      grade: grade as string,
      section: section as string,
      dateRange: dateRange as string,
    };

    const data = await getCheckInTimeAnalysis(staff_id, filters);
    return createSuccess(res, 200, 'Check-in time analysis fetched successfully', { data });
  } catch (err) {
    return next(err);
  }
};

export const getStudentsByStatusController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { date, grade, section, status } = req.query;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (!date) return next(new createError.BadRequest('Date is required'));
  if (!grade) return next(new createError.BadRequest('Grade is required'));
  if (!section) return next(new createError.BadRequest('Section is required'));
  if (!status || !['present', 'absent'].includes(status as string)) return next(new createError.BadRequest('Valid status (present or absent) is required'));

  try {
    const students = await getStudentsByStatus(staff_id, date as string, grade as string, section as string, status as 'present' | 'absent');
    return createSuccess(res, 200, 'Students fetched successfully', { students });
  } catch (err) {
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
