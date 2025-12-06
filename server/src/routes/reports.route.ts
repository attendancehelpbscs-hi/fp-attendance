import { Router } from 'express';
import { getReports, getStudentReports } from '../controllers/reports.controller';
// import auth from '../middlewares/auth.middleware';

const reportsRoute = Router();

/*
@route          GET /api/reports/:staff_id
@description    Get attendance reports
@access         Private
*/
reportsRoute.get('/:staff_id', getReports);

/*
@route          GET /api/reports/:staff_id/students
@description    Get student-specific attendance reports
@access         Private
*/
reportsRoute.get('/:staff_id/students', getStudentReports);

export default reportsRoute;