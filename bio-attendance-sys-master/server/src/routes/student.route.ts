import { Router } from 'express';
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getSingleStudent,
  getStudentsFingerprints,
} from '../controllers/student.controller';
import { createStudentSchema, updateStudentSchema } from '../joi/student.joi';
import joiValidate from '../middlewares/joi.middleware';
import { paginateInputSchema } from '../joi/helper.joi';
import auth from '../middlewares/auth.middleware';

const studentRoute = Router();

/*
@route 			GET /api/students/staff/:id?page=$1 (get students by a staff)
@description 	get students
@access 		Private
*/
studentRoute.get('/students/staff/:staff_id', joiValidate(paginateInputSchema, 'query'), auth, getStudents);

/*
@route 			GET /api/student/:id/staff/:staff_id (get students by a staff)
@description 	get single student by a staff
@access 		Public
*/
studentRoute.get('/student/:id', getSingleStudent);

/*
@route 			POST /api/student (create student)
@description 	add new student
@access 		Private
*/
studentRoute.post('/student', joiValidate(createStudentSchema), auth, createStudent);

/*
@route 			PUT /api/student (update student)
@description update student
@access 		Private
*/
studentRoute.put('/student/:id', joiValidate(updateStudentSchema), auth, updateStudent);

/*
@route 			DELETE /api/student (delete student)
@description 	delete student
@access 		Private
*/
studentRoute.delete('/student/:id', auth, deleteStudent);

/*
@route 			GET /api/students/fingerprints/:staff_id (get students fingerprints for identification)
@description 	get students fingerprints
@access 		Public
*/
studentRoute.get('/students/fingerprints/:staff_id', getStudentsFingerprints);

export default studentRoute;
