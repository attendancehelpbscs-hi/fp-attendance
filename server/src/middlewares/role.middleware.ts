import { Response, NextFunction } from 'express';
import createError from 'http-errors';
import { AuthReq } from '../interfaces/middleware.interface';
import { prisma } from '../db/prisma-client';
import type { JwtPayload } from 'jsonwebtoken';

// Extend JwtPayload to include our custom properties
interface CustomJwtPayload extends JwtPayload {
  id: string;
}

/**
 * Middleware to check if the authenticated user has the required role
 * @param requiredRole - The role required to access the resource ('ADMIN' or 'TEACHER')
 * @returns Middleware function that checks the user's role
 */
export const requireRole = (requiredRole: 'ADMIN' | 'TEACHER') => {
  return async (req: AuthReq, _: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user as CustomJwtPayload;
      
      if (!user || !user.id) {
        return next(createError(401, 'Authentication required'));
      }

      // Get the user's role from the database
      const dbUser = await prisma.staff.findUnique({
        where: { id: user.id },
        select: { role: true }
      });

      if (!dbUser) {
        return next(createError(401, 'User not found'));
      }

      // Check if the user has the required role
      if (dbUser.role !== requiredRole) {
        return next(createError(403, 'Access denied. Insufficient permissions.'));
      }

      next();
    } catch (error) {
      return next(createError(500, 'Error checking user permissions'));
    }
  };
};

/**
 * Middleware to check if the authenticated user is either an admin or the owner of the resource
 * @param resourceUserIdParam - The parameter name that contains the resource owner's user ID (default: 'staff_id')
 * @returns Middleware function that checks if the user is an admin or the resource owner
 */
export const requireAdminOrOwner = (resourceUserIdParam: string = 'staff_id') => {
  return async (req: AuthReq, _: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user as CustomJwtPayload;
      
      if (!user || !user.id) {
        return next(createError(401, 'Authentication required'));
      }

      // Get the resource owner's ID from the request parameters
      const resourceUserId = req.params[resourceUserIdParam];

      if (!resourceUserId) {
        return next(createError(400, `Resource owner ID parameter '${resourceUserIdParam}' is missing`));
      }

      // Get the user's role from the database
      const dbUser = await prisma.staff.findUnique({
        where: { id: user.id },
        select: { role: true }
      });

      if (!dbUser) {
        return next(createError(401, 'User not found'));
      }

      // Check if the user is an admin or the owner of the resource
      if (dbUser.role !== 'ADMIN' && user.id !== resourceUserId) {
        return next(createError(403, 'Access denied. You can only access your own resources.'));
      }

      next();
    } catch (error) {
      return next(createError(500, 'Error checking user permissions'));
    }
  };
};

/**
 * Middleware to check if the authenticated user is a teacher and the owner of the resource
 * @param resourceUserIdParam - The parameter name that contains the resource owner's user ID (default: 'staff_id')
 * @returns Middleware function that checks if the user is a teacher and the resource owner
 */
export const requireTeacherOwner = (resourceUserIdParam: string = 'staff_id') => {
  return async (req: AuthReq, _: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user as CustomJwtPayload;
      
      if (!user || !user.id) {
        return next(createError(401, 'Authentication required'));
      }

      // Get the resource owner's ID from the request parameters
      const resourceUserId = req.params[resourceUserIdParam];

      if (!resourceUserId) {
        return next(createError(400, `Resource owner ID parameter '${resourceUserIdParam}' is missing`));
      }

      // Get the user's role from the database
      const dbUser = await prisma.staff.findUnique({
        where: { id: user.id },
        select: { role: true }
      });

      if (!dbUser) {
        return next(createError(401, 'User not found'));
      }

      // Check if the user is a teacher and the owner of the resource
      if (dbUser.role !== 'TEACHER' || user.id !== resourceUserId) {
        return next(createError(403, 'Access denied. Only teachers can access their own resources.'));
      }

      next();
    } catch (error) {
      return next(createError(500, 'Error checking user permissions'));
    }
  };
};