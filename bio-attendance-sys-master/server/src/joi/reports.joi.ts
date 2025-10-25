import Joi from 'joi';

export const getReportsSchema = Joi.object({
  grade: Joi.string().optional(),
  section: Joi.string().optional(),
  dateRange: Joi.string().optional(),
});
