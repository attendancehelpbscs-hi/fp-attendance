import Joi from 'joi';
import type { PaginationInput } from '../interfaces/helper.interface';

export const paginateInputSchema = Joi.object<PaginationInput>({
  page: Joi.string().min(1).max(4).required(),
  per_page: Joi.string().min(1).max(4).optional(),
});
