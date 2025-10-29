import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { addStaffToDb, updateStaffSettings, getStaffSettings, backupData, updateStaffProfile } from '../services/staff.service';
import { clearAuditLogs } from '../services/audit.service';
import { createSuccess } from '../helpers/http.helper';
import type { JwtPayload } from 'jsonwebtoken';
import * as path from 'path';

export const registerStaff = async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password, retype_password } = req.body;

  //check if all input fields have value
  if (!name || !email || !password || !retype_password) {
    return next(createError(400, 'Please, enter all fields'));
  }

  if (password !== retype_password) {
    return next(createError(400, 'Passwords must be same'));
  }

  try {
    const registeredStaff = await addStaffToDb(req.body);
    if (registeredStaff) {
      return createSuccess(res, 200, 'Staff registered successfully', { staff: registeredStaff });
    }
  } catch (err) {
    return next(err);
  }
};

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  const { grace_period_minutes, school_start_time, late_threshold_hours } = req.body;
  const user_id = (req.user as JwtPayload).id;

  try {
    const updatedStaff = await updateStaffSettings(user_id, {
      grace_period_minutes,
      school_start_time,
      late_threshold_hours,
    });
    return createSuccess(res, 200, 'Settings updated successfully', {
      settings: {
        grace_period_minutes: updatedStaff.grace_period_minutes,
        school_start_time: updatedStaff.school_start_time,
        late_threshold_hours: updatedStaff.late_threshold_hours,
      },
    });
  } catch (err) {
    return next(err);
  }
};

export const getSettings = async (req: Request, res: Response, next: NextFunction) => {
  const user_id = (req.user as JwtPayload).id;

  try {
    const settings = await getStaffSettings(user_id);
    return createSuccess(res, 200, 'Settings retrieved successfully', { settings });
  } catch (err) {
    return next(err);
  }
};

export const backupDataController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filePath = await backupData();
    const filename = path.basename(filePath);

    // Send the file as download
    res.download(filePath, filename, (err) => {
      if (err) {
        return next(err);
      }
    });
  } catch (err) {
    return next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  const { name, password, confirmPassword } = req.body;
  const user_id = (req.user as JwtPayload).id;

  // Validate input
  if (!name && !password) {
    return next(createError(400, 'Please provide at least name or password to update'));
  }

  if (password && password !== confirmPassword) {
    return next(createError(400, 'Passwords do not match'));
  }

  try {
    const profileData: { name?: string; password?: string } = {};
    if (name) profileData.name = name;
    if (password) profileData.password = password;

    const updatedStaff = await updateStaffProfile(user_id, profileData);
    return createSuccess(res, 200, 'Profile updated successfully', { staff: updatedStaff });
  } catch (err) {
    return next(err);
  }
};

export const clearAuditLogsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await clearAuditLogs();
    return createSuccess(res, 200, 'Audit logs cleared successfully', {});
  } catch (err) {
    return next(err);
  }
};
