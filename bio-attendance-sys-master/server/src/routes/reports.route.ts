import { Router } from 'express';
import { getReports } from '../controllers/reports.controller';
import joiValidate from '../middlewares/joi.middleware';
import { paginateInputSchema } from '../joi/helper.joi';
import auth from '../middlewares/auth.middleware';

const router = Router();

// GET /api/reports/:staff_id - Get attendance reports
router.get('/:staff_id', auth as any, joiValidate(paginateInputSchema, 'query'), getReports);

export default router;
