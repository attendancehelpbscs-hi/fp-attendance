import { Router } from 'express';
import { loginStaff, logoutStaff, refreshStaffToken, forgotPassword, resetPassword, fingerprintLogin, loginTeacher, registerTeacher } from '../controllers/auth.controller';
import joiValidate from '../middlewares/joi.middleware';
import { loginStaffSchema, logoutStaffSchema, refreshStaffTokenSchema, forgotPasswordSchema, resetPasswordSchema, registerTeacherSchema } from '../joi/auth.joi';

const authRoute = Router();

/*
@route 			POST /api/auth/login (login staff)
@description 	authenticate staff.
@access 		Public
*/
authRoute.post('/auth/staff/login', joiValidate(loginStaffSchema), loginStaff);

/*
@route 			POST /api/teachers/login (login teacher)
@description 	authenticate teacher.
@access 		Public
*/
authRoute.post('/teachers/login', joiValidate(loginStaffSchema), loginTeacher);

/*
@route 			POST /api/auth/login (logout staff)
@description 	logout staff
@access 		Public
*/
authRoute.post('/auth/staff/logout', joiValidate(logoutStaffSchema), logoutStaff);

/*
@route 			POST /api/auth/refresh (refresh token)
@description 	refresh staff token
@access 		Public
*/
authRoute.post('/auth/staff/refresh', joiValidate(refreshStaffTokenSchema), refreshStaffToken);

/*
@route 			POST /api/auth/forgot-password (forgot password)
@description 	send password reset email
@access 		Public
*/
authRoute.post('/auth/staff/forgot-password', joiValidate(forgotPasswordSchema), forgotPassword);

/*
@route 			POST /api/auth/reset-password (reset password)
@description 	reset password using token
@access 		Public
*/
authRoute.post('/auth/staff/reset-password', joiValidate(resetPasswordSchema), resetPassword);

/*
@route 			POST /api/auth/fingerprint-login (fingerprint login)
@description 	login using fingerprint
@access 		Public
*/
authRoute.post('/auth/staff/fingerprint-login', fingerprintLogin);

/*
@route 			POST /api/teachers/register (register teacher)
@description 	register a new teacher account
@access 		Public
*/
authRoute.post('/teachers/register', joiValidate(registerTeacherSchema), registerTeacher);

export default authRoute;
