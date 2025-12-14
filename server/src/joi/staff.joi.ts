import Joi from 'joi';

export const createStaffSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  name: Joi.string().required(), // Keep for backward compatibility
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  retype_password: Joi.string().valid(Joi.ref('password')).required(),
});

export const updateStaffProfileSchema = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  name: Joi.string().optional(), // Keep for backward compatibility
  password: Joi.string().min(6).optional(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).optional(),
  profilePicture: Joi.string().optional(), // Base64 string
});
