import { Router } from 'express';
import { getReports, getStudentReports, exportMonthlySummaryExcel, exportMonthlySummaryPDF, exportStudentReportExcel, exportStudentReportPDF } from '../controllers/reports.controller';
// import auth from '../middlewares/auth.middleware';

const reportsRoute = Router();

/*
@route          GET /api/reports/:staff_id/monthly-summary/export/excel
@description    Export monthly attendance summary as Excel
@access         Private
*/
reportsRoute.get('/:staff_id/monthly-summary/export/excel', exportMonthlySummaryExcel);

/*
@route          GET /api/reports/:staff_id/monthly-summary/export/pdf
@description    Export monthly attendance summary as PDF
@access         Private
*/
reportsRoute.get('/:staff_id/monthly-summary/export/pdf', exportMonthlySummaryPDF);

/*
@route          GET /api/reports/:staff_id/students
@description    Get student-specific attendance reports
@access         Private
*/
reportsRoute.get('/:staff_id/students', getStudentReports);

/*
@route          GET /api/reports/:staff_id/students/:student_id/export/excel
@description    Export student attendance report as Excel
@access         Private
*/
reportsRoute.get('/:staff_id/students/:student_id/export/excel', exportStudentReportExcel);

/*
@route          GET /api/reports/:staff_id/students/:student_id/export/pdf
@description    Export student attendance report as PDF
@access         Private
*/
reportsRoute.get('/:staff_id/students/:student_id/export/pdf', exportStudentReportPDF);

/*
@route          GET /api/reports/:staff_id
@description    Get attendance reports
@access         Private
*/
reportsRoute.get('/:staff_id', getReports);

export default reportsRoute;