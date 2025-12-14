import createError from 'http-errors';
import { prisma } from '../db/prisma-client';
import type { Course } from '@prisma/client';
import { isSectionValidForGrade, isSectionAlreadyAssigned } from '../config/sections.config';

export const saveCourseToDb = (course: Omit<Course, 'id'>): Promise<Course> => {
  return new Promise<Course>(async (resolve, reject) => {
    try {
      // Validate section if provided
      if (course.course_code && course.grade) {
        // Check if section is valid for the grade
        if (!isSectionValidForGrade(course.course_code, course.grade)) {
          reject(createError(400, `Section ${course.course_code} is not valid for Grade ${course.grade}`));
          return;
        }

        // Check if section is already assigned to another teacher for the same grade
        const isSectionTaken = await isSectionAlreadyAssigned(course.course_code, course.grade, course.staff_id);
        if (isSectionTaken) {
          reject(createError(409, `Section ${course.course_code} for Grade ${course.grade} is already assigned to another teacher`));
          return;
        }
      }

      const savedCourse = await prisma.course.create({
        data: course,
      });
      resolve(savedCourse);
    } catch (err) {
      reject(err);
    }
  });
};

export const removeCourseFromDb = (courseId: string): Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      await prisma.$transaction(async (tx) => {
        // First, delete all StudentCourse records associated with this course
        await tx.studentCourse.deleteMany({
          where: {
            course_id: courseId,
          },
        });

        // Then, delete the course
        const res = await tx.course.delete({
          where: {
            id: courseId,
          },
        });

        if (!res) {
          throw new createError.NotFound('Course not found');
        }
      });

      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateCourseInDb = (id: string, newUpdate: Partial<Course>): Promise<Course> => {
  return new Promise<Course>(async (resolve, reject) => {
    try {
      const course = await prisma.course.update({
        where: {
          id,
        },
        data: newUpdate,
      });
      resolve(course);
    } catch (err) {
      reject(err);
    }
  });
};

export const checkIfCourseExists = (course_code: string, staff_id: string): Promise<boolean> => {
  return new Promise<boolean>(async (resolve, reject) => {
    try {
      const course = await prisma.course.findFirst({
        where: {
          course_code,
          staff_id,
        },
        select: {
          id: true,
        },
      });
      if (course) resolve(true);
      resolve(false);
    } catch (err) {
      reject(err);
    }
  });
};
