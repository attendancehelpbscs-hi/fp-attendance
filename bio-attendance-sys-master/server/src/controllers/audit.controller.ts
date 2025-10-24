import type { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { getAuditLogs } from '../services/audit.service';
import { createSuccess } from '../helpers/http.helper';

export const getAuditLogsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await getAuditLogs();
    return createSuccess(res, 200, 'Audit logs retrieved successfully', { logs });
  } catch (err) {
    return next(err);
  }
};
