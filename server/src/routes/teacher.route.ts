import { Router } from 'express';
import auth from '../middlewares/auth.middleware'; // ✅ Default import, not named
import {
  addTeacher,
  getTeachers,
  getTeacher,        // ✅ Changed from getTeacherById
  editTeacher,       // ✅ Changed from updateTeacherById
  removeTeacher,      // ✅ Changed from deleteTeacherById
  getPendingTeachers,
  approveOrRejectTeacher
} from '../controllers/teacher.controller';

const teacherRoute = Router();

// Apply authentication to ALL teacher routes
teacherRoute.use(auth); // ✅ Use 'auth' not 'authenticateToken'

/*
@route 			POST /api/teachers (create teacher)
@description 	add new teacher
@access 		Private (Admin only)
*/
teacherRoute.post('/', addTeacher);

/*
@route 			GET /api/teachers?page=1&per_page=10 (get teachers)
@description 	get teachers with pagination
@access 		Private (Admin only)
*/
teacherRoute.get('/', getTeachers);

/*
@route 			GET /api/teachers/pending/list (get pending teachers)
@description 	get all teachers awaiting approval
@access 		Private (Admin only)
*/
teacherRoute.get('/pending/list', getPendingTeachers);

/*
@route 			GET /api/teachers/:id (get teacher by id)
@description 	get single teacher by id
@access 		Private (Admin only)
*/
teacherRoute.get('/:id', getTeacher);

/*
@route 			POST /api/teachers/:id/approve (approve or reject teacher)
@description 	approve or reject a teacher registration
@access 		Private (Admin only)
*/
teacherRoute.post('/:id/approve', approveOrRejectTeacher);

/*
@route 			PUT /api/teachers/:id (update teacher)
@description 	update teacher by id
@access 		Private (Admin only)
*/
teacherRoute.put('/:id', editTeacher);

/*
@route 			DELETE /api/teachers/:id (delete teacher)
@description 	delete teacher by id
@access 		Private (Admin only)
*/
teacherRoute.delete('/:id', removeTeacher);

export default teacherRoute;