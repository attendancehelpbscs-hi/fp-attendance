import { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
    };
    staff?: {
      id?: string;
      [key: string]: any;
    };
  }
}

import createError from 'http-errors';
import { getAuditLogs, createAuditLog } from '../services/audit.service';
import { createSuccess } from '../helpers/http.helper';

export const getAuditLogsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await getAuditLogs(page, limit);
    return createSuccess(res, 200, 'Audit logs retrieved successfully', result);
  } catch (err) {
    return next(err);
  }
};

export const createAuditLogController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action, details } = req.body;
    const staffId = req.staff?.id;

    if (!staffId) {
      return next(createError(401, 'Unauthorized'));
    }

    if (!action) {
      return next(createError(400, 'Action is required'));
    }

    await createAuditLog(staffId, action, details);
    return createSuccess(res, 201, 'Audit log created successfully', {});
  } catch (err) {
    return next(err);
  }
};
