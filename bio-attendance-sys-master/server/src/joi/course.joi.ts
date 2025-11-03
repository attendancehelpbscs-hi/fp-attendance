import Joi from 'joi';
import type { Course } from '@prisma/client';

export const createCourseSchema = Joi.object<Pick<Course, 'course_name' | 'course_code' | 'staff_id'>>({
  course_name: Joi.string().min(2).max(128).required(),
  course_code: Joi.string().min(2).max(128).pattern(/^[a-zA-Z0-9\s\-.,()\/]+$/).required(),
  staff_id: Joi.string().min(3).max(128).required(),
});

export const updateCourseSchema = Joi.object<Partial<Course>>({
  course_name: Joi.string().min(2).max(128),
  staff_id: Joi.string().min(3).max(128),
  course_code: Joi.string().min(2).max(128).pattern(/^[a-zA-Z0-9\s\-.,()\/]+$/),
});
