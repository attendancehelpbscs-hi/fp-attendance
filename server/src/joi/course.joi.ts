import Joi from 'joi';
import type { Course } from '@prisma/client';

export const createCourseSchema = Joi.object<Pick<Course, 'course_name' | 'course_code' | 'grade' | 'staff_id'> & { matric_no?: string }>({
  course_name: Joi.string().min(2).max(128).required(),
  course_code: Joi.string().min(2).max(128).pattern(/^[a-zA-Z0-9\s\-.,()\/]+$/).required(),
  grade: Joi.string().min(1).max(128).required(),
  staff_id: Joi.string().min(3).max(128).required(),
  matric_no: Joi.string().min(2).max(128).optional(),
});

export const updateCourseSchema = Joi.object<Partial<Course> & { matric_no?: string }>({
  course_name: Joi.string().min(2).max(128),
  staff_id: Joi.string().min(3).max(128),
  course_code: Joi.string().min(2).max(128).pattern(/^[a-zA-Z0-9\s\-.,()\/]+$/),
  grade: Joi.string().min(1).max(128),
  matric_no: Joi.string().min(2).max(128),
});
