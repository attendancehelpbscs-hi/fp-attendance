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
