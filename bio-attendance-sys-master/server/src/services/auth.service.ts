import createError from 'http-errors';
import { RegisterReturn } from '../interfaces/staff.interface';
import { validatePassword } from '../helpers/password.helper';
import { signAccessToken, verifyRefreshToken, signRefreshToken } from '../helpers/jwt.helper';
import { deleteRefreshTokensByStaffId } from '../helpers/token.helper';
import { prisma } from '../db/prisma-client';

export const getStaffFromDb = async (staffEmail: string, staffPassword: string, isForgotPasswordCheck: boolean = false): Promise<RegisterReturn | any> => {
  //Check for existing staff in that model through password
  const staff = await prisma.staff.findUnique({
    where: {
      email: staffEmail,
    },
    include: {
      courses: {
        select: {
          course_code: true,
          grade: true,
          matric_no: true
        },
        take: 1, // Get the first course for section/grade info
        orderBy: {
          created_at: 'desc'
        }
      }
    }
  });

  if (!staff) {
    if (isForgotPasswordCheck) {
      return null; // Return null for forgot password check without throwing error
    }
    throw new createError.NotFound('Staff does not exist');
  } else {
    if (isForgotPasswordCheck) {
      return { staff }; // Return staff info for forgot password
    }

    const { id, firstName, lastName, name, email, password, role, created_at, profilePicture, courses } = staff;
    const profilePictureData = profilePicture || undefined;

    try {
      const match = await validatePassword(staffPassword, password);

      if (match) {
        // Log successful login
        await prisma.auditLog.create({
          data: {
            staff_id: id,
            action: 'LOGIN',
            details: `Staff ${name} logged in via email/password`,
          },
        });

        const accessToken = await signAccessToken({ id });
        const refreshToken = await signRefreshToken({ id });

        // Include grade and section for teachers
        const staffResponse: any = {
          id,
          firstName,
          lastName,
          name,
          email,
          role, // Include role in the return object
          created_at,
          profilePicture: profilePictureData,
        };

        if (role === 'TEACHER' && courses.length > 0) {
          staffResponse.grade = courses[0].grade;
          staffResponse.section = courses[0].course_code;
          staffResponse.matric_no = courses[0].matric_no;
        }

        return new Promise<RegisterReturn>((resolve) =>
          resolve({
            accessToken,
            refreshToken,
            staff: staffResponse,
          }),
        );
      } else {
        throw createError(401, 'Incorrect password');
      }
    } catch (err) {
      throw err;
    }
  }
};

export const getNewTokens = async (refreshToken: string): Promise<object | undefined> => {
  try {
    const decoded = await verifyRefreshToken(refreshToken);

    const accessToken = await signAccessToken({ id: decoded?.id });
    const refToken = await signRefreshToken({ id: decoded?.id });

    return new Promise((resolve) => {
      resolve({ accessToken, refreshToken: refToken });
    });
  } catch (err) {
    throw err;
  }
};

export const delRefreshToken = async (staff_id: string): Promise<number | undefined> => {
  try {
    // Get staff info for detailed logout log
    const staff = await prisma.staff.findUnique({
      where: { id: staff_id },
      select: { name: true }
    });

    // Log logout only if staff exists
    if (staff) {
      await prisma.auditLog.create({
        data: {
          staff_id,
          action: 'LOGOUT',
          details: `Staff ${staff.name} logged out`,
        },
      });
    }

    // delete id from database
    await deleteRefreshTokensByStaffId(staff_id);

    return new Promise((resolve) => {
      resolve(undefined);
    });
  } catch (err) {
    throw err;
  }
};