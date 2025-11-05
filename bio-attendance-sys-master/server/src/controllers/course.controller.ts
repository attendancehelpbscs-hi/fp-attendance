import type { Request, Response, NextFunction } from 'express';
import type { JwtPayload } from 'jsonwebtoken';
import { createSuccess } from '../helpers/http.helper';
import createError from 'http-errors';
import { checkIfCourseExists, removeCourseFromDb, saveCourseToDb, updateCourseInDb } from '../services/course.service';
import { prisma } from '../db/prisma-client';
import type { Course } from '@prisma/client';
import type { PaginationMeta } from '../interfaces/helper.interface';

export const getCourses = async (req: Request, res: Response, next: NextFunction) => {
  // get courses that belongs to single staff
  const { staff_id } = req.params;
  const { per_page, page } = req.query;
  const user_id = (req.user as JwtPayload).id;
  if (!staff_id) return next(new createError.BadRequest('Staff ID is required'));
  if (staff_id !== user_id) return next(new createError.Forbidden('Access denied'));
  if (!page) return next(new createError.BadRequest('Page is required'));
  try {
    const courseCount = await prisma.course.count({
      where: {
        staff_id,
      },
    });
    const perPage = Number(per_page) || 10;
    const courses = await prisma.course.findMany({
      where: {
        staff_id,
      },
      skip: (Number(page) - 1) * perPage,
      take: perPage,
      orderBy: {
        created_at: 'desc',
      },
    });
    const meta: PaginationMeta = {
      total_items: courseCount,
      total_pages: Math.ceil(courseCount / perPage) || 1,
      page: Number(page),
      per_page: perPage,
    };
    return createSuccess(res, 200, 'Course fetched successfully', { courses, meta });
  } catch (err) {
    return next(err);
  }
};

export const getSingleCourse = async (req: Request, res: Response, next: NextFunction) => {
  // get courses that belongs to single staff
  const { id } = req.params;
  if (!id) return next(new createError.BadRequest('Course ID is required'));
  try {
    const course = await prisma.course.findUnique({
      where: {
        id,
      },
    });
    if (!course) throw new createError.NotFound('Course not found');
    return createSuccess(res, 200, 'Course fetched successfully', { course });
  } catch (err) {
    return next(err);
  }
};

export const createCourse = async (req: Request, res: Response, next: NextFunction) => {
  // create course
  const { course_name, course_code, grade, staff_id } = req.body as Pick<Course, 'course_name' | 'course_code' | 'grade' | 'staff_id'>;
  const user_id = (req.user as JwtPayload).id;

  if (!course_code) {
    return next(createError(400, 'The course_code field is required.'));
  }
  if (!grade) {
    return next(createError(400, 'The grade field is required.'));
  }
  if (staff_id !== user_id) {
    return next(createError(403, 'Access denied'));
  }
  try {
    const courseExists = await checkIfCourseExists(course_code, staff_id);
    if (courseExists) {
      return next(
        createError(
          400,
          ...[
            {
              message: 'Course with the same code already exists.',
              errorType: 'COURSE_ALREADY_EXISTS',
            },
          ],
        ),
      );
    }
    const newCourse = { staff_id, course_name, course_code, grade, created_at: new Date() };
    const savedCourse = await saveCourseToDb(newCourse);
    return createSuccess(res, 200, 'Course created successfully', { course: savedCourse });
  } catch (err) {
    return next(err);
  }
};

export const updateCourse = async (req: Request, res: Response, next: NextFunction) => {
  // update course
  const { id } = req.params;
  if (!id) return next(createError(400, 'No course ID provided'));
  const newUpdate = req.body as Partial<Course>;
  try {
    const updatedCourse = await updateCourseInDb(id, newUpdate);
    return createSuccess(res, 200, 'Course updated successfully', { course: updatedCourse });
  } catch (err) {
    return next(err);
  }
};

export const deleteCourse = async (req: Request, res: Response, next: NextFunction) => {
  // delete course
  const { id } = req.params;
  if (!id) return next(createError(400, 'No course ID provided'));
  try {
    await removeCourseFromDb(id);
    return createSuccess(res, 200, 'Course deleted successfully', { deleted: true });
  } catch (err) {
    return next(err);
  }
};
