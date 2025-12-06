import { Router, Request, Response } from 'express';
import { getReports, getGradesAndSections, getStudentReports, getSectionsForGradeController, getStudentsForGradeAndSectionController, getStudentDetailedReportController, getDashboardStatsController, getCheckInTimeAnalysisController, getStudentsByStatusController, markStudentAttendanceController, exportSF2ExcelController, exportSF2PDFController, getSF2ReportController, getMonthlyAttendanceSummaryController, getCheckInTimeDistributionController } from '../controllers/reports.controller';
import joiValidate from '../middlewares/joi.middleware';
import { getReportsSchema, getStudentReportsSchema, getDashboardStatsSchema, getSF2ReportSchema, getMonthlyAttendanceSummarySchema } from '../joi/reports.joi';
import Joi from 'joi';
import auth from '../middlewares/auth.middleware';

const router = Router();

// GET /api/reports/:staff_id - Get attendance reports
router.get('/:staff_id', auth as any, joiValidate(getReportsSchema, 'query'), getReports);
// GET /api/reports/:staff_id/sf2 - Get SF2 data
router.get('/:staff_id/sf2', auth as any, joiValidate(getSF2ReportSchema, 'query'), getSF2ReportController);
// GET /api/reports/:staff_id/filters - Get unique grades and sections
router.get('/:staff_id/filters', auth as any, getGradesAndSections);
// GET /api/reports/:staff_id/students - Get student-specific attendance reports
router.get('/:staff_id/students', auth as any, joiValidate(getStudentReportsSchema, 'query'), getStudentReports);

// New routes for hierarchical student reports
// GET /api/reports/:staff_id/grades/:grade/sections - Get sections for a specific grade
router.get('/:staff_id/grades/:grade/sections', auth as any, getSectionsForGradeController);
// GET /api/reports/:staff_id/grades/:grade/sections/:section/students - Get students for a specific grade and section
router.get('/:staff_id/grades/:grade/sections/:section/students', auth as any, getStudentsForGradeAndSectionController);
// GET /api/reports/:staff_id/students/status - Get students by status for a specific grade and section
router.get('/:staff_id/students/status', auth as any,
  joiValidate(
    Joi.object({
      date: Joi.string().required(),
      grade: Joi.string().required(),
      section: Joi.string().required(),
      status: Joi.string().valid('present', 'absent', 'late').required(),
      session: Joi.string().optional()
    }),
    'query'
  ),
  getStudentsByStatusController);
// GET /api/reports/:staff_id/students/:student_id/details - Get detailed report for a specific student
router.get('/:staff_id/students/:student_id/details', auth as any, getStudentDetailedReportController);
// POST /api/reports/:staff_id/students/:student_id/mark-attendance - Mark student attendance manually
router.post('/:staff_id/students/:student_id/mark-attendance', auth as any, markStudentAttendanceController);

// GET /api/reports/:staff_id/dashboard - Get dashboard stats
router.get('/:staff_id/dashboard', auth as any, joiValidate(getDashboardStatsSchema, 'query'), getDashboardStatsController);
// GET /api/reports/:staff_id/check-in-analysis - Get check-in time analysis
router.get('/:staff_id/check-in-analysis', auth as any, getCheckInTimeAnalysisController);
// GET /api/reports/:staff_id/check-in-distribution - Get check-in time distribution
router.get('/:staff_id/check-in-distribution', auth as any, getCheckInTimeDistributionController);
// GET /api/reports/:staff_id/monthly-summary - Get monthly attendance summary
router.get('/:staff_id/monthly-summary', auth as any, joiValidate(getMonthlyAttendanceSummarySchema, 'query'), getMonthlyAttendanceSummaryController);

// Test endpoint
router.get('/test', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

// SF2 Export Routes
// GET /api/reports/:staff_id/sf2/export/excel - Export SF2 as Excel
router.get('/:staff_id/sf2/export/excel', auth as any, exportSF2ExcelController);
// GET /api/reports/:staff_id/sf2/export/pdf - Export SF2 as PDF
router.get('/:staff_id/sf2/export/pdf', auth as any, exportSF2PDFController);

export default router;
