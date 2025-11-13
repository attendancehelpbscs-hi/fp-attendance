import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { addStaffToDb, updateStaffSettings, getStaffSettings, backupData, updateStaffProfile } from '../services/staff.service';
import { clearAuditLogs } from '../services/audit.service';
import { createSuccess } from '../helpers/http.helper';
import type { JwtPayload } from 'jsonwebtoken';
import * as path from 'path';
import { prisma } from '../db/prisma-client';

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
  const { name, password, confirmPassword, currentPassword, fingerprint } = req.body;
  const user_id = (req.user as JwtPayload).id;

  // Validate input
  if (!name && !password && !fingerprint) {
    return next(createError(400, 'Please provide at least name, password, or fingerprint to update'));
  }

  if (password && password !== confirmPassword) {
    return next(createError(400, 'Passwords do not match'));
  }

  try {
    const profileData: { name?: string; password?: string; currentPassword?: string; fingerprint?: string } = {};
    if (name) profileData.name = name;
    if (password) profileData.password = password;
    if (currentPassword) profileData.currentPassword = currentPassword;
    if (fingerprint) profileData.fingerprint = fingerprint;

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

export const getStaffFingerprints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staff = await prisma.staff.findMany({
      where: {
        fingerprint: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        fingerprint: true,
      },
    });

    return createSuccess(res, 200, 'Staff fingerprints retrieved successfully', { staff });
  } catch (err) {
    return next(err);
  }
};
