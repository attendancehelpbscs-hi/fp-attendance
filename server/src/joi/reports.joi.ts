import Joi from 'joi';

export const getReportsSchema = Joi.object({
  grade: Joi.string().optional(),
  section: Joi.string().optional(),
  dateRange: Joi.string().optional(),
  startDate: Joi.string().optional(),
  endDate: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional(),
  per_page: Joi.number().integer().min(1).max(100).optional(),
  session: Joi.string().valid('AM', 'PM').optional(),
});

export const getStudentReportsSchema = Joi.object({
  student_id: Joi.string().optional(),
  grade: Joi.string().optional(),
  section: Joi.string().optional(),
  startDate: Joi.string().optional(),
  endDate: Joi.string().optional(),
  dateRange: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional(),
  per_page: Joi.number().integer().min(1).max(100).optional(),
  session: Joi.string().valid('AM', 'PM').optional(),
});

export const getSF2ReportSchema = Joi.object({
  grade: Joi.string().required(),
  section: Joi.string().required(),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2000).max(2100).required(),
  schoolId: Joi.string().optional(),
  schoolName: Joi.string().optional(),
  schoolYear: Joi.string().optional(),
  schoolHeadName: Joi.string().optional(),
  region: Joi.string().optional(),
  division: Joi.string().optional(),
  district: Joi.string().optional(),
});

export const getMonthlyAttendanceSummarySchema = Joi.object({
  grade: Joi.string().optional(),
  section: Joi.string().optional(),
  year: Joi.string().pattern(/^\d{4}$/).optional(),
  session: Joi.string().valid('AM', 'PM').optional(),
});

export const getDashboardStatsSchema = Joi.object({
  session: Joi.string().valid('AM', 'PM').optional(),
});
