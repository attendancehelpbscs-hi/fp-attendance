import createError from 'http-errors';
import { NewStaff, RegisterReturn } from '../interfaces/staff.interface';
import { hashPassword } from '../helpers/password.helper';
import { signAccessToken, signRefreshToken } from '../helpers/jwt.helper';
import { prisma } from '../db/prisma-client';
import type { Staff } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { encryptFingerprint, generateFingerprintHash, handleFingerprintData } from '../helpers/fingerprint-security.helper';
import { createAuditLog } from './audit.service';

export const addStaffToDb = async (newStaff: NewStaff): Promise<RegisterReturn | void> => {
  const { firstName, lastName, name, email, password } = newStaff;
  //Check for existing staff in that model through password
  const staff = await prisma.staff.findUnique({
    where: {
      email,
    },
  });
  if (staff) {
    throw createError(406, 'Staff already exists');
  } else {
    //create new staff from the model

    const newStaff = {
      firstName,
      lastName,
      name,
      email,
      password,
      created_at: new Date().toISOString(),
    };
    try {
      const hashedPassword = await hashPassword(newStaff.password);
      newStaff.password = hashedPassword;
      const savedStaff = await prisma.staff.create({
        data: newStaff,
      });
      const { id, firstName, lastName, name, email, created_at, profilePicture } = savedStaff;

      const accessToken = await signAccessToken({ id });
      const refreshToken = await signRefreshToken({ id });

      return new Promise<RegisterReturn>((resolve) =>
        resolve({
          accessToken,
          refreshToken,
          staff: {
            id,
            firstName,
            lastName,
            name,
            email,
            created_at,
          profilePicture: profilePicture || undefined,
          },
        }),
      );
    } catch (err) {
      throw err;
    }
  }
};

export const updateStaffSettings = (staffId: string, settings: Partial<Pick<Staff, 'grace_period_minutes' | 'school_start_time' | 'late_threshold_hours'>>): Promise<Staff> => {
  return new Promise<Staff>(async (resolve, reject) => {
    try {
      const updatedStaff = await prisma.staff.update({
        where: {
          id: staffId,
        },
        data: settings,
      });
      resolve(updatedStaff);
    } catch (err) {
      reject(err);
    }
  });
};

export const getStaffSettings = (staffId: string): Promise<Pick<Staff, 'grace_period_minutes' | 'school_start_time' | 'late_threshold_hours'>> => {
  return new Promise<Pick<Staff, 'grace_period_minutes' | 'school_start_time' | 'late_threshold_hours'>>(async (resolve, reject) => {
    try {
      const staff = await prisma.staff.findUnique({
        where: {
          id: staffId,
        },
        select: {
          grace_period_minutes: true,
          school_start_time: true,
          late_threshold_hours: true,
        },
      });
      if (!staff) throw new createError.NotFound('Staff not found');
      resolve(staff);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateStaffProfile = (staffId: string, profileData: { firstName?: string; lastName?: string; name?: string; password?: string; currentPassword?: string; fingerprint?: string; profilePicture?: string }): Promise<Pick<Staff, 'id' | 'firstName' | 'lastName' | 'name' | 'email'>> => {
  return new Promise<Pick<Staff, 'id' | 'firstName' | 'lastName' | 'name' | 'email'>>(async (resolve, reject) => {
    try {
      const updateData: any = {};
      if (profileData.firstName) updateData.firstName = profileData.firstName;
      if (profileData.lastName) updateData.lastName = profileData.lastName;
      if (profileData.name) updateData.name = profileData.name;
      if (profileData.password) updateData.password = await hashPassword(profileData.password);

      // Handle fingerprint encryption
      if (profileData.fingerprint) {
        try {
          const encrypted = encryptFingerprint(profileData.fingerprint);
          updateData.fingerprint_hash = encrypted.hash;
          updateData.encrypted_fingerprint = JSON.stringify({
            encryptedData: encrypted.encryptedData,
            iv: encrypted.iv,
            tag: encrypted.tag
          });
          // Keep legacy field for backward compatibility during migration
          updateData.fingerprint = profileData.fingerprint;
        } catch (encryptionError) {
          console.error('Fingerprint encryption failed during staff profile update:', encryptionError);
          // Continue without encryption for now, but log the error
        }
      }

      if (profileData.profilePicture) updateData.profilePicture = profileData.profilePicture;

      // If updating password, verify current password
      if (profileData.password && profileData.currentPassword) {
        const staff = await prisma.staff.findUnique({
          where: { id: staffId },
          select: { password: true },
        });

        if (!staff) {
          throw createError(404, 'Staff not found');
        }

        const { validatePassword } = await import('../helpers/password.helper');
        const isValidPassword = await validatePassword(profileData.currentPassword, staff.password);
        if (!isValidPassword) {
          throw createError(400, 'Current password is incorrect');
        }

        // Send email notification for password change
        const staffInfo = await prisma.staff.findUnique({
          where: { id: staffId },
          select: { email: true, name: true },
        });
        if (staffInfo) {
          const { sendPasswordChangeNotification } = await import('../helpers/email.helper');
          await sendPasswordChangeNotification(staffInfo.email, staffInfo.name);
        }
      }

      const updatedStaff = await prisma.staff.update({
        where: {
          id: staffId,
        },
        data: updateData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          email: true,
          profilePicture: true,
        },
      });

      // Audit log for fingerprint encryption
      if (profileData.fingerprint && updateData.encrypted_fingerprint) {
        await createAuditLog(staffId, 'FINGERPRINT_ENCRYPTED', `Staff ${updatedStaff.email} fingerprint updated and encrypted`);
      }

      resolve(updatedStaff);
    } catch (err) {
      reject(err);
    }
  });
};

export const backupData = async (): Promise<string> => {
  try {
    // Fetch all data from the database
    const [staff, students, courses, attendances, studentCourses, studentAttendances, tokens, auditLogs] = await Promise.all([
      prisma.staff.findMany(),
      prisma.student.findMany(),
      prisma.course.findMany(),
      prisma.attendance.findMany(),
      prisma.studentCourse.findMany(),
      prisma.studentAttendance.findMany(),
      prisma.token.findMany(),
      prisma.auditLog.findMany(),
    ]);

    // Prepare backup data
    const backupData = {
      staff,
      students,
      courses,
      attendances,
      studentCourses,
      studentAttendances,
      tokens,
      auditLogs,
      backupDate: new Date().toISOString(),
    };

    // Create backups directory if it doesn't exist
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;
    const filePath = path.join(backupDir, filename);

    // Write data to file
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

    return filePath;
  } catch (error) {
    throw new Error('Failed to create backup');
  }
};
