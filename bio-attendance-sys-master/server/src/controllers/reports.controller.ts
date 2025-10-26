import type { Request, Response, NextFunction } from 'express';
import { createSuccess } from '../helpers/http.helper';
import createError from 'http-errors';
import { getAttendanceReports, getAttendanceSummary, getUniqueGradesAndSections, getPreviousPeriodReports, getStudentAttendanceReports, getStudentAttendanceSummary, getSectionsForGrade, getStudentsForGradeAndSection, getStudentDetailedReport, getDashboardStats, markStudentAttendance } from '../services/reports.service';

export const getReports = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.params;
  const { grade, section, dateRange } = req.query;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  try {
    const filters = {
      grade: grade as string,
      section: section as string,
      dateRange: dateRange as string,
    };

    const reports = await getAttendanceReports(staff_id, filters);
    const summary = await getAttendanceSummary(staff_id, filters);
    const previousPeriodSummary = await getPreviousPeriodReports(staff_id, filters);

    return createSuccess(res, 200, 'Reports fetched successfully', {
      reports,
      summary,
      previousPeriodSummary,
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
  const { student_id, startDate, endDate, dateRange } = req.query;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));

  try {
    const filters = {
      student_id: student_id as string,
      startDate: startDate as string,
      endDate: endDate as string,
      dateRange: dateRange as string,
    };

    const reports = await getStudentAttendanceReports(staff_id, filters);
    const summary = await getStudentAttendanceSummary(staff_id, filters);

    return createSuccess(res, 200, 'Student reports fetched successfully', {
      reports,
      summary,
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

export const markStudentAttendanceController = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id, student_id } = req.params;
  const { dates, status, section } = req.body;

  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (!student_id) return next(new createError.BadRequest('Student ID is required'));
  if (!dates || !Array.isArray(dates) || dates.length === 0) return next(new createError.BadRequest('Dates array is required'));
  if (!status || !['late', 'absent'].includes(status)) return next(new createError.BadRequest('Valid status (late or absent) is required'));
  if (!section) return next(new createError.BadRequest('Section is required'));

  try {
    const results = await markStudentAttendance(staff_id, student_id, dates, status, section);
    return createSuccess(res, 200, 'Student attendance marked successfully', { marked: results.length });
  } catch (err) {
    return next(err);
  }
};
