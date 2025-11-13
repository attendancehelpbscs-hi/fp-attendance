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

      const { id, name, email, password, created_at } = staff;

      try {
        const match = await validatePassword(staffPassword, password);

        if (match) {
        // Log successful login
        await prisma.auditLog.create({
          data: {
            staff_id: id,
            action: 'LOGIN',
            details: `Staff ${name} logged in successfully`,
          },
        });

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
          details: `Staff ${staff.name} logged out successfully`,
        },
      });
    }

    // delete id from database
    await deleteRefreshTokensByStaffId(staff_id);

    return new Promise((resolve) => {
      // resolve(value);
      resolve(undefined);
    });
  } catch (err) {
    throw err;
  }
};
