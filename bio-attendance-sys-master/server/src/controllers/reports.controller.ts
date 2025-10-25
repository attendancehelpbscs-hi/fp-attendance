import type { Request, Response, NextFunction } from 'express';
import { createSuccess } from '../helpers/http.helper';
import createError from 'http-errors';
import { getAttendanceReports, getAttendanceSummary, getUniqueGradesAndSections, getPreviousPeriodReports } from '../services/reports.service';

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
