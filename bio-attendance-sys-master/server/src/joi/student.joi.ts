import Joi from 'joi';
import type { Student } from '@prisma/client';

export const createStudentSchema = Joi.object<Pick<Student, 'name' | 'matric_no' | 'grade' | 'fingerprint' | 'staff_id'> & { courses: string[] }>({
  name: Joi.string().min(2).max(128).required(),
  matric_no: Joi.string().min(3).max(128).required(),
  grade: Joi.string().min(1).max(128).required(),
  fingerprint: Joi.string().min(2).required(),
  staff_id: Joi.string().min(3).max(128).required(),
  courses: Joi.array().items(Joi.string().min(3).max(128)).required(),
});

export const updateStudentSchema = Joi.object<Partial<Student> & { courses: string[] }>({
  staff_id: Joi.string().min(3).max(128),
  name: Joi.string().min(2).max(128),
  matric_no: Joi.string().min(3).max(128),
  grade: Joi.string().min(1).max(128),
  fingerprint: Joi.string().min(2).required(),
  courses: Joi.array().items(Joi.string().min(3).max(128)).required(),
}).unknown(true);
