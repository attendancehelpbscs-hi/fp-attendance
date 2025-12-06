import { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

import createError from 'http-errors';
import { addStaffToDb, updateStaffSettings, getStaffSettings, backupData, updateStaffProfile } from '../services/staff.service';
import { clearAuditLogs } from '../services/audit.service';
import { createSuccess } from '../helpers/http.helper';
import { JwtPayload } from '../@types/jwt';
import * as path from 'path';
import { prisma } from '../db/prisma-client';
import { handleFingerprintData } from '../helpers/fingerprint-security.helper';


// Helper function to clean and validate base64 fingerprint data
function cleanAndValidateFingerprint(fingerprint: string): string | null {
  try {
    // Remove data URL prefix if present
    let cleanedFingerprint = fingerprint;
    if (fingerprint.includes(',')) {
      cleanedFingerprint = fingerprint.split(',')[1];
    }
    
    // Remove whitespace and newlines
    cleanedFingerprint = cleanedFingerprint.replace(/[^A-Za-z0-9+/=]/g, '');
    
    // Fix padding
    const missingPadding = cleanedFingerprint.length % 4;
    if (missingPadding) {
      cleanedFingerprint += '='.repeat(4 - missingPadding);
    }
    
    // Validate by attempting to decode
    const buffer = Buffer.from(cleanedFingerprint, 'base64');
    
    // Check if buffer is not empty and has reasonable size (fingerprint images are typically 50KB-500KB)
    if (buffer.length < 1000 || buffer.length > 5000000) {
      console.error(`Invalid fingerprint size: ${buffer.length} bytes`);
      return null;
    }
    
    // Check PNG header (first 8 bytes should be: 89 50 4E 47 0D 0A 1A 0A)
    const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    const jpegHeader = [0xFF, 0xD8, 0xFF];

    const isPNG = buffer.length >= 8 &&
      buffer[0] === pngHeader[0] && buffer[1] === pngHeader[1] && buffer[2] === pngHeader[2] && buffer[3] === pngHeader[3] &&
      buffer[4] === pngHeader[4] && buffer[5] === pngHeader[5] && buffer[6] === pngHeader[6] && buffer[7] === pngHeader[7];
    const isJPEG = buffer.length >= 3 &&
      buffer[0] === jpegHeader[0] && buffer[1] === jpegHeader[1] && buffer[2] === jpegHeader[2];
    
    if (!isPNG && !isJPEG) {
      console.error('Fingerprint data is not a valid PNG or JPEG image');
      return null;
    }
    
    console.log(`Valid fingerprint detected: ${isJPEG ? 'JPEG' : 'PNG'}, size: ${buffer.length} bytes`);
    
    return cleanedFingerprint;
  } catch (error) {
    console.error('Error validating fingerprint:', error);
    return null;
  }
}

export const updateSettings = async (req: Request, res: Response, next: NextFunction) => {
  const { grace_period_minutes, school_start_time, late_threshold_hours, pm_late_cutoff_enabled, pm_late_cutoff_time } = req.body;
  const user_id = (req.user as JwtPayload).id;

  try {
    const updatedStaff = await updateStaffSettings(user_id, {
      grace_period_minutes,
      school_start_time,
      late_threshold_hours,
      pm_late_cutoff_enabled,
      pm_late_cutoff_time,
    });
    return createSuccess(res, 200, 'Settings updated successfully', {
      settings: {
        grace_period_minutes: updatedStaff.grace_period_minutes,
        school_start_time: updatedStaff.school_start_time,
        late_threshold_hours: updatedStaff.late_threshold_hours,
        pm_late_cutoff_enabled: updatedStaff.pm_late_cutoff_enabled,
        pm_late_cutoff_time: updatedStaff.pm_late_cutoff_time,
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
  const { name, firstName, lastName, password, confirmPassword, currentPassword, fingerprint, profilePicture } = req.body;
  const user_id = (req.user as JwtPayload).id;

  // Validate input
  if (!name && !firstName && !lastName && !password && !fingerprint && !profilePicture) {
    return next(createError(400, 'Please provide at least name, firstName, lastName, password, fingerprint, or profilePicture to update'));
  }

  if (password && password !== confirmPassword) {
    return next(createError(400, 'Passwords do not match'));
  }

  try {
    const profileData: {
      name?: string;
      firstName?: string;
      lastName?: string;
      password?: string;
      currentPassword?: string;
      fingerprint?: string;
      profilePicture?: string;
    } = {};
    if (name) profileData.name = name;
    if (firstName) profileData.firstName = firstName;
    if (lastName) profileData.lastName = lastName;
    if (password) profileData.password = password;
    if (currentPassword) profileData.currentPassword = currentPassword;

    // Validate and clean fingerprint data before saving (same as student enrollment)
    if (fingerprint) {
      console.log('Received fingerprint data, length:', fingerprint.length);

      const cleanedFingerprint = cleanAndValidateFingerprint(fingerprint);
      if (!cleanedFingerprint) {
        return next(createError(400, 'Invalid fingerprint data. Please ensure your fingerprint scanner is working properly and try again.'));
      }

      profileData.fingerprint = cleanedFingerprint;
    }

    // Handle profile picture upload
    if (profilePicture) {
      // Validate base64 image data
      try {
        const buffer = Buffer.from(profilePicture, 'base64');
        if (buffer.length > 5 * 1024 * 1024) { // 5MB limit
          return next(createError(400, 'Profile picture too large. Maximum size is 5MB.'));
        }
        profileData.profilePicture = profilePicture;
      } catch (error) {
        return next(createError(400, 'Invalid profile picture data.'));
      }
    }

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
        encrypted_fingerprint: true,
        fingerprint_hash: true,
      },
    });

    const processedStaff = staff.map(staffMember => {
      // Handle fingerprint data (decrypt if encrypted, detect corruption)
      const fingerprintResult = handleFingerprintData(staffMember.fingerprint || undefined, staffMember.encrypted_fingerprint || undefined, staffMember.fingerprint_hash || undefined);

      // Log corruption detection
      if (fingerprintResult.isCorrupted) {
        console.error(`Corrupted fingerprint detected for staff ${staffMember.id}`);
        // Could add alerting mechanism here
      }

      return {
        id: staffMember.id,
        name: staffMember.name,
        email: staffMember.email,
        fingerprint: fingerprintResult.data, // Always return decrypted data for Python server
        isCorrupted: fingerprintResult.isCorrupted,
        needsMigration: fingerprintResult.needsMigration,
      };
    });

    return createSuccess(res, 200, 'Staff fingerprints retrieved successfully', { staff: processedStaff });
  } catch (err) {
    return next(err);
  }
};
