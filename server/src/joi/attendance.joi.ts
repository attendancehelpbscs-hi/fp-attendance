import Joi from 'joi';
import type { Attendance, StudentAttendance } from '@prisma/client';

export const addStudentToAttendanceSchema = Joi.object<StudentAttendance>({
  attendance_id: Joi.string().min(3).max(128).required(),
  student_id: Joi.string().min(3).max(128).required(),
  time_type: Joi.string().valid('IN', 'OUT').required(),
  section: Joi.string().min(1).max(50).pattern(/^[a-zA-Z0-9\s\-.,]+$/),
  status: Joi.string().valid('present', 'absent'),
  session_type: Joi.string().valid('AM', 'PM'),
});

export const createAttendanceSchema = Joi.object<Pick<Attendance, 'name' | 'date' | 'staff_id'>>({
  name: Joi.string().min(3).max(128).required(),
  date: Joi.string().min(3).max(128).required(),
  staff_id: Joi.string().min(3).max(128).required(),
});

export const updateAttendanceSchema = Joi.object<Partial<Attendance>>({
  id: Joi.string().min(3).max(128).required(),
  staff_id: Joi.string().min(3).max(128),
  name: Joi.string().min(3).max(128),
  date: Joi.string().min(3).max(128),
});
