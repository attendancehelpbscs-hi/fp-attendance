import { Router } from 'express';
import { registerTeacher, createTeacher, getAllTeachers, getTeacher, updateTeacher, deleteTeacher } from '../controllers/teacher.controller';
import auth from '../middlewares/auth.middleware';

const teacherRoute = Router();

/*
@route 			POST /api/teachers/register
@description 	Register a new teacher account (self-service)
@access 		Public
*/
teacherRoute.post('/teachers/register', registerTeacher);

/*
@route 			POST /api/teachers
@description 	Create a new teacher account (admin only)
@access 		Private (Admin)
*/
teacherRoute.post('/teachers', auth, createTeacher);

/*
@route 			GET /api/teachers
@description 	Get all teachers (admin only)
@access 		Private (Admin)
*/
teacherRoute.get('/teachers', auth, getAllTeachers);

/*
@route 			GET /api/teachers/:id
@description 	Get a single teacher (admin only)
@access 		Private (Admin)
*/
teacherRoute.get('/teachers/:id', auth, getTeacher);

/*
@route 			PUT /api/teachers/:id
@description 	Update a teacher (admin only)
@access 		Private (Admin)
*/
teacherRoute.put('/teachers/:id', auth, updateTeacher);

/*
@route 			DELETE /api/teachers/:id
@description 	Delete a teacher (admin only)
@access 		Private (Admin)
*/
teacherRoute.delete('/teachers/:id', auth, deleteTeacher);

export default teacherRoute;