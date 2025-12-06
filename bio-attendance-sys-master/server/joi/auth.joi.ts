import Joi from 'joi';

// Schema for staff login
export const loginStaffSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
  password: Joi.string().min(4).max(15).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 4 characters long',
    'string.max': 'Password must not exceed 15 characters',
  }),
});

// Schema for teacher login
export const loginTeacherSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
  password: Joi.string().min(4).max(15).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 4 characters long',
    'string.max': 'Password must not exceed 15 characters',
  }),
});

// Schema for staff logout
export const logoutStaffSchema = Joi.object({
  staff_id: Joi.string().required().messages({
    'string.empty': 'Staff ID is required',
  }),
});

// Schema for refreshing staff token
export const refreshStaffTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'string.empty': 'Refresh token is required',
  }),
});

// Schema for forgot password
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address',
  }),
});

// Schema for reset password
export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'string.empty': 'Reset token is required',
  }),
  newPassword: Joi.string().min(4).max(15).required().messages({
    'string.empty': 'New password is required',
    'string.min': 'Password must be at least 4 characters long',
    'string.max': 'Password must not exceed 15 characters',
  }),
});

// Schema for teacher registration
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
  password: Joi.string().min(6).max(20).required().messages({
    'string.empty': 'Password is required',
    'string.min': 'Password must be at least 6 characters long',
    'string.max': 'Password must not exceed 20 characters',
  }),
  section: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Section must be at least 2 characters long',
    'string.max': 'Section must not exceed 50 characters',
  }),
  employeeId: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Employee ID must be at least 2 characters long',
    'string.max': 'Employee ID must not exceed 50 characters',
  }),
  grade: Joi.string().valid('1', '2', '3', '4', '5', '6').required().messages({
    'string.empty': 'Grade is required',
    'any.only': 'Grade must be between 1 and 6',
  }),
  role: Joi.string().valid('teacher').optional().messages({
    'any.only': 'Role must be teacher',
  }),
}).unknown(true);