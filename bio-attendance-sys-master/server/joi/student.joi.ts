import Joi from 'joi';
import type { Student } from '@prisma/client';

export const createStudentSchema = Joi.object<Pick<Student, 'name' | 'matric_no' | 'grade' | 'fingerprint' | 'staff_id'> & { courses: string[] }>({
  name: Joi.string().min(2).max(128).required(),
  matric_no: Joi.string().min(3).max(128).required(),
  grade: Joi.string().min(1).max(6).optional(), // Made optional for teachers
  fingerprint: Joi.string().optional(),
  staff_id: Joi.string().required(),
  courses: Joi.array().items(Joi.string()).optional(),
});

export const updateStudentSchema = Joi.object<Partial<Pick<Student, 'name' | 'matric_no' | 'grade' | 'fingerprint'>> & { courses?: string[] }>({
  name: Joi.string().min(2).max(128).optional(),
  matric_no: Joi.string().min(3).max(128).optional(),
  grade: Joi.string().min(1).max(6).optional(),
  fingerprint: Joi.string().optional(),
  courses: Joi.array().items(Joi.string()).optional(),
});