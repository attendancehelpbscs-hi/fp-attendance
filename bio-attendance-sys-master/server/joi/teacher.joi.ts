import Joi from 'joi';

// Schema for creating a new teacher
export const createTeacherSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'First name is required',
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name must not exceed 50 characters',
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Last name is required',
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name must not exceed 50 characters',
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
  password: Joi.string().min(6).max(20).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password must not exceed 20 characters',
  }),
  role: Joi.string().valid('TEACHER', 'ADMIN').optional().messages({
    'any.only': 'Role must be either TEACHER or ADMIN',
  }),
  section: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Section must be at least 2 characters long',
    'string.max': 'Section must not exceed 50 characters',
  }),
  grade: Joi.string().valid('1', '2', '3', '4', '5', '6').optional().messages({
    'any.only': 'Grade must be between 1 and 6',
  }),
  matric_no: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Teacher ID must be at least 2 characters long',
    'string.max': 'Teacher ID must not exceed 50 characters',
  }),
});

// Schema for teacher self-registration
export const registerTeacherSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'First name is required',
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name must not exceed 50 characters',
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Last name is required',
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name must not exceed 50 characters',
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
  password: Joi.string().min(8).max(20).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 20 characters',
  }),
  section: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Section is required',
    'string.min': 'Section must be at least 2 characters long',
    'string.max': 'Section must not exceed 50 characters',
  }),
  employeeId: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Employee ID is required',
    'string.min': 'Employee ID must be at least 2 characters long',
    'string.max': 'Employee ID must not exceed 50 characters',
  }),
  grade: Joi.string().valid('1', '2', '3', '4', '5', '6').required().messages({
    'any.only': 'Grade must be between 1 and 6',
    'any.required': 'Grade is required',
  }),
});

// Schema for updating a teacher
export const updateTeacherSchema = Joi.object({
  id: Joi.string().required().messages({
    'string.empty': 'Teacher ID is required',
  }),
  firstName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name must not exceed 50 characters',
  }),
  lastName: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name must not exceed 50 characters',
  }),
  email: Joi.string().email().optional().messages({
    'string.email': 'Email must be a valid email address',
  }),
  password: Joi.string().min(6).max(20).optional().messages({
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password must not exceed 20 characters',
  }),
  role: Joi.string().valid('TEACHER', 'ADMIN').optional().messages({
    'any.only': 'Role must be either TEACHER or ADMIN',
  }),
  section: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Section must be at least 2 characters long',
    'string.max': 'Section must not exceed 50 characters',
  }),
  grade: Joi.string().valid('1', '2', '3', '4', '5', '6').optional().messages({
    'any.only': 'Grade must be between 1 and 6',
  }),
  matric_no: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Teacher ID must be at least 2 characters long',
    'string.max': 'Teacher ID must not exceed 50 characters',
  }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});