import Joi from 'joi';

export const getReportsSchema = Joi.object({
  grade: Joi.string().optional(),
  section: Joi.string().optional(),
  dateRange: Joi.string().optional(),
});

export const getStudentReportsSchema = Joi.object({
  student_id: Joi.string().optional(),
  startDate: Joi.string().optional(),
  endDate: Joi.string().optional(),
  dateRange: Joi.string().optional(),
});
