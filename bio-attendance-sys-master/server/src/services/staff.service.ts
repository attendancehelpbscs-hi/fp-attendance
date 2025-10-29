import createError from 'http-errors';
import { NewStaff, RegisterReturn } from '../interfaces/staff.interface';
import { hashPassword } from '../helpers/password.helper';
import { signAccessToken, signRefreshToken } from '../helpers/jwt.helper';
import { prisma } from '../db/prisma-client';
import type { Staff } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export const addStaffToDb = async (newStaff: NewStaff): Promise<RegisterReturn | void> => {
  const { name, email, password } = newStaff;
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
      const { id, name, email, created_at } = savedStaff;

      const accessToken = await signAccessToken({ id });
      const refreshToken = await signRefreshToken({ id });

      return new Promise<RegisterReturn>((resolve) =>
        resolve({
          accessToken,
          refreshToken,
          staff: {
            id,
            name,
            email,
            created_at,
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

export const updateStaffProfile = (staffId: string, profileData: { name?: string; password?: string }): Promise<Pick<Staff, 'id' | 'name' | 'email'>> => {
  return new Promise<Pick<Staff, 'id' | 'name' | 'email'>>(async (resolve, reject) => {
    try {
      const updateData: any = {};
      if (profileData.name) updateData.name = profileData.name;
      if (profileData.password) updateData.password = await hashPassword(profileData.password);

      const updatedStaff = await prisma.staff.update({
        where: {
          id: staffId,
        },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
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
