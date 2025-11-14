import { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { addStaffToDb, updateStaffSettings, getStaffSettings, backupData, updateStaffProfile } from '../services/staff.service';
import { clearAuditLogs } from '../services/audit.service';
import { createSuccess } from '../helpers/http.helper';
import type { JwtPayload } from 'jsonwebtoken';
import * as path from 'path';
import { prisma } from '../db/prisma-client';

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
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF]);
    
    const isPNG = buffer.slice(0, 8).equals(pngHeader);
    const isJPEG = buffer.slice(0, 3).equals(jpegHeader);
    
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
    
    // Validate and clean fingerprint data before saving
    if (fingerprint) {
      console.log('Received fingerprint data, length:', fingerprint.length);
      
      // Convert to JPEG to avoid PNG corruption issues
      try {
        const { createCanvas, loadImage } = require('canvas');
        
        let cleanedFingerprint = fingerprint;
        if (fingerprint.includes(',')) {
          cleanedFingerprint = fingerprint.split(',')[1];
        }
        cleanedFingerprint = cleanedFingerprint.replace(/[^A-Za-z0-9+/=]/g, '');
        const missingPadding = cleanedFingerprint.length % 4;
        if (missingPadding) {
          cleanedFingerprint += '='.repeat(4 - missingPadding);
        }
        
        const buffer = Buffer.from(cleanedFingerprint, 'base64');
        console.log('Original fingerprint buffer size:', buffer.length);
        
        const img = await loadImage(buffer);
        
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Export as JPEG with high quality
        const jpegBuffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
        console.log('Converted to JPEG, new size:', jpegBuffer.length);
        
        const jpegBase64 = jpegBuffer.toString('base64');
        profileData.fingerprint = jpegBase64;
        
      } catch (conversionError) {
        console.error('Canvas conversion failed, rejecting corrupted fingerprint:', conversionError);
        return next(createError(400, 'Corrupted fingerprint data detected. Please ensure your fingerprint scanner is working properly and try again.'));
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
      },
    });

    return createSuccess(res, 200, 'Staff fingerprints retrieved successfully', { staff });
  } catch (err) {
    return next(err);
  }
};