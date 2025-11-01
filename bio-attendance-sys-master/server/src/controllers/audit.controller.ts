import type { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { getAuditLogs, createAuditLog } from '../services/audit.service';
import { createSuccess } from '../helpers/http.helper';

export const getAuditLogsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await getAuditLogs();
    return createSuccess(res, 200, 'Audit logs retrieved successfully', { logs });
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
