import { Router } from 'express';
import {
  getAttendances,
  getAttendanceList,
  getSingleAttendance,
  addStudentToAttendance,
  manualMarkAttendance,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  markAbsentForUnmarkedDaysController
} from '../controllers/attendance.controller';

const attendanceRoute = Router();

/*
@route 			GET /api/attendances/staff/:staff_id
@description 	get attendances by staff
@access 		Private
*/
attendanceRoute.get('/attendances/staff/:staff_id', getAttendances);

/*
@route 			GET /api/attendance/:id/staff/:staff_id
@description 	get single attendance by a staff
@access 		Public
*/
attendanceRoute.get('/attendance/:id', getSingleAttendance);

/*
@route 			GET /api/attendance/:attendance_id/students
@description 	get attendance list
@access 		Public
*/
attendanceRoute.get('/attendance/:attendance_id/students', getAttendanceList);

/*
@route 			POST /api/attendance/student
@description 	add new attendance
@access 		Private
*/
attendanceRoute.post('/attendance/student', addStudentToAttendance);

/*
@route 			POST /api/attendance/manual
@description 	manually mark attendance for multiple students
@access 		Private
*/
attendanceRoute.post('/attendance/manual', manualMarkAttendance);

/*
@route 			POST /api/attendance
@description 	add new attendance
@access 		Private
*/
attendanceRoute.post('/attendance', createAttendance);

/*
@route 			PUT /api/attendance
@description update attendance
@access 		Private
*/
attendanceRoute.put('/attendance/:id', updateAttendance);

/*
@route 			DELETE /api/attendance
@description 	delete attendance
@access 		Private
*/
attendanceRoute.delete('/attendance/:id', deleteAttendance);

/*
@route 			POST /api/attendance/mark-absent-daily
@description 	mark absent for students who haven't scanned at all for the whole day
@access 		Private
*/
attendanceRoute.post('/attendance/mark-absent-daily', markAbsentForUnmarkedDaysController);

export default attendanceRoute;