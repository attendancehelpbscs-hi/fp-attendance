import { Router } from 'express';
import { getReports, getGradesAndSections, getStudentReports } from '../controllers/reports.controller';
import joiValidate from '../middlewares/joi.middleware';
import { getReportsSchema, getStudentReportsSchema } from '../joi/reports.joi';
import auth from '../middlewares/auth.middleware';

const router = Router();

// GET /api/reports/:staff_id - Get attendance reports
router.get('/:staff_id', auth as any, joiValidate(getReportsSchema, 'query'), getReports);
// GET /api/reports/:staff_id/filters - Get unique grades and sections
router.get('/:staff_id/filters', auth as any, getGradesAndSections);
// GET /api/reports/:staff_id/students - Get student-specific attendance reports
router.get('/:staff_id/students', auth as any, joiValidate(getStudentReportsSchema, 'query'), getStudentReports);

export default router;
