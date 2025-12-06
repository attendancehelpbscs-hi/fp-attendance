import type { ObjectSchema } from 'joi';
import type { Request, Response, NextFunction } from 'express';
import logger from '../helpers/logger.helper';
import createError from 'http-errors';

const joiValidate = (schema: ObjectSchema, type: 'body' | 'query' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = await schema.validateAsync(req[type], { allowUnknown: true });
      if (!error) {
        next();
      } else {
        const { details } = error;
        const message = details.map((i: any) => i.message).join(',');
        logger.error('Validation Error', message);
        return next(createError(422, ...[{ validation_error: message }]));
      }
    } catch (err: any) {
      const message = err.message || 'Validation failed';
      logger.error('Validation Error', message);
      return next(createError(422, ...[{ validation_error: message }]));
    }
  };
};

export default joiValidate;
