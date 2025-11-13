import type { Request, Response, NextFunction } from 'express';
import createError from 'http-errors';
import { delRefreshToken, getNewTokens, getStaffFromDb } from '../services/auth.service';
import { createSuccess } from '../helpers/http.helper';
import { sendPasswordResetEmail, sendPasswordChangeNotification } from '../helpers/email.helper';
import { signAccessToken, signRefreshToken } from '../helpers/jwt.helper';
import jwt from 'jsonwebtoken';
import { envConfig } from '../config/environment.config';
import constants from '../config/constants.config';
import { prisma } from '../db/prisma-client';

export const loginStaff = async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  //check if all input fields have value
  if (!email || !password) {
    return next(createError(400, 'Please, enter all fields'));
    // return createSuccess(res, 200, 'Staff created');
  }

  try {
    const loggedInStaff = await getStaffFromDb(email, password);
    if (loggedInStaff) {
      return createSuccess(res, 200, 'Staff logged in successfully', loggedInStaff);
    }
  } catch (err) {
    return next(err);
  }
};

export const refreshStaffToken = async (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;

  //check if all input fields have value
  if (!refreshToken) {
    return next(createError(400, 'Please, enter all fields'));
  }

  try {
    const tokens = await getNewTokens(refreshToken);
    if (tokens) {
      return createSuccess(res, 200, 'Token refreshed successfully', tokens);
    }
  } catch (err) {
    return next(err);
  }
};

export const logoutStaff = async (req: Request, res: Response, next: NextFunction) => {
  const { staff_id } = req.body;

  try {
    if (staff_id) {
      await delRefreshToken(staff_id);
    }
    return createSuccess(res, 200, 'Staff logged out successfully', {});
  } catch (err) {
    return next(err);
  }
};



export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  try {
    // Check if staff exists with this email
    const staff = await getStaffFromDb(email, '', true); // Pass true to indicate forgot password check
    if (!staff) {
      // Don't reveal if email exists or not for security
      return createSuccess(res, 200, 'If an account with this email exists, a password reset link has been sent.', {});
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { staffId: staff.staff.id, email: staff.staff.email },
      constants.accessTokenSecret as string,
      { expiresIn: '1h' }
    );

    // Send reset email
    await sendPasswordResetEmail(email, resetToken);

    return createSuccess(res, 200, 'If an account with this email exists, a password reset link has been sent.', {});
  } catch (err) {
    console.error('Forgot password error:', err);
    return next(createError(500, 'An error occurred while processing your request'));
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const { token, newPassword } = req.body;

  try {
    // Verify token
    const decoded = jwt.verify(token, constants.accessTokenSecret as string) as any;

    if (!decoded.staffId || !decoded.email) {
      return next(createError(400, 'Invalid reset token'));
    }

    // Update password in database
    const { hashPassword } = await import('../helpers/password.helper');
    const hashedPassword = await hashPassword(newPassword);

    await prisma.staff.update({
      where: { id: decoded.staffId },
      data: { password: hashedPassword },
    });

    // Send confirmation email
    await sendPasswordChangeNotification(decoded.email, 'Staff Member');

    return createSuccess(res, 200, 'Password reset successfully', {});
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      return next(createError(400, 'Invalid or expired reset token'));
    }
    console.error('Reset password error:', err);
    return next(createError(500, 'An error occurred while resetting your password'));
  }
};

export const fingerprintLogin = async (req: Request, res: Response, next: NextFunction) => {
  const { fingerprint } = req.body;

  console.log('Fingerprint login attempt, fingerprint length:', fingerprint?.length);

  if (!fingerprint || typeof fingerprint !== 'string') {
    return next(createError(400, 'Fingerprint data is required'));
  }

  try {
    // First, fetch all staff fingerprints from database
    const staffWithFingerprints = await prisma.staff.findMany({
      where: {
        fingerprint: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        fingerprint: true,
      },
    });

    if (!staffWithFingerprints || staffWithFingerprints.length === 0) {
      console.log('No staff with fingerprints found');
      throw createError(401, 'No staff fingerprints available for authentication');
    }

    console.log(`Found ${staffWithFingerprints.length} staff members with fingerprints`);

    // Validate that fingerprints are properly stored
    const validStaffFingerprints = staffWithFingerprints.filter(staff => {
      if (!staff.fingerprint) return false;

      // Check if fingerprint data looks valid
      try {
        const fingerprintStr = staff.fingerprint.startsWith('data:image/')
          ? staff.fingerprint.split(',')[1]
          : staff.fingerprint;

        // Try to decode to validate
        Buffer.from(fingerprintStr, 'base64');
        return true;
      } catch (error) {
        console.error(`Invalid fingerprint data for staff ${staff.id}:`, error instanceof Error ? error.message : String(error));
        return false;
      }
    });

    if (validStaffFingerprints.length === 0) {
      console.log('No valid staff fingerprints found after validation');
      throw createError(401, 'No valid staff fingerprints available for authentication');
    }

    console.log(`Found ${validStaffFingerprints.length} valid staff fingerprints`);

    // Send fingerprint and staff data to Python server for identification
    const axios = require('axios');
    const fs = require('fs');
    const path = require('path');
    const FormData = require('form-data');

    // Convert base64 fingerprint to image file
    let base64Data: string;
    try {
      base64Data = fingerprint.replace(/^data:image\/png;base64,/, '');
      // Validate base64
      Buffer.from(base64Data, 'base64');
    } catch (error) {
      console.error('Invalid base64 fingerprint data received:', error instanceof Error ? error.message : String(error));
      throw createError(400, 'Invalid fingerprint data format');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const tempPath = path.join(__dirname, '../../temp_fingerprint.png');
    fs.writeFileSync(tempPath, buffer);

    // Create form data for Python server
    const form = new FormData();
    form.append('file', fs.createReadStream(tempPath));
    form.append('staff_fingerprints', JSON.stringify(validStaffFingerprints));

    console.log('Sending fingerprint and staff data to Python server for identification');

    // Call Python server
    const pythonResponse = await axios.post('http://localhost:5050/identify/staff-fingerprint', form, {
      headers: form.getHeaders(),
    });

    // Clean up temp file
    fs.unlinkSync(tempPath);

    const identificationResult = pythonResponse.data;

    if (!identificationResult.staff_id || identificationResult.confidence < 10) {
      console.log('Fingerprint not recognized or low confidence');
      throw createError(401, 'Fingerprint not recognized');
    }

    console.log(`Staff identified: ID ${identificationResult.staff_id}, confidence: ${identificationResult.confidence}%`);

    // Get staff details from database
    const staff = await prisma.staff.findUnique({
      where: { id: identificationResult.staff_id },
    });

    if (!staff) {
      console.log('Staff not found in database');
      throw createError(401, 'Fingerprint not recognized');
    }

    // Generate tokens
    const accessToken = await signAccessToken({ id: staff.id });
    const refreshToken = await signRefreshToken({ id: staff.id });

    console.log('Tokens generated for fingerprint login');

    // Log successful login
    await prisma.auditLog.create({
      data: {
        staff_id: staff.id,
        action: 'LOGIN',
        details: `Staff ${staff.name} logged in via fingerprint (confidence: ${identificationResult.confidence.toFixed(2)}%)`,
      },
    });

    console.log('Audit log created, sending success response');

    return createSuccess(res, 200, 'Fingerprint login successful', {
      accessToken,
      refreshToken,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        created_at: staff.created_at,
      },
    });
  } catch (err) {
    console.error('Fingerprint login error:', err);
    return next(err);
  }
};
