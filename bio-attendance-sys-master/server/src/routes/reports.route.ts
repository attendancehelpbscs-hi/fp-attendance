import { Router } from 'express';
import { getReports, getGradesAndSections, getStudentReports, getSectionsForGradeController, getStudentsForGradeAndSectionController, getStudentDetailedReportController, getDashboardStatsController, markStudentAttendanceController } from '../controllers/reports.controller';
import joiValidate from '../middlewares/joi.middleware';
import { getReportsSchema, getStudentReportsSchema, getDashboardStatsSchema } from '../joi/reports.joi';
import auth from '../middlewares/auth.middleware';

const router = Router();

// GET /api/reports/:staff_id - Get attendance reports
router.get('/:staff_id', auth as any, joiValidate(getReportsSchema, 'query'), getReports);
// GET /api/reports/:staff_id/filters - Get unique grades and sections
router.get('/:staff_id/filters', auth as any, getGradesAndSections);
// GET /api/reports/:staff_id/students - Get student-specific attendance reports
router.get('/:staff_id/students', auth as any, joiValidate(getStudentReportsSchema, 'query'), getStudentReports);

// New routes for hierarchical student reports
// GET /api/reports/:staff_id/grades/:grade/sections - Get sections for a specific grade
router.get('/:staff_id/grades/:grade/sections', auth as any, getSectionsForGradeController);
// GET /api/reports/:staff_id/grades/:grade/sections/:section/students - Get students for a specific grade and section
router.get('/:staff_id/grades/:grade/sections/:section/students', auth as any, getStudentsForGradeAndSectionController);
// GET /api/reports/:staff_id/students/:student_id/details - Get detailed report for a specific student
router.get('/:staff_id/students/:student_id/details', auth as any, getStudentDetailedReportController);
// POST /api/reports/:staff_id/students/:student_id/mark-attendance - Mark student attendance manually
router.post('/:staff_id/students/:student_id/mark-attendance', auth as any, markStudentAttendanceController);

// GET /api/reports/:staff_id/dashboard - Get dashboard stats
router.get('/:staff_id/dashboard', auth as any, joiValidate(getDashboardStatsSchema, 'query'), getDashboardStatsController);

export default router;
