import Joi from 'joi';
import { validate as validateEmail } from 'deep-email-validator';

export const loginStaffSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .external(async (value) => {
      // Skip deep validation in development for testing
      if (process.env.NODE_ENV !== 'production') {
        return value;
      }

      // Perform deep email validation in production
      const result = await validateEmail(value);
      if (!result.valid) {
        throw new Error('Invalid email address or domain');
      }
      // Check for disposable email domains
      const disposableDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com'];
      const domain = value.split('@')[1];
      if (disposableDomains.includes(domain)) {
        throw new Error('Disposable email addresses are not allowed');
      }
      return value;
    }),
  password: Joi.string().min(4).max(15).required(),
});

export const logoutStaffSchema = Joi.object({
  staff_id: Joi.string().optional(),
});

export const refreshStaffTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
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
  role: Joi.string().valid('teacher').optional().messages({
    'any.only': 'Role must be teacher',
  }),
});
