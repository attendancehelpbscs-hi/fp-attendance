import Joi from 'joi';

export const getReportsSchema = Joi.object({
  grade: Joi.string().optional(),
  section: Joi.string().optional(),
  dateRange: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional(),
  per_page: Joi.number().integer().min(1).max(100).optional(),
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
});

export const getDashboardStatsSchema = Joi.object({
  // No query params needed for dashboard stats
});
